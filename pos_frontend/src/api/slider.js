import api from '../utils/api';

export const getSliderSlides = async () => {
  try {
    const response = await api.get('/common/api/slider-slides/');
    
    // Handle both paginated and direct array responses
    const slides = Array.isArray(response.data) ? response.data : (response.data.results || []);
    return slides;
  } catch (error) {
    console.error('Error in getSliderSlides:', error);
    return [];
  }
};

export const getSliderSlide = async (id) => {
  const response = await api.get(`/common/api/slider-slides/${id}/`);
  return response.data;
};

export const createSliderSlide = async (data) => {
  const response = await api.post('/common/api/slider-slides/', data);
  return response.data;
};

export const updateSliderSlide = async ({ id, data }) => {
  const response = await api.patch(`/common/api/slider-slides/${id}/`, data);
  return response.data;
};

export const deleteSliderSlide = async (id) => {
  const response = await api.delete(`/common/api/slider-slides/${id}/`);
  return response.data;
};
