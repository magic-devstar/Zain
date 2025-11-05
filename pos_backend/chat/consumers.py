import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from custom_user.models import Account
from .models import ChatMessage
from .serializers import ChatMessageSerializer, ChatUserSerializer
import base64
from django.core.files.base import ContentFile
from django.utils import timezone
import logging
import redis
from django.conf import settings
from django.db.models import Q, Subquery, OuterRef
from datetime import datetime
from django.urls import reverse

logger = logging.getLogger(__name__)

def serialize_datetime(obj):
    """Helper function to serialize datetime objects to ISO format strings."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def get_full_url(request, path):
    if not path:
        return None
    if path.startswith(('http://', 'https://')):
        return path
    return request.build_absolute_uri(path)

def serialize_message_for_ws(message_data, request=None):
    """Helper function to serialize message data for WebSocket transmission."""
    if isinstance(message_data, dict):
        data = {k: serialize_datetime(v) for k, v in message_data.items()}
        
        # Add full URL for profile images
        if request and 'sender' in data and data['sender'].get('profile_image'):
            data['sender']['profile_image'] = get_full_url(request, data['sender']['profile_image'])
        if request and 'recipient' in data and data['recipient'].get('profile_image'):
            data['recipient']['profile_image'] = get_full_url(request, data['recipient']['profile_image'])
            
        return data
    return message_data

class GlobalChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            logger.warning(f"GlobalChatConsumer: Unauthenticated connection attempt")
            await self.close()
            return

        # Join user's personal notification group
        self.notification_group = f'notifications_{self.user.id}'
        await self.channel_layer.group_add(
            self.notification_group,
            self.channel_name
        )
        await self.accept()
        logger.info(f"GlobalChatConsumer: User {self.user.username} connected to notifications")

    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group'):
            await self.channel_layer.group_discard(
                self.notification_group,
                self.channel_name
            )
            logger.info(f"GlobalChatConsumer: User {self.user.username} disconnected from notifications")

    async def notify_message(self, event):
        # Forward the notification to the WebSocket
        message_data = event['message']
        logger.info(f"GlobalChatConsumer: Sending notification to user {self.user.username}")
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': message_data
        }))
        logger.info(f"GlobalChatConsumer: Notification sent to user {self.user.username}")

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope['user']
        self.global_group_name = 'chat_global'  # New global group for all users

        logger.info(f"WebSocket connect: user={self.user}, authenticated={self.user.is_authenticated}")

        if self.user.is_authenticated and self.user.role not in ["External User", "Deactivated"]:
            logger.info(f"WebSocket connect: User {self.user.username} with role {self.user.role} accepted.")
            # Join the specific chat room
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            # Join the global group
            await self.channel_layer.group_add(
                self.global_group_name,
                self.channel_name
            )
            await self.accept()
        else:
            logger.warning(f"WebSocket connect: User {self.user} rejected. Authenticated: {self.user.is_authenticated}, Role: {getattr(self.user, 'role', 'N/A')}")
            await self.close()

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnect: close_code={close_code}")
        # Leave both groups
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        await self.channel_layer.group_discard(
            self.global_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('message_type')
            recipient_id = data.get('recipient_id')
            
            recipient = await self.get_recipient(recipient_id)
            if not recipient:
                logger.warning(f"WebSocket receive: Recipient with id {recipient_id} not found.")
                return

            # Handle message creation
            if message_type == 'text':
                message_content = data.get('message')
                chat_message = await self.save_text_message(recipient, message_content)
            elif message_type == 'voice':
                voice_message_data = data.get('voice_message')
                chat_message = await self.save_voice_message(recipient, voice_message_data)
            else:
                logger.warning(f"WebSocket receive: Unknown message type '{message_type}'")
                return

            # Serialize message and user data
            message_data = await self.serialize_message(chat_message)
            message_data = serialize_message_for_ws(message_data, self.scope.get('request'))
            
            sender_data = await self.get_updated_user_data(self.user.id)
            recipient_data = await self.get_updated_user_data(recipient.id)
            
            sender_data = serialize_message_for_ws(sender_data, self.scope.get('request'))
            recipient_data = serialize_message_for_ws(recipient_data, self.scope.get('request'))

            logger.info(f"Processing message from {self.user.username} to {recipient.username}")

            # Send to chat room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )
            logger.info(f"Sent message to chat room {self.room_group_name}")

            # Always send notification to recipient
            recipient_notification_group = f'notifications_{recipient.id}'
            logger.info(f"Sending notification to group {recipient_notification_group}")
            await self.channel_layer.group_send(
                recipient_notification_group,
                {
                    'type': 'notify_message',
                    'message': {
                        **message_data,
                        'sender_data': sender_data,
                        'recipient_data': recipient_data
                    }
                }
            )
            logger.info(f"Sent notification to recipient's notification group")

            # Update user list
            await self.channel_layer.group_send(
                self.global_group_name,
                {
                    'type': 'user_list_update',
                    'updated_users': [sender_data, recipient_data]
                }
            )

        except Exception as e:
            logger.error(f"WebSocket receive: Error processing message. {e}", exc_info=True)

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))

    async def user_list_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_list_update',
            'updated_users': event['updated_users']
        }))

    @database_sync_to_async
    def get_updated_user_data(self, user_id):
        try:
            user = Account.objects.get(id=user_id)
            # Get last message for the user
            last_message = ChatMessage.objects.filter(
                Q(sender=user) | Q(recipient=user)
            ).order_by('-timestamp').first()
            
            # Create a temporary object with last_message_id for serialization
            user.last_message_id = last_message.id if last_message else None
            
            # Serialize user data
            serializer = ChatUserSerializer(user)
            return serializer.data
        except Account.DoesNotExist:
            return None

    @database_sync_to_async
    def get_recipient(self, recipient_id):
        try:
            return Account.objects.get(id=recipient_id)
        except Account.DoesNotExist:
            return None

    @database_sync_to_async
    def save_text_message(self, recipient, message_content):
        return ChatMessage.objects.create(
            sender=self.user,
            recipient=recipient,
            message=message_content,
            message_type='text'
        )
    
    @database_sync_to_async
    def save_voice_message(self, recipient, voice_message_data):
        try:
            format, imgstr = voice_message_data.split(';base64,')
            ext = format.split('/')[-1]
            data = ContentFile(base64.b64decode(imgstr), name=f'{self.user.id}_{timezone.now().timestamp()}.{ext}')
            
            return ChatMessage.objects.create(
                sender=self.user,
                recipient=recipient,
                voice_message=data,
                message_type='voice'
            )
        except Exception as e:
            logger.error(f"Error saving voice message: {e}")
            return None

    @database_sync_to_async
    def serialize_message(self, message):
        return ChatMessageSerializer(message).data


class PresenceConsumer(AsyncWebsocketConsumer):
    def get_redis_instance(self):
        try:
            # Check if Redis configuration exists (not available for InMemoryChannelLayer)
            config = settings.CHANNEL_LAYERS['default'].get('CONFIG', {})
            hosts = config.get('hosts', [])
            if not hosts:
                return None
            redis_host = hosts[0][0]
            redis_port = hosts[0][1]
            return redis.StrictRedis(host=redis_host, port=redis_port, db=0, decode_responses=True, socket_connect_timeout=2)
        except (KeyError, IndexError, TypeError):
            # Redis not configured, using in-memory channel layer
            return None

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        redis_instance = self.get_redis_instance()
        
        # If Redis is not available, skip Redis-specific operations
        if redis_instance is None:
            # Still allow connection but without Redis features
            await self.channel_layer.group_add("presence", self.channel_name)
            await self.accept()
            user_data = await self.get_updated_user_data(self.user.id)
            user_data = serialize_message_for_ws(user_data)
            user_data['status'] = 'online'
            await self.send(text_data=json.dumps({
                'type': 'presence_initial',
                'user_ids': [],
                'current_user': user_data
            }))
            return
        
        # Get list of users who are already online
        online_user_ids = []
        try:
            for key in redis_instance.scan_iter("user_*_connections"):
                user_id = key.split('_')[1]
                if redis_instance.get(key) and int(redis_instance.get(key)) > 0:
                    online_user_ids.append(int(user_id))
            
            # Increment connection count for the current user
            connection_count = redis_instance.incr(f"user_{self.user.id}_connections")
            redis_instance.expire(f"user_{self.user.id}_connections", 3600)  # Set expiry to 1 hour
        except (redis.ConnectionError, redis.TimeoutError, OSError) as e:
            logger.warning(f"Redis connection error in PresenceConsumer: {e}")
            online_user_ids = []

        await self.channel_layer.group_add("presence", self.channel_name)
        await self.accept()

        # Get updated user data for the current user
        user_data = await self.get_updated_user_data(self.user.id)
        user_data = serialize_message_for_ws(user_data)
        user_data['status'] = 'online'  # Explicitly set status

        # Send the list of currently online users to the new connection
        await self.send(text_data=json.dumps({
            'type': 'presence_initial',
            'user_ids': online_user_ids,
            'current_user': user_data
        }))
        
        # Broadcast their online status to everyone
        await self.channel_layer.group_send(
            "presence",
            {
                "type": "presence_broadcast",
                "event": "online",
                "user_id": self.user.id,
                "user_data": user_data
            }
        )

    async def disconnect(self, close_code):
        logger.info(f"Presence disconnect triggered for channel {self.channel_name} with code {close_code}")
        if hasattr(self, 'user') and self.user.is_authenticated:
            logger.info(f"User is {self.user.username} (authenticated). Proceeding with disconnect logic.")
            redis_instance = self.get_redis_instance()
            
            if redis_instance is None:
                # Redis not available, skip Redis operations
                await self.channel_layer.group_discard("presence", self.channel_name)
                return
            
            try:
                # Delete the connection count immediately
                redis_instance.delete(f"user_{self.user.id}_connections")
                logger.info(f"Connection count deleted for {self.user.username}")
                
                # Get updated user data before going offline
                user_data = await self.get_updated_user_data(self.user.id)
                user_data = serialize_message_for_ws(user_data)
                user_data['status'] = 'offline'  # Explicitly set status
                
                # Broadcast offline status immediately
                await self.channel_layer.group_send(
                    "presence",
                    {
                        "type": "presence_broadcast",
                        "event": "offline",
                        "user_id": self.user.id,
                        "user_data": user_data
                    }
                )
                logger.info(f"Offline broadcast sent for {self.user.username}.")
            except Exception as e:
                logger.error(f"Error in disconnect handler: {e}", exc_info=True)
        else:
            user_info = f"user object exists: {hasattr(self, 'user')}"
            if hasattr(self, 'user'):
                user_info += f", user authenticated: {self.user.is_authenticated}"
            logger.warning(f"Disconnect condition not met for this channel. {user_info}")
        
        await self.channel_layer.group_discard("presence", self.channel_name)
        logger.info(f"Channel {self.channel_name} discarded from presence group.")

    async def presence_broadcast(self, event):
        # Send the online/offline event to the client with user data
        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'event': event['event'],
            'user_id': event['user_id'],
            'user_data': event.get('user_data')
        }))

    @database_sync_to_async
    def get_updated_user_data(self, user_id):
        try:
            user = Account.objects.get(id=user_id)
            # Get last message for the user
            last_message = ChatMessage.objects.filter(
                Q(sender=user) | Q(recipient=user)
            ).order_by('-timestamp').first()
            
            # Create a temporary object with last_message_id for serialization
            user.last_message_id = last_message.id if last_message else None
            
            # Serialize user data
            serializer = ChatUserSerializer(user)
            return serializer.data
        except Account.DoesNotExist:
            return None 