from rest_framework import serializers
from .models import ChatMessage
from custom_user.serializers import AccountSerializer

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = AccountSerializer(read_only=True)
    recipient = AccountSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'recipient', 'message', 'timestamp', 'message_type', 'voice_message', 'is_read'] 

class ChatUserSerializer(AccountSerializer):
    last_message = serializers.SerializerMethodField()
    last_message_timestamp = serializers.SerializerMethodField()

    class Meta(AccountSerializer.Meta):
        fields = AccountSerializer.Meta.fields + ['last_message', 'last_message_timestamp']

    def get_last_message_details(self, obj):
        last_message_id = getattr(obj, 'last_message_id', None)
        if not last_message_id:
            return None, None

        try:
            last_message = ChatMessage.objects.get(pk=last_message_id)
            message_content = "Voice Message" if last_message.message_type == 'voice' else last_message.message
            return message_content, last_message.timestamp
        except ChatMessage.DoesNotExist:
            return None, None

    def get_last_message(self, obj):
        message_content, _ = self.get_last_message_details(obj)
        return message_content

    def get_last_message_timestamp(self, obj):
        _, timestamp = self.get_last_message_details(obj)
        return timestamp 