import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, Callout } from 'react-native-maps';
import {
  useDispatchOrders,
  colors,
  borderRadius,
  shadows,
  connectTracking,
  disconnectTracking,
  onDriverLocationUpdated,
  useAuthStore,
} from '@rn-apps/shared';

interface LiveLocation {
  lat: number;
  lng: number;
  speed?: number;
  timestamp?: string;
}

export default function GpsMonitoringScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { data: orders, isLoading } = useDispatchOrders();
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLocation>>({});

  // 1. Map socket location updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('[DispatcherMap] Connecting tracking socket for:', user.id);
    connectTracking(user.id);

    const unsubscribe = onDriverLocationUpdated((data) => {
      console.log('[DispatcherMap] Live location update:', data);
      if (data && data.driverId) {
        const latVal = Number(data.lat);
        const lngVal = Number(data.lng);
        if (!Number.isNaN(latVal) && !Number.isNaN(lngVal) && latVal !== 0 && lngVal !== 0) {
          setLiveLocations((prev) => ({
            ...prev,
            [data.driverId]: {
              lat: latVal,
              lng: lngVal,
              speed: data.speed !== undefined ? Number(data.speed) : undefined,
              timestamp: new Date().toISOString(),
            },
          }));
        }
      }
    });

    return () => {
      unsubscribe();
      disconnectTracking();
    };
  }, [user?.id]);

  // 2. Format vehicles list with live tracking data
  const fleet = (orders || [])
    .map((order: any) => {
      const delivery = order.deliveries?.[0];
      const driverId = delivery?.driver?.id || '';
      const liveLoc = liveLocations[driverId];

      const latVal = liveLoc && typeof liveLoc.lat === 'number' && !Number.isNaN(liveLoc.lat) ? liveLoc.lat : -23.5505;
      const lngVal = liveLoc && typeof liveLoc.lng === 'number' && !Number.isNaN(liveLoc.lng) ? liveLoc.lng : -46.6333;

      return {
        id: order.id,
        driverId,
        driverName: delivery?.driver?.user?.name || delivery?.driver?.name || order.assignedDriver || 'N/D',
        truckPlate: delivery?.vehicle?.vehicleNumber || order.assignedTruck || 'N/D',
        destination: delivery?.deliveryAddress || order.destination || order.primaryDestination || 'N/D',
        latitude: latVal,
        longitude: lngVal,
        speed: liveLoc?.speed !== undefined ? Number(liveLoc.speed) : 0,
        eta: order.eta || order.estimatedArrival || 'N/D',
        routeProgress: order.routeProgress || 0,
        delayed: order.delayed || false,
        invoiceCount: (delivery?.invoices || order.invoices || order.items || []).length,
      };
    })
    .filter((v: any) => v.driverId !== ''); // Only show vehicles with drivers

  const centralRegion = {
    latitude: fleet.length > 0 && typeof fleet[0].latitude === 'number' && !Number.isNaN(fleet[0].latitude) ? fleet[0].latitude : -23.5505,
    longitude: fleet.length > 0 && typeof fleet[0].longitude === 'number' && !Number.isNaN(fleet[0].longitude) ? fleet[0].longitude : -46.6333,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📍 Frota Em Movimento</Text>
          <Text style={styles.headerSubtitle}>Coordenadas via Socket.IO em tempo real</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>LIVE</Text>
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0', padding: 20 }]}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🗺️</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
              Visualização de Mapa Interativo
            </Text>
            <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4, textAlign: 'center' }}>
              Rastreamento em tempo real disponível no aplicativo móvel.
            </Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={centralRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {fleet
              .filter(
                (v: any) =>
                  typeof v.latitude === 'number' &&
                  !Number.isNaN(v.latitude) &&
                  typeof v.longitude === 'number' &&
                  !Number.isNaN(v.longitude)
              )
              .map((vehicle: any) => (
                <Marker
                  key={vehicle.id}
                  coordinate={{ latitude: vehicle.latitude, longitude: vehicle.longitude }}
                >
                  <View style={styles.truckMarker}>
                    <Text style={styles.truckMarkerText}>🚛</Text>
                  </View>
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{vehicle.driverName}</Text>
                      <Text style={styles.calloutText}>Placa: {vehicle.truckPlate}</Text>
                      <Text style={styles.calloutText}>Velocidade: {vehicle.speed} km/h</Text>
                      <Text style={styles.calloutText}>Destino: {String(vehicle.destination || '')}</Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
          </MapView>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Monitoramento do Painel</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Buscando veículos em rota...</Text>
          </View>
        ) : fleet.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>Nenhum veículo em trânsito no momento</Text>
          </View>
        ) : (
          fleet.map((vehicle: any) => (
            <View key={vehicle.id} style={styles.vehicleCard}>
              <View style={styles.vehicleCardTop}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleDriver}>{vehicle.driverName}</Text>
                  <Text style={styles.vehicleTruck}>Placa: {vehicle.truckPlate}</Text>
                </View>
                <View style={styles.vehicleStatus}>
                  {vehicle.delayed ? (
                    <View style={styles.delayChip}>
                      <Text style={styles.delayChipText}>Atraso</Text>
                    </View>
                  ) : (
                    <View style={styles.onTimeChip}>
                      <Text style={styles.onTimeChipText}>No Horário</Text>
                    </View>
                  )}
                  <View style={styles.etaChip}>
                    <Text style={styles.etaChipText}>ETA: {vehicle.eta}</Text>
                  </View>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>Base</Text>
                  <Text style={styles.progressLabel}>{vehicle.routeProgress}%</Text>
                  <Text style={styles.progressLabel} numberOfLines={1}>
                    {String(vehicle.destination || '').split(',')[0]}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${vehicle.routeProgress}%`,
                        backgroundColor: vehicle.delayed ? '#D97706' : '#2563EB',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Location & Invoices */}
              <View style={styles.vehicleFooter}>
                <View style={styles.locationRow}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationText} numberOfLines={1}>
                    Lat: {vehicle.latitude.toFixed(5)} • Lng: {vehicle.longitude.toFixed(5)}
                  </Text>
                </View>
                <Text style={styles.invoiceCount}>
                  {vehicle.invoiceCount} nota(s)
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },
  headerBadge: {
    backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE',
  },
  headerBadgeText: { fontSize: 8, fontWeight: '800', color: '#4338CA', textTransform: 'uppercase', letterSpacing: 0.5 },
  mapContainer: {
    height: 260,
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  truckMarker: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  truckMarkerText: {
    fontSize: 16,
  },
  calloutContainer: {
    padding: 8,
    width: 180,
  },
  calloutTitle: {
    fontWeight: '800',
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  loadingContainer: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  vehicleCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.sm,
  },
  vehicleCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: { flex: 1 },
  vehicleDriver: { fontSize: 13, fontWeight: '800', color: colors.text },
  vehicleTruck: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  vehicleStatus: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  delayChip: { backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  delayChipText: { fontSize: 8, fontWeight: '800', color: '#DC2626', textTransform: 'uppercase' },
  onTimeChip: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  onTimeChipText: { fontSize: 8, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  etaChip: { backgroundColor: colors.white, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  etaChipText: { fontSize: 8, fontWeight: '700', color: '#4338CA', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  progressContainer: { marginBottom: 12 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 8, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' },
  progressBar: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  vehicleFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationIcon: { fontSize: 12 },
  locationText: { fontSize: 10, color: colors.textSecondary },
  invoiceCount: { fontSize: 9, fontWeight: '700', color: colors.textTertiary },
});
