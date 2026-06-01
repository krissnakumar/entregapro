import React, { useState, useCallback, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useAuthStore,
  useDriverDeliveries,
  useNotifications,
  useMarkAllNotificationsRead,
  useNotificationStore,
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
import { useOfflineStore } from '../store/offlineStore';
import { useNetworkSync } from '../hooks/useNetworkSync';

export default function DriverHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { cachedDeliveries, setCachedDeliveries } = useOfflineStore();
  const { isOffline, queueSize } = useNetworkSync();

  const queryResult = useDriverDeliveries();
  const isLoading = queryResult.isLoading;
  const refetch = queryResult.refetch;

  // Notification Hooks
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const displayNotifications = (storeNotifications.length > 0 ? storeNotifications : notifications) || [];
  const unreadCount = displayNotifications.filter((n: any) => !n.isRead).length || 0;

  // Sync loaded deliveries to local offline cache
  useEffect(() => {
    if (queryResult.data) {
      setCachedDeliveries(queryResult.data);
    }
  }, [queryResult.data, setCachedDeliveries]);

  // Fallback to cache if offline or loading fails
  const deliveries: Delivery[] = queryResult.data || cachedDeliveries || [];

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
    if (isOffline) {
      return; // Refreshing doesn't apply if offline
    }
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch, isOffline]);

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
    const formatted = cleaned.startsWith('55') && cleaned.length >= 12 ? cleaned : `55${cleaned}`;
    Linking.openURL(`https://wa.me/${formatted}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Offline Mode Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            📡 Modo Offline {queueSize > 0 ? `• Sync Pendente (${queueSize})` : ''}
          </Text>
        </View>
      )}

      {activeDelivery && user?.id && !isOffline && (
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
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => setShowNotifications(true)}
              style={styles.bellButton}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <Text style={styles.profileButtonText}>Perfil</Text>
            </TouchableOpacity>
          </View>
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
                  openWhatsApp(activeDelivery.customer?.phone || '')
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} enabled={!isOffline} />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manifestos do Dia</Text>
          <Text style={styles.sectionCount}>
            {pendingDeliveries?.length || 0} ordens
          </Text>
        </View>

        {isLoading && deliveries.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando manifestos...</Text>
          </View>
        )}

        {!isLoading && deliveries.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Nenhum manifesto hoje</Text>
            <Text style={styles.emptyText}>
              Você não possui entregas agendadas para hoje.
            </Text>
          </View>
        )}

        {deliveries.map((delivery) => {
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
                  {delivery.quantity && (
                    <Text style={styles.deliveryWeight}>{delivery.quantity}</Text>
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

      {/* Notifications Modal */}
      {showNotifications && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notificações</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {displayNotifications && displayNotifications.length > 0 ? (
                displayNotifications.map((n: any) => (
                  <View
                    key={n.id}
                    style={[
                      styles.notificationItem,
                      !n.isRead && styles.notificationItemUnread,
                    ]}
                  >
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{n.title}</Text>
                      {!n.isRead && <View style={styles.notificationUnreadDot} />}
                    </View>
                    <Text style={styles.notificationMessage}>{n.message}</Text>
                    <Text style={styles.notificationDate}>
                      {new Date(n.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyIcon}>🔔</Text>
                  <Text style={styles.modalEmptyText}>Nenhuma notificação</Text>
                </View>
              )}
            </ScrollView>

            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.modalMarkAllBtn}
                onPress={() => {
                  markAllRead.mutate();
                  Alert.alert('Sucesso', 'Todas as notificações marcadas como lidas.');
                }}
              >
                <Text style={styles.modalMarkAllText}>Marcar todas como lidas</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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
  offlineBanner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
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
  userName: { fontSize: 16, fontWeight: '800', color: colors.white, maxWidth: 120 },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  bellBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '900',
  },
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

  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalScroll: {
    maxHeight: 400,
  },
  notificationItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  notificationItemUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  notificationMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationDate: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalEmptyIcon: {
    fontSize: 36,
    marginBottom: 10,
    opacity: 0.5,
  },
  modalEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalMarkAllBtn: {
    backgroundColor: '#1E293B',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalMarkAllText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
