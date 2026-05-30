import React, { useState } from 'react';
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
import { useDispatchOrders, colors, borderRadius, shadows } from '@rn-apps/shared';

export default function GpsMonitoringScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { data: orders, isLoading } = useDispatchOrders();

  const fleet = (orders || []).map((order: any) => ({
    id: order.id,
    driver: order.driver?.name || order.assignedDriver || 'N/D',
    truck: order.vehicle?.plate || order.assignedTruck || 'N/D',
    destination: order.deliveryAddress || order.destination || order.primaryDestination || 'N/D',
    gpsLocation: order.gpsLocation || order.currentLocation || 'Aguardando coordenadas',
    eta: order.eta || order.estimatedArrival || 'N/D',
    routeProgress: order.routeProgress || 0,
    delayed: order.delayed || false,
    invoiceCount: (order.invoices || order.items || []).length,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📍 Frota Em Movimento</Text>
          <Text style={styles.headerSubtitle}>Acompanhe coordenadas e tempo estimado</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>RASTREAMENTO</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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
                  <Text style={styles.vehicleDriver}>{vehicle.driver}</Text>
                  <Text style={styles.vehicleTruck}>{vehicle.truck}</Text>
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
                  <Text style={styles.progressLabel}>{vehicle.destination}</Text>
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
                    {vehicle.gpsLocation}
                  </Text>
                </View>
                <Text style={styles.invoiceCount}>
                  {vehicle.invoiceCount} nota(s)
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            📌 Roteamento e notas gerenciados pela central Admin
          </Text>
        </View>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
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
  footerNote: {
    padding: 14, backgroundColor: colors.background, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.borderLight, marginTop: 8,
  },
  footerNoteText: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
});
