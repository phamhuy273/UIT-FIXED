import axios from 'axios';
import { clearAccessToken, readAccessToken } from '@/features/auth/lib/token-storage';

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = readAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = typeof error.config?.url === 'string' ? error.config.url : '';
    const isCredentialAttempt = url.includes('/auth/login') || url.includes('/auth/register');
    if (status === 401 && !isCredentialAttempt) {
      clearAccessToken();
      onUnauthorized?.();
    }
    return Promise.reject(error.response?.data ?? error);
  },
);
