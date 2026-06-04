import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import { ENV } from '../config/env';
import { logger, AuthError } from '../config/logger';

// Secure storage abstraction
// For React Native: uses AsyncStorage with SecureStore for sensitive data
// For Web: uses localStorage
const storageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      // Try React Native AsyncStorage first
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(name);
    } catch {
      // Fallback to localStorage for web
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(name);
      }
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(name, value);
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(name, value);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(name);
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(name);
      }
    }
  },
};

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  setAuth: (user: User, token: string, refreshToken: string, expiresInMs?: number) => void;
  setTokens: (token: string, refreshToken: string, expiresInMs?: number) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
  refreshIfNeeded: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,

      setAuth: (user: User, token: string, refreshToken: string, expiresInMs?: number) => {
        // Standard backend JWT lasts 15m; we can set it to that if expiresInMs is not provided
        const tokenExpiresAt = expiresInMs 
          ? Date.now() + expiresInMs 
          : Date.now() + (15 * 60 * 1000); 
        
        set({ user, token, refreshToken, tokenExpiresAt });
        logger.info('User authenticated', { userId: user.id, expiresAt: new Date(tokenExpiresAt).toISOString() });
      },

      setTokens: (token: string, refreshToken: string, expiresInMs?: number) => {
        const tokenExpiresAt = expiresInMs 
          ? Date.now() + expiresInMs 
          : Date.now() + (15 * 60 * 1000);
        
        set({ token, refreshToken, tokenExpiresAt });
        logger.info('Tokens updated successfully');
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, tokenExpiresAt: null });
        logger.info('User logged out');
      },

      isAuthenticated: () => {
        const state = get();
        // User is authenticated if we have a token and user (even if access token is expired but refresh token is available)
        return (!!state.token || !!state.refreshToken) && !!state.user;
      },

      isTokenExpired: () => {
        const state = get();
        if (!state.tokenExpiresAt) return false;
        return Date.now() > state.tokenExpiresAt;
      },

      refreshIfNeeded: () => {
        const state = get();
        // Only force logout if the token is expired and we don't have a refresh token either
        if (state.isTokenExpired() && !state.refreshToken) {
          logger.warn('Token expired and no refresh token available, logging out');
          state.logout();
          return true; // Token was expired
        }
        return false;
      },
    }),
    {
      name: 'entregapro-rn-auth',
      storage: createJSONStorage(() => storageAdapter),
      onRehydrateStorage: () => (state) => {
        // Check token expiration on app startup
        if (state) {
          try {
            if (state.refreshIfNeeded()) {
              logger.info('Token was expired on app startup, user logged out');
            }
          } catch (error) {
            // Silently fail during rehydration
            logger.debug('Rehydration check failed', { error: String(error) });
          }
        }
      },
    },
  ),
);

// Token provider for API client
export function getAuthToken(): string | null {
  try {
    const state = useAuthStore.getState();
    return state.token;
  } catch (error) {
    // Silently fail during app initialization
    return null;
  }
}
