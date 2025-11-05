from django.urls import path
from .views import (
    UserListView, ChattedUsersView, MessageHistoryView, ChatBotView,
    DeleteMessageView, DeleteConversationView, ArchiveConversationView, ArchivedUsersView
)

urlpatterns = [
    path('users/', UserListView.as_view(), name='user-list'),
    path('chatted-users/', ChattedUsersView.as_view(), name='chatted-users'),
    path('archived-users/', ArchivedUsersView.as_view(), name='archived-users'),
    path('messages/<int:user_id>/', MessageHistoryView.as_view(), name='message-history'),
    path('delete-message/<int:message_id>/', DeleteMessageView.as_view(), name='delete-message'),
    path('delete-conversation/<int:user_id>/', DeleteConversationView.as_view(), name='delete-conversation'),
    path('archive-conversation/<int:user_id>/', ArchiveConversationView.as_view(), name='archive-conversation'),
    path('chatbot/', ChatBotView.as_view(), name='chatbot'),
] 