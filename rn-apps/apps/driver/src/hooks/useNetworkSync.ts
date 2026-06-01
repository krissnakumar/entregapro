import { useEffect, useRef } from 'react';
import { useOfflineStore } from '../store/offlineStore';
import { API_BASE_URL } from '@rn-apps/shared';

export function useNetworkSync() {
  const { isOffline, setOfflineStatus, syncQueue, mutationQueue } = useOfflineStore();
  const wasOfflineRef = useRef(isOffline);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(`${API_BASE_URL}/deliveries`, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (wasOfflineRef.current) {
          console.log('🌐 Connection restored! Syncing queued actions...');
          wasOfflineRef.current = false;
          setOfflineStatus(false);
          await syncQueue();
        }
      } catch (err) {
        if (!wasOfflineRef.current) {
          console.log('📡 Device went offline.');
          wasOfflineRef.current = true;
          setOfflineStatus(true);
        }
      }
    };

    wasOfflineRef.current = isOffline;
    checkConnection();

    const interval = setInterval(checkConnection, 15000);

    return () => clearInterval(interval);
  }, [setOfflineStatus, syncQueue]);

  return {
    isOffline,
    queueSize: mutationQueue.length,
  };
}
