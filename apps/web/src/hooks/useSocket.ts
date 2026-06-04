import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:3001';

let globalSocket: Socket | null = null;
let globalListeners = 0;

export function useSocket() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const listenersRef = useRef(0);

  const getSocket = useCallback(() => {
    if (!token) return null;

    if (!globalSocket) {
      globalSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      });
    } else {
      globalSocket.auth = { token };
      if (!globalSocket.connected) {
        globalSocket.connect();
      }
    }

    return globalSocket;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    if (!socket) return;
    listenersRef.current = ++globalListeners;

    const joinRooms = () => {
      // The gateway already auto-joins user/org rooms from JWT.
      // Keep the shared dispatch room explicit for admin + dispatcher views.
      if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DISPATCHER') {
        socket.emit('joinDispatchers');
      }
    };

    joinRooms();
    socket.on('connect', joinRooms);

    return () => {
      socket.off('connect', joinRooms);
      listenersRef.current = --globalListeners;
      if (globalListeners <= 0 && globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
    };
  }, [token, getSocket, user]);

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

export function useDeliveryEvents(deliveryId: string) {
  const { socket, getSocket } = useSocket();

  useEffect(() => {
    if (!deliveryId) return;
    const s = socket || getSocket();
    if (!s) return;

    s.emit('joinDelivery', deliveryId);

    return () => {
      s.emit('leaveDelivery', deliveryId);
    };
  }, [deliveryId, socket, getSocket]);

  return socket;
}

export function useLoadBatchEvents(loadBatchId: string) {
  const { socket, getSocket } = useSocket();

  useEffect(() => {
    if (!loadBatchId) return;
    const s = socket || getSocket();
    if (!s) return;

    s.emit('joinLoadBatch', loadBatchId);

    return () => {
      s.emit('leaveLoadBatch', loadBatchId);
    };
  }, [loadBatchId, socket, getSocket]);

  return socket;
}

export function useRealtimeNotifications(onNotification?: (notification: any) => void) {
  const { socket, getSocket } = useSocket();

  useEffect(() => {
    const s = socket || getSocket();
    if (!s) return;

    const handler = (notification: any) => {
      onNotification?.(notification);
    };

    s.on('notification.created', handler);

    return () => {
      s.off('notification.created', handler);
    };
  }, [socket, getSocket, onNotification]);
}
