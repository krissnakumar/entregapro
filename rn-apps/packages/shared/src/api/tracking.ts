import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { getAuthToken } from '../store/authStore';

const getSocketUrl = (): string => {
  // Use configured API URL as base for socket connection
  const apiUrl = ENV.API_URL;
  if (apiUrl) {
    // Replace http with ws for WebSocket connections
    return apiUrl.replace(/^http/, 'ws');
  }

  return 'http://localhost:3001';
};

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(url?: string, token?: string | null): Socket {
  const t = token || getAuthToken();

  if (socket) {
    socket.auth = { token: t };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(url || getSocketUrl(), {
    auth: { token: t },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function connectTracking(driverId: string, deliveryId?: string): Socket {
  const s = connectSocket();

  s.off('connect').on('connect', () => {
    console.log('[Tracking] Connected:', s.id);
    s.emit('joinDispatchers');
    if (deliveryId) {
      s.emit('joinDelivery', deliveryId);
    }
  });

  return s;
}

export function disconnectTracking(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function updateLocation(data: {
  deliveryId: string;
  lat: number;
  lng: number;
  driverId: string;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
}): void {
  if (socket?.connected) {
    socket.emit('updateLocation', data);
  }
}

export function joinDeliveryRoom(deliveryId: string): void {
  if (socket?.connected) {
    socket.emit('joinDelivery', deliveryId);
  }
}

export function onLocationUpdated(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('locationUpdated', callback);
  return () => socket?.off('locationUpdated', callback);
}

export function onDriverLocationUpdated(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('driverLocationUpdated', callback);
  return () => socket?.off('driverLocationUpdated', callback);
}

export function onDriverStatusChanged(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('driverStatusChanged', callback);
  return () => socket?.off('driverStatusChanged', callback);
}

export function onGeofenceAlert(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('geofenceAlert', callback);
  return () => socket?.off('geofenceAlert', callback);
}

// ─── Notifications via Socket ───────────────────────────────────────────

export function onNotificationReceived(callback: (data: any) => void): () => void {
  if (!socket) return () => {};
  socket.on('notification.created', callback);
  return () => socket?.off('notification.created', callback);
}
