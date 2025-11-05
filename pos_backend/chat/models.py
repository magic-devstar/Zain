from django.db import models
from custom_user.models import Account

class ChatMessage(models.Model):
    sender = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='received_messages')
    message = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    message_type = models.CharField(max_length=10, choices=[('text', 'Text'), ('voice', 'Voice')], default='text')
    voice_message = models.FileField(upload_to='voice_messages/', blank=True, null=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f'Message from {self.sender} to {self.recipient} at {self.timestamp}'

    class Meta:
        ordering = ['timestamp']


class ConversationArchive(models.Model):
    user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='archived_conversations')
    other_user = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='conversations_archived_by')
    is_archived = models.BooleanField(default=True)
    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'other_user']

    def __str__(self):
        return f'Conversation between {self.user} and {self.other_user} archived' 