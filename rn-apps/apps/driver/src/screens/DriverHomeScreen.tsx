import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useAuthStore,
  useDriverDeliveries,
  colors,
  borderRadius,
  shadows,
  typography,
  getStatusColor,
  getStatusBg,
  getStatusLabel,
} from '@rn-apps/shared';
import type { Delivery } from '@rn-apps/shared';
import TrackingActivator from '../components/TrackingActivator';

export default function DriverHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const queryResult = useDriverDeliveries();
  const deliveries: Delivery[] | undefined = queryResult.data;
  const isLoading = queryResult.isLoading;
  const refetch = queryResult.refetch;

  const activeDelivery = deliveries?.find(
    (d) =>
      d.status === 'ASSIGNED' ||
      d.status === 'LOADING' ||
      d.status === 'IN_TRANSIT',
  );

  const pendingDeliveries = deliveries?.filter(
    (d) => d.status !== 'DELIVERED' && d.status !== 'CANCELLED',
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    );
  };

  const makeCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${cleaned}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {activeDelivery && user?.id && (
        <TrackingActivator
          driverId={user.id}
          deliveryId={activeDelivery.id}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'M'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>Bem-vindo,</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'Motorista'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
          >
            <Text style={styles.profileButtonText}>Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Active Delivery Card */}
        {activeDelivery && (
          <TouchableOpacity
            style={styles.activeCard}
            onPress={() =>
              navigation.navigate('DeliveryDetail', {
                delivery: activeDelivery,
              })
            }
            activeOpacity={0.9}
          >
            <View style={styles.activeCardHeader}>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Entrega Ativa</Text>
              </View>
              <Text style={styles.invoiceNumber}>
                {activeDelivery.deliveryNumber}
              </Text>
            </View>
            <Text style={styles.activeCustomerName}>
              {activeDelivery.customer?.name}
            </Text>
            <Text style={styles.activeAddress} numberOfLines={1}>
              {activeDelivery.deliveryAddress}
            </Text>
            <View style={styles.activeActions}>
              <TouchableOpacity
                style={styles.activeActionBtn}
                onPress={() => openMaps(activeDelivery.deliveryAddress)}
              >
                <Text style={styles.activeActionBtnText}>Rota</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.activeActionBtn, styles.activeActionBtnPrimary]}
                onPress={() =>
                  navigation.navigate('DeliveryDetail', {
                    delivery: activeDelivery,
                  })
                }
              >
                <Text
                  style={[
                    styles.activeActionBtnText,
                    styles.activeActionBtnTextPrimary,
                  ]}
                >
                  Abrir
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activeContactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => makeCall(activeDelivery.customer?.phone || '')}
              >
                <Text style={styles.contactBtnText}>📞 Ligar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() =>
                  openWhatsApp(activeDelivery.customer?.whatsapp || '')
                }
              >
                <Text style={styles.contactBtnText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Deliveries List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manifestos do Dia</Text>
          <Text style={styles.sectionCount}>
            {pendingDeliveries?.length || 0} ordens
          </Text>
        </View>

        {isLoading && deliveries?.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando manifestos...</Text>
          </View>
        )}

        {!isLoading && deliveries?.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Nenhum manifesto hoje</Text>
            <Text style={styles.emptyText}>
              Você não possui entregas agendadas para hoje.
            </Text>
          </View>
        )}

        {deliveries?.map((delivery) => {
          const isCompleted = delivery.status === 'DELIVERED';
          const statusColor = getStatusColor(delivery.status);
          const statusBg = getStatusBg(delivery.status);
          const statusLabel = getStatusLabel(delivery.status);

          return (
            <TouchableOpacity
              key={delivery.id}
              style={[
                styles.deliveryCard,
                isCompleted && styles.deliveryCardCompleted,
              ]}
              onPress={() =>
                navigation.navigate('DeliveryDetail', { delivery })
              }
              activeOpacity={0.7}
            >
              <View style={styles.deliveryCardLeft}>
                <View
                  style={[
                    styles.deliveryIcon,
                    {
                      backgroundColor: isCompleted
                        ? colors.successBg
                        : colors.primaryBg,
                    },
                  ]}
                >
                  <Text style={styles.deliveryIconText}>
                    {isCompleted ? '✓' : '🚚'}
                  </Text>
                </View>
              </View>
              <View style={styles.deliveryCardBody}>
                <View style={styles.deliveryCardTop}>
                  <Text style={styles.deliveryCustomerName} numberOfLines={1}>
                    {delivery.customer?.name}
                  </Text>
                  {delivery.weight && (
                    <Text style={styles.deliveryWeight}>{delivery.weight}</Text>
                  )}
                </View>
                <Text style={styles.deliveryAddress} numberOfLines={1}>
                  {delivery.deliveryAddress}
                </Text>
                <View style={styles.deliveryCardBottom}>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <View
                      style={[styles.statusDot, { backgroundColor: statusColor }]}
                    />
                    <Text style={[styles.statusLabel, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                  <Text style={styles.deliveryTime}>
                    {new Date(delivery.scheduledTime).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.navItemActive}>
          <Text style={styles.navItemIcon}>📋</Text>
          <Text style={styles.navItemLabelActive}>Manifestos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.navItemIcon}>👤</Text>
          <Text style={styles.navItemLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '900', color: colors.white },
  greeting: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: { fontSize: 16, fontWeight: '800', color: colors.white, maxWidth: 180 },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
  },
  profileButtonText: { fontSize: 12, fontWeight: '700', color: colors.white },
  activeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    ...shadows.lg,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  invoiceNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  activeCustomerName: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 4 },
  activeAddress: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },
  activeActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  activeActionBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  activeActionBtnPrimary: { backgroundColor: colors.primary },
  activeActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeActionBtnTextPrimary: { color: colors.white },
  activeContactRow: { flexDirection: 'row', gap: 8 },
  contactBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  contactBtnText: { fontSize: 11, fontWeight: '700', color: colors.text },
  list: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { ...typography.label, fontSize: 12, color: colors.textSecondary },
  sectionCount: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  deliveryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  deliveryCardCompleted: { opacity: 0.75, backgroundColor: '#F8FAFC' },
  deliveryCardLeft: { marginRight: 12 },
  deliveryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryIconText: { fontSize: 20 },
  deliveryCardBody: { flex: 1 },
  deliveryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryCustomerName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  deliveryWeight: { fontSize: 10, fontWeight: '700', color: colors.textTertiary },
  deliveryAddress: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  deliveryCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  deliveryTime: { fontSize: 9, fontWeight: '700', color: colors.textTertiary },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 40,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4, opacity: 0.4 },
  navItemActive: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navItemIcon: { fontSize: 20, marginBottom: 2 },
  navItemLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navItemLabelActive: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
