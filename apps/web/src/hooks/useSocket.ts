import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:3001';

let globalSocket: Socket | null = null;
let globalListeners = 0;

export function useSocket() {
  const token = useAuthStore(s => s.token);
  const listenersRef = useRef(0);

  const getSocket = useCallback(() => {
    if (!globalSocket?.connected) {
      globalSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      });
    }
    return globalSocket;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    listenersRef.current = ++globalListeners;

    socket.emit('joinDispatchers');

    return () => {
      listenersRef.current = --globalListeners;
      if (globalListeners <= 0 && globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
    };
  }, [token, getSocket]);

  return { socket: globalSocket, getSocket };
}

export function useDriverLocations() {
  const { socket, getSocket } = useSocket();
  const locationsRef = useRef<Map<string, { lat: number; lng: number; driverId: string; deliveryId: string; speed?: number; heading?: number; batteryLevel?: number }>>(new Map());

  useEffect(() => {
    const s = socket || getSocket();
    if (!s) return;

    const handler = (data: any) => {
      locationsRef.current.set(data.driverId, data);
    };
    s.on('driverLocationUpdated', handler);
    return () => { s.off('driverLocationUpdated', handler); };
  }, [socket, getSocket]);

  return locationsRef;
}
