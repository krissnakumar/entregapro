import { useLocationTracking } from '../hooks/useLocationTracking';

interface TrackingActivatorProps {
  driverId: string;
  deliveryId: string;
}

export default function TrackingActivator({
  driverId,
  deliveryId,
}: TrackingActivatorProps) {
  useLocationTracking({
    driverId,
    deliveryId,
    movingInterval: 10000,
  });
  return null;
}
