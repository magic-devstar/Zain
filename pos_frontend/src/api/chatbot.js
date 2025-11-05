import api from '../utils/api';

export const sendChatMessage = (message) => {
  return api.post('/chat/api/chatbot/', { message });
}; 