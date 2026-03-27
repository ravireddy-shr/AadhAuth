import axios from 'axios';

const DEFAULT_DEV_API_BASE_URL = 'http://127.0.0.1:5000';

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://localhost:5000' : DEFAULT_DEV_API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL
});

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getApiErrorMessage = (error, fallback = 'Request failed') => {
  if (!error?.response) {
    return `Cannot reach backend at ${API_BASE_URL}. Start the backend server and try again.`;
  }

  return error.response?.data?.error || fallback;
};

export default api;
