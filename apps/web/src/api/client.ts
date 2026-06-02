import { useAuthStore } from '../store/useAuthStore';

function getBaseUrl() {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (import.meta.env.PROD) return '/api';
  if (configured) return configured;
  return 'http://localhost:3001';
}

const BASE_URL = getBaseUrl();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = null;
  try {
    const authData = localStorage.getItem('entregapro-auth');
    if (authData) {
      token = JSON.parse(authData).state?.token;
    }
  } catch (e) {
    console.error('Failed to parse auth token', e);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  if (!token && endpoint !== '/auth/login') {
    console.warn(`No auth token found for request to ${endpoint}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/auth/login') {
      useAuthStore.getState().logout();
    }
    const error = await response.json();
    console.error(`API Error [${endpoint}]:`, error);
    throw new Error(error.message || 'Something went wrong');
  }

  const json = await response.json();
  if (json && typeof json === 'object' && Array.isArray(json.data) && 'total' in json) {
    return json.data;
  }
  return json;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
