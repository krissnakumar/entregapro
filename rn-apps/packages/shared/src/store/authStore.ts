import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';

// Secure storage abstraction - uses AsyncStorage by default
// Can be replaced with expo-secure-store on native platforms
const storageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(name);
    } catch {
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
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user: User, token: string) => {
        set({ user, token });
      },
      logout: () => {
        set({ user: null, token: null });
      },
      isAuthenticated: () => {
        const state = get();
        return !!state.token && !!state.user;
      },
    }),
    {
      name: 'entregapro-rn-auth',
      storage: createJSONStorage(() => storageAdapter),
    },
  ),
);

// Token provider for API client
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
