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
  movingInterval?: number;
  stationaryInterval?: number;
}

const MOVING_THRESHOLD_KMH = 5;
const SIGNIFICANT_MOVE_METERS = 10;

export function useLocationTracking(config: TrackingConfig) {
  const {
    driverId,
    deliveryId,
    movingInterval = 3000,
    stationaryInterval = 30000,
  } = config;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingRef = useRef(false);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const isMovingRef = useRef(false);
  const lastSpeedRef = useRef(0);

  const startTracking = useCallback(async () => {
    if (trackingRef.current) return;
    trackingRef.current = true;

    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('[Location] Foreground permission denied');
      return;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('[Location] Background permission denied - continuing in foreground only');
    }

    connectTracking(driverId, deliveryId);

    let currentInterval = stationaryInterval;

    const tick = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: false,
        });

        const { latitude, longitude, speed: rawSpeed } = loc.coords;
        const speed = rawSpeed ?? 0;
        const speedKmh = speed * 3.6;
        lastSpeedRef.current = speedKmh;

        const wasMoving = isMovingRef.current;
        isMovingRef.current = speedKmh > MOVING_THRESHOLD_KMH;

        // Adaptive interval: moving → fast updates, stationary → slow updates
        const targetInterval = isMovingRef.current ? movingInterval : stationaryInterval;

        if (targetInterval !== currentInterval) {
          currentInterval = targetInterval;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(tick, currentInterval);
          }
        }

        // Only send if position changed significantly
        const lastLoc = lastLocationRef.current;
        if (lastLoc) {
          const dist = getDistance(lastLoc.lat, lastLoc.lng, latitude, longitude);
          if (dist < SIGNIFICANT_MOVE_METERS && !wasMoving && !isMovingRef.current) return;
        }

        lastLocationRef.current = { lat: latitude, lng: longitude };

        updateLocation({
          deliveryId,
          lat: latitude,
          lng: longitude,
          driverId,
          speed: speed,
          heading: loc.coords.heading ?? undefined,
          batteryLevel: undefined,
        });
      } catch (err) {
        console.warn('[Location] Update error:', err);
      }
    };

    intervalRef.current = setInterval(tick, currentInterval);
  }, [driverId, deliveryId, movingInterval, stationaryInterval]);

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

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
