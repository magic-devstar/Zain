import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get tokens from localStorage (or from Redux if using)
const getTokens = () => {
  return {
    access: localStorage.getItem('access'),
    refresh: localStorage.getItem('refresh'),
  };
};

// Function to refresh the token
const refreshToken = async () => {
  const { refresh } = getTokens();
  if (!refresh) return null; // If there's no refresh token, return null

  try {
    const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh/`, {
      refresh,
    });
    const { access, refresh: newRefresh } = response.data;

    // Save both tokens
    localStorage.setItem('access', access);
    if (newRefresh) {
      localStorage.setItem('refresh', newRefresh);
    }

    return access;
  } catch (error) {
    // Specifically handle 401 from refresh token endpoint
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      window.location.href = '/';
      return null;
    }
    // For other errors, just log them but don't clear tokens
    console.error('Error refreshing token:', error);
    return null;
  }
};

// Request interceptor to add the Authorization header
api.interceptors.request.use(
  (config) => {
    // // Log the full request URL (baseURL + endpoint)
    // const fullUrl = `${config.baseURL}${config.url}`;
    // console.log('Request URL:', fullUrl); // This will log the complete URL including the base URL and the endpoint

    const { access } = getTokens();
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors and refresh the token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the request fails with a 401 status and it's not already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // console.log("Refreshing the access token")
      originalRequest._retry = true; // Mark the request as retried

      // Attempt to refresh the token
      const newAccessToken = await refreshToken();
      if (newAccessToken) {
        // Update the Authorization header with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry the original request
        const retryResponse = await api(originalRequest);
        return retryResponse; // Return the retried response
      } else {
        // Redirect to login if token refresh fails
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
