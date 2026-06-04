import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, logger, ENV } from '@rn-apps/shared';

export interface OfflineMutation {
  id: string;
  type: 'STATUS' | 'POD';
  deliveryId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  cachedDeliveries: any[];
  mutationQueue: OfflineMutation[];
  isOffline: boolean;
  lastSyncTime: number | null;
  setCachedDeliveries: (deliveries: any[]) => void;
  updateLocalDeliveryStatus: (deliveryId: string, status: string) => void;
  updateLocalDeliveryPOD: (deliveryId: string, signatureUrl: string | null, photoUrl: string) => void;
  enqueueMutation: (type: 'STATUS' | 'POD', deliveryId: string, payload: any) => void;
  setOfflineStatus: (isOffline: boolean) => void;
  syncQueue: () => Promise<void>;
  getQueueStats: () => { total: number; failed: number; pending: number };
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      cachedDeliveries: [],
      mutationQueue: [],
      isOffline: false,
      lastSyncTime: null,

      setCachedDeliveries: (deliveries) => set({ cachedDeliveries: deliveries }),

      updateLocalDeliveryStatus: (deliveryId, status) => {
        set((state) => ({
          cachedDeliveries: state.cachedDeliveries.map((d) =>
            d.id === deliveryId ? { ...d, status } : d
          ),
        }));
      },

      updateLocalDeliveryPOD: (deliveryId, signatureUrl, photoUrl) => {
        set((state) => ({
          cachedDeliveries: state.cachedDeliveries.map((d) =>
            d.id === deliveryId
              ? {
                  ...d,
                  status: 'DELIVERED',
                  signatureUrl,
                  photoUrl,
                  completedAt: new Date().toISOString(),
                }
              : d
          ),
        }));
      },

      enqueueMutation: (type, deliveryId, payload) => {
        const mutation: OfflineMutation = {
          id: Math.random().toString(36).substring(7),
          type,
          deliveryId,
          payload,
          timestamp: Date.now(),
          retryCount: 0,
        };
        set((state) => ({
          mutationQueue: [...state.mutationQueue, mutation],
        }));
        logger.info('Offline mutation queued', { type, deliveryId, queueLength: get().mutationQueue.length });
      },

      setOfflineStatus: (isOffline) => {
        set({ isOffline });
        logger.info(isOffline ? 'Offline mode enabled' : 'Online mode enabled');
      },

      syncQueue: async () => {
        const { mutationQueue } = get();
        if (mutationQueue.length === 0) {
          logger.debug('No offline mutations to sync');
          return;
        }

        logger.info(`Syncing ${mutationQueue.length} offline mutations...`);
        const remainingQueue: OfflineMutation[] = [];
        let syncedCount = 0;
        let failedCount = 0;

        for (const mutation of mutationQueue) {
          try {
            if (mutation.retryCount >= ENV.MAX_RETRY_ATTEMPTS) {
              logger.warn(`Mutation ${mutation.id} exceeded max retry attempts`, {
                type: mutation.type,
                deliveryId: mutation.deliveryId,
              });
              continue; // Skip this mutation
            }

            if (mutation.type === 'STATUS') {
              await api.patch(`/deliveries/${mutation.deliveryId}/status`, mutation.payload);
            } else if (mutation.type === 'POD') {
              await api.post(`/pod/${mutation.deliveryId}`, mutation.payload);
            }

            logger.info(`Offline mutation synced: ${mutation.type} for ${mutation.deliveryId}`);
            syncedCount++;
          } catch (error: any) {
            const isNetworkError = error?.name === 'NetworkError' || 
                                  error?.message?.includes('fetch') ||
                                  error?.message?.includes('network') ||
                                  error?.message?.includes('ECONNREFUSED');
            const isValidationError = error?.message?.includes('validation') || 
                                     error?.message?.includes('400') ||
                                     error?.message?.includes('422');

            if (isValidationError) {
              logger.error(`Validation error for mutation ${mutation.id}`, error, {
                type: mutation.type,
                deliveryId: mutation.deliveryId,
              });
            } else if (isNetworkError) {
              logger.warn(`Network error for mutation ${mutation.id}`, error, {
                type: mutation.type,
                retryCount: mutation.retryCount,
              });
              failedCount++;
              remainingQueue.push({
                ...mutation,
                retryCount: mutation.retryCount + 1,
              });
            } else {
              logger.warn(`Unknown error for mutation ${mutation.id}`, error, {
                type: mutation.type,
                retryCount: mutation.retryCount,
              });
              failedCount++;
              remainingQueue.push({
                ...mutation,
                retryCount: mutation.retryCount + 1,
              });
            }
          }
        }

        set({ 
          mutationQueue: remainingQueue,
          lastSyncTime: Date.now(),
        });

        logger.info('Offline sync complete', { 
          synced: syncedCount, 
          failed: failedCount, 
          remaining: remainingQueue.length 
        });
      },

      getQueueStats: () => {
        const { mutationQueue } = get();
        return {
          total: mutationQueue.length,
          failed: mutationQueue.filter(m => m.retryCount > 0).length,
          pending: mutationQueue.filter(m => m.retryCount === 0).length,
        };
      },
    }),
    {
      name: 'entregapro-offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
