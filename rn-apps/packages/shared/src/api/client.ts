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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    logger.debug(`API ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

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
