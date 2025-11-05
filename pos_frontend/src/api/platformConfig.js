import api from '../utils/api';

export const getPlatformConfig = async () => {
  const { data } = await api.get('/common/api/platform-config/');
  return data;
};

export const updatePlatformConfig = async (payload) => {
  const { data } = await api.put('/common/api/platform-config/1/', payload);
  return data;
};


export const getPreferredSoftwareOptions = async () => {
  const { data } = await api.get('/common/api/preferred-software-options/');
  return data?.options || [];
};

export const updatePreferredSoftwareOptions = async (options) => {
  const { data } = await api.put('/common/api/preferred-software-options/update/', { options });
  return data?.options || [];
};


