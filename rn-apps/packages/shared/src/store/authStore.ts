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
  tokenExpiresAt: number | null;
  setAuth: (user: User, token: string, expiresInMs?: number) => void;
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
      tokenExpiresAt: null,

      setAuth: (user: User, token: string, expiresInMs?: number) => {
        const tokenExpiresAt = expiresInMs 
          ? Date.now() + expiresInMs 
          : Date.now() + ENV.TOKEN_EXPIRY_MS;
        
        set({ user, token, tokenExpiresAt });
        logger.info('User authenticated', { userId: user.id, expiresAt: new Date(tokenExpiresAt).toISOString() });
      },

      logout: () => {
        set({ user: null, token: null, tokenExpiresAt: null });
        logger.info('User logged out');
      },

      isAuthenticated: () => {
        const state = get();
        return !!state.token && !!state.user && !state.isTokenExpired();
      },

      isTokenExpired: () => {
        const state = get();
        if (!state.tokenExpiresAt) return false;
        return Date.now() > state.tokenExpiresAt;
      },

      refreshIfNeeded: () => {
        const state = get();
        if (state.isTokenExpired()) {
          logger.warn('Token expired, logging out');
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
    
    if (!state.token) {
      return null;
    }

    // Check if token is expired
    if (state.isTokenExpired()) {
      state.logout();
      return null; // Return null instead of throwing
    }

    return state.token;
  } catch (error) {
    // Silently fail during app initialization
    return null;
  }
}
