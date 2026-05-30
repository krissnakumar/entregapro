import { useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  connectTracking,
  disconnectTracking,
  updateLocation,
} from '@rn-apps/shared';

interface TrackingConfig {
  driverId: string;
  deliveryId: string;
  updateInterval?: number; // ms, default 10000 (10s)
}

export function useLocationTracking(config: TrackingConfig) {
  const { driverId, deliveryId, updateInterval = 10000 } = config;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingRef = useRef(false);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const startTracking = useCallback(async () => {
    if (trackingRef.current) return;
    trackingRef.current = true;

    // Request foreground location permission
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('[Location] Foreground permission denied');
      return;
    }

    // Request background location permission
    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('[Location] Background permission denied - continuing in foreground only');
    }

    // Connect Socket.IO
    connectTracking(driverId, deliveryId);

    // Start periodic location updates
    intervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: false,
        });

        const { latitude, longitude } = loc.coords;
        const speed = loc.coords.speed ?? undefined;
        const heading = loc.coords.heading ?? undefined;

        // Only send if position changed significantly (10m)
        const lastLoc = lastLocationRef.current;
        if (lastLoc) {
          const dist = getDistance(
            lastLoc.lat,
            lastLoc.lng,
            latitude,
            longitude,
          );
          if (dist < 10) return; // Skip if less than 10m
        }

        lastLocationRef.current = { lat: latitude, lng: longitude };

        updateLocation({
          deliveryId,
          lat: latitude,
          lng: longitude,
          driverId,
          speed,
          heading,
          batteryLevel: undefined, // Would need expo-device or Battery API
        });
      } catch (err) {
        console.warn('[Location] Update error:', err);
      }
    }, updateInterval);
  }, [driverId, deliveryId, updateInterval]);

  const stopTracking = useCallback(() => {
    trackingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    disconnectTracking();
  }, []);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startTracking();
      } else if (nextState === 'background') {
        // Keep tracking in background
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    startTracking();

    return () => {
      subscription.remove();
      stopTracking();
    };
  }, [startTracking, stopTracking]);
}

// Haversine distance in meters
function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
