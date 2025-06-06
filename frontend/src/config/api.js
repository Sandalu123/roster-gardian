// src/config/api.js
import axios from 'axios';

const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4010',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
};

// Create axios instance with default configuration
const apiClient = axios.create(API_CONFIG);

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.log('Unauthorized access - redirecting to login');
      // You can add redirect logic here
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_CONFIG };