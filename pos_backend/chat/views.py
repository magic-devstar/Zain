from rest_framework import generics
from rest_framework.response import Response
from custom_user.models import Account
from .models import ChatMessage, ConversationArchive
from .serializers import ChatMessageSerializer, ChatUserSerializer
from django.db.models import Q, Subquery, OuterRef
from rest_framework.permissions import IsAuthenticated
from custom_user.serializers import AccountSerializer
from django.conf import settings
from openai import OpenAI
from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone


class UserListView(generics.ListAPIView):
    """
    Returns all users (for starting new conversations)
    """
    serializer_class = ChatUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        current_user = self.request.user
        excluded_roles = ["External User", "Deactivated"]

        # Subquery to get the ID of the last message for each conversation
        last_message_id_subquery = ChatMessage.objects.filter(
            Q(sender=current_user, recipient=OuterRef('pk')) |
            Q(sender=OuterRef('pk'), recipient=current_user)
        ).order_by('-timestamp').values('pk')[:1]

        # Base queryset excluding current user and deactivated/external users
        queryset = Account.objects.exclude(
            id=current_user.id
        ).exclude(
            role__in=excluded_roles
        )

        # Annotate with last message and order by it
        return queryset.annotate(
            last_message_id=Subquery(last_message_id_subquery)
        ).order_by('-last_message_id')
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all", "false").lower() == "true":
            return None
        return super().paginate_queryset(queryset)


class ChattedUsersView(generics.ListAPIView):
    """
    Returns only users that the current user has exchanged messages with (excluding archived)
    """
    serializer_class = ChatUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        current_user = self.request.user
        excluded_roles = ["External User", "Deactivated"]

        # Subquery to get the ID of the last message for each conversation
        last_message_id_subquery = ChatMessage.objects.filter(
            Q(sender=current_user, recipient=OuterRef('pk')) |
            Q(sender=OuterRef('pk'), recipient=current_user)
        ).order_by('-timestamp').values('pk')[:1]

        # Get users who have message history with current user
        users_with_messages = ChatMessage.objects.filter(
            Q(sender=current_user) | Q(recipient=current_user)
        ).values_list('sender', 'recipient').distinct()
        
        # Flatten and remove current user's ID
        user_ids = set()
        for sender, recipient in users_with_messages:
            user_ids.add(sender)
            user_ids.add(recipient)
        user_ids.discard(current_user.id)

        # Get archived user IDs to exclude them
        archived_user_ids = ConversationArchive.objects.filter(
            user=current_user,
            is_archived=True
        ).values_list('other_user', flat=True)

        # Base queryset excluding current user, deactivated/external users, and archived users
        queryset = Account.objects.filter(
            id__in=user_ids
        ).exclude(
            role__in=excluded_roles
        ).exclude(
            id__in=archived_user_ids
        )

        # Annotate with last message and order by it
        return queryset.annotate(
            last_message_id=Subquery(last_message_id_subquery)
        ).order_by('-last_message_id')
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all", "false").lower() == "true":
            return None
        return super().paginate_queryset(queryset)

class MessageHistoryView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return ChatMessage.objects.filter(
            (Q(sender=self.request.user) & Q(recipient__id=user_id)) |
            (Q(sender__id=user_id) & Q(recipient=self.request.user))
        ).order_by('timestamp') 
        
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all", "false").lower() == "true":
            return None
        return super().paginate_queryset(queryset)


# --------------------
# OpenAI Chatbot View
# --------------------
# A simple endpoint that proxies user messages to the OpenAI ChatCompletion API
# and returns the assistant response. Adjust the system prompt or model as needed.


# --- Updated for openai>=1.0.0 ---
class ChatBotView(APIView):
    """Return an assistant response from OpenAI for a given user message."""

    # You may want authentication; keeping it the same as other chat views.
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_message = request.data.get("message", "").strip()

        if not user_message:
            return Response({"detail": "'message' field is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure the API key is configured
        api_key = getattr(settings, "OPENAI_API_KEY", None)
        if not api_key:
            return Response({"detail": "OpenAI API key not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            client = OpenAI(api_key=api_key)

            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": """
                    You are a professional technical support assistant for a technology services company. Your job is to assist users only with technical support issues, such as:

                    - Computer hardware problems (e.g. device not working, overheating, noise)
                    - Operating system issues (Windows, macOS, Linux)
                    - Software installation, crashes, errors, or updates
                    - Network and connectivity issues (Wi-Fi, routers, internet problems)
                    - Security concerns (viruses, malware, firewalls)
                    - Peripheral device setup (printers, external devices, mobile integration)
                    - System configuration and troubleshooting

                    🔒 You are NOT a coding assistant.
                    - If a user requests help with programming tasks (e.g., “build a website,” “create a Python script,” “write an API”), politely decline.
                    - You may provide small code snippets or command-line solutions only if they directly support resolving a technical issue (e.g., clearing a cache, restarting a service).

                    🎯 Guidelines:
                    - Be clear, concise, and technically accurate.
                    - Guide users with step-by-step troubleshooting instructions.
                    - Ask relevant follow-up questions if the issue is unclear.
                    - Avoid giving responses unrelated to tech support.
                    """},  # <--- COMMA was missing here
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=256,
            )


            assistant_reply = completion.choices[0].message.content.strip()

            return Response({"response": assistant_reply})

        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ======================
# Message & Conversation Management Views
# ======================

class DeleteMessageView(APIView):
    """Delete a specific message permanently"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, message_id):
        try:
            message = get_object_or_404(ChatMessage, id=message_id)
            
            # Check if user is sender or recipient
            if message.sender != request.user and message.recipient != request.user:
                return Response(
                    {"detail": "You don't have permission to delete this message."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            message.delete()
            return Response({"detail": "Message deleted successfully."}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"detail": f"Error deleting message: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeleteConversationView(APIView):
    """Delete entire conversation between two users"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        try:
            other_user = get_object_or_404(Account, id=user_id)
            current_user = request.user
            
            # Delete all messages between the two users
            messages = ChatMessage.objects.filter(
                Q(sender=current_user, recipient=other_user) |
                Q(sender=other_user, recipient=current_user)
            )
            
            deleted_count = messages.count()
            messages.delete()
            
            # Also remove any archive records
            ConversationArchive.objects.filter(
                Q(user=current_user, other_user=other_user) |
                Q(user=other_user, other_user=current_user)
            ).delete()
            
            return Response({
                "detail": f"Conversation deleted successfully. {deleted_count} messages removed."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"detail": f"Error deleting conversation: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ArchiveConversationView(APIView):
    """Archive or unarchive a conversation"""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        try:
            other_user = get_object_or_404(Account, id=user_id)
            current_user = request.user
            action = request.data.get('action', 'archive')  # 'archive' or 'unarchive'
            
            if action == 'archive':
                archive, created = ConversationArchive.objects.get_or_create(
                    user=current_user,
                    other_user=other_user,
                    defaults={'is_archived': True}
                )
                if not created:
                    archive.is_archived = True
                    archive.archived_at = timezone.now()
                    archive.save()
                
                return Response({"detail": "Conversation archived successfully."}, status=status.HTTP_200_OK)
            
            elif action == 'unarchive':
                try:
                    archive = ConversationArchive.objects.get(
                        user=current_user,
                        other_user=other_user
                    )
                    archive.delete()
                    return Response({"detail": "Conversation unarchived successfully."}, status=status.HTTP_200_OK)
                except ConversationArchive.DoesNotExist:
                    return Response({"detail": "Conversation is not archived."}, status=status.HTTP_400_BAD_REQUEST)
            
            else:
                return Response({"detail": "Invalid action. Use 'archive' or 'unarchive'."}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {"detail": f"Error managing conversation archive: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ArchivedUsersView(generics.ListAPIView):
    """Get archived conversations for current user"""
    serializer_class = ChatUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        current_user = self.request.user
        
        # Get users that current user has archived
        archived_user_ids = ConversationArchive.objects.filter(
            user=current_user,
            is_archived=True
        ).values_list('other_user', flat=True)
        
        # Subquery to get the ID of the last message for each conversation
        last_message_id_subquery = ChatMessage.objects.filter(
            Q(sender=current_user, recipient=OuterRef('pk')) |
            Q(sender=OuterRef('pk'), recipient=current_user)
        ).order_by('-timestamp').values('pk')[:1]
        
        # Get users and annotate with last message
        queryset = Account.objects.filter(
            id__in=archived_user_ids
        ).annotate(
            last_message_id=Subquery(last_message_id_subquery)
        ).order_by('-last_message_id')
        
        return queryset
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get("all", "false").lower() == "true":
            return None
        return super().paginate_queryset(queryset)