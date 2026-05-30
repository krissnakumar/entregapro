import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getAuthToken } from '../store/authStore';

const getSocketUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3001`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }
  return 'http://localhost:3001';
};

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectTracking(driverId: string, deliveryId?: string): Socket {
  const token = getAuthToken();

  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('[Tracking] Connected:', socket?.id);

    // Join dispatchers room
    socket?.emit('joinDispatchers');

    // Join specific delivery room if provided
    if (deliveryId) {
      socket?.emit('joinDelivery', deliveryId);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[Tracking] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Tracking] Disconnected:', reason);
  });

  return socket;
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
