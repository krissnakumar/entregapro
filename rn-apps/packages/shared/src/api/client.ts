import { ENV } from '../config/env';
import { logger, NetworkError, AuthError } from '../config/logger';

export const API_BASE_URL = ENV.API_URL;

let getToken: (() => string | null) | null = null;

export function setTokenProvider(provider: () => string | null) {
  getToken = provider;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
}

async function handleResponse<T>(response: Response): Promise<T> {
  let errorData: ApiErrorResponse = {};
  
  try {
    errorData = await response.json();
  } catch {
    // Response was not JSON
  }

  if (!response.ok) {
    const errorMessage = errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`;
    
    logger.error('API request failed', new Error(errorMessage), {
      status: response.status,
      endpoint: response.url,
      error: errorData,
    });

    // Handle specific error codes
    if (response.status === 401 || response.status === 403) {
      try {
        const { useAuthStore } = require('../store/authStore');
        useAuthStore.getState().logout();
      } catch (err) {
        // Silently catch require errors if store is not yet fully loaded
      }
      throw new AuthError(errorMessage, {
        status: response.status,
        code: errorData.code,
      });
    }

    if (response.status >= 500) {
      throw new NetworkError('Server error. Please try again later.', {
        status: response.status,
        originalMessage: errorMessage,
      });
    }

    throw new Error(errorMessage);
  }

  return errorData as T;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const { useAuthStore } = require('../store/authStore');
      const state = useAuthStore.getState();
      const refreshToken = state.refreshToken;

      if (!refreshToken) {
        logger.warn('Refresh requested but no refreshToken in state');
        state.logout();
        return null;
      }

      logger.debug('Refreshing tokens...');
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        logger.warn('Refresh token request failed on server', { status: response.status });
        state.logout();
        return null;
      }

      const data = await response.json();
      if (data.access_token && data.refresh_token) {
        state.setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      }

      logger.warn('Invalid tokens returned from refresh endpoint');
      state.logout();
      return null;
    } catch (error) {
      logger.error('Error refreshing tokens', error as Error);
      try {
        const { useAuthStore } = require('../store/authStore');
        useAuthStore.getState().logout();
      } catch {}
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let token: string | null = null;
  
  try {
    token = getToken?.() ?? null;
  } catch (error) {
    // Token retrieval failed (e.g., store not initialized)
    logger.debug('Token retrieval failed', { error: String(error) });
  }

  // Pre-request expiration check and token refresh
  if (endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    try {
      const { useAuthStore } = require('../store/authStore');
      const state = useAuthStore.getState();
      if (state.token && state.isTokenExpired() && state.refreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          token = newToken;
        }
      }
    } catch (err) {
      logger.debug('Pre-request token refresh check failed', { error: String(err) });
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    logger.debug(`API ${options.method || 'GET'} ${endpoint}`);

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If 401/403, and it's not a refresh/login request, try to refresh and retry
    if ((response.status === 401 || response.status === 403) && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      logger.warn(`API returned ${response.status} for ${endpoint}. Attempting token refresh...`);
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry request with new token
        logger.info(`Retrying request ${endpoint} with refreshed token`);
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        });
      }
    }

    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Network') || error.message.includes('Failed to fetch'))) {
      logger.error('Network request failed', error, { endpoint });
      throw new NetworkError('Unable to connect. Check your internet connection.');
    }
    throw error;
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
