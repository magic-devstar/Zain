import { api } from './api';

export const getTutorials = async () => {
  const response = await api.get('/common/api/tutorials/');
  return response.data;
};

export const getTutorial = async (id) => {
  const response = await api.get(`/common/api/tutorials/${id}/`);
  return response.data;
};

export const createTutorial = async (data) => {
  const response = await api.post('/common/api/tutorials/', data);
  return response.data;
};

export const updateTutorial = async ({ id, data }) => {
  const response = await api.patch(`/common/api/tutorials/${id}/`, data);
  return response.data;
};

export const deleteTutorial = async (id) => {
  const response = await api.delete(`/common/api/tutorials/${id}/`);
  return response.data;
}; 