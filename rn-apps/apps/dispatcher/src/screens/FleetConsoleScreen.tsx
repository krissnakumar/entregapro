import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useAuthStore,
  useDispatchOrders,
  useNotifications,
  useMarkAllNotificationsRead,
  useNotificationStore,
  colors,
  borderRadius,
  shadows,
  getStatusLabel,
  getStatusColor,
  getStatusBg,
} from '@rn-apps/shared';

type DispatchAssignment = {
  id: string;
  orderId?: string;
  orderNumber?: string;
  deliveryCount: number;
  primaryDeliveryNumber?: string;
  primaryCustomerName: string;
  primaryDestination: string;
  driverName: string;
  truckLabel: string;
  materialSummary: string;
  invoiceCount: number;
  invoicePreview: string[];
  scheduledLabel: string;
  statusValue: string;
  delayed: boolean;
  rawTrip: any;
  rawDelivery: any;
};

export default function FleetConsoleScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout, user } = useAuthStore();
  const { data: orders, isLoading } = useDispatchOrders();
  const [showNav, setShowNav] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const displayNotifications = (storeNotifications.length > 0 ? storeNotifications : notifications) || [];

  const dispatchAssignments = useMemo<DispatchAssignment[]>(() => {
    const formatDate = (value?: string) => {
      if (!value) return 'Sem agenda';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return 'Sem agenda';
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (orders || []).map((trip: any, tripIndex: number) => {
      const deliveries = trip.deliveries?.length ? trip.deliveries : [trip];

      const firstDelivery = deliveries[0] || trip;
      const allInvoices = deliveries.flatMap(
        (delivery: any) => delivery.invoices || delivery.items || [],
      );
      const fallbackInvoices = allInvoices.length > 0 ? allInvoices : trip.invoices || trip.items || [];
      const driverName =
        firstDelivery.driver?.user?.name ||
        firstDelivery.driver?.name ||
        trip.driver?.user?.name ||
        trip.driver?.name ||
        trip.assignedDriver ||
        'Sem motorista';
      const truckLabel =
        firstDelivery.vehicle?.vehicleNumber ||
        firstDelivery.vehicle?.plate ||
        trip.vehicle?.vehicleNumber ||
        trip.vehicle?.plate ||
        trip.assignedTruck ||
        'Sem veículo';
      const primaryCustomerName =
        firstDelivery.customer?.name ||
        trip.customer?.name ||
        fallbackInvoices[0]?.customer ||
        'Cliente não informado';
      const primaryDestination =
        firstDelivery.deliveryAddress ||
        firstDelivery.customer?.address ||
        trip.deliveryAddress ||
        trip.destination ||
        trip.primaryDestination ||
        'Destino não informado';
      const materialSummary = Array.from(
        new Set(
          deliveries
            .map(
              (delivery: any) =>
                delivery.materialType ||
                delivery.invoices?.[0]?.material ||
                delivery.items?.[0]?.material ||
                fallbackInvoices[0]?.material ||
                fallbackInvoices[0]?.materialType,
            )
            .filter(Boolean),
        ),
      )
        .slice(0, 2)
        .join(' • ') || 'Material não informado';
      const statusValue =
        firstDelivery.status || firstDelivery.deliveryStatus || trip.status || 'PENDING';

      return {
        id: trip.id || firstDelivery.id || `trip-${tripIndex}`,
        orderId: trip.id,
        orderNumber: trip.orderNumber,
        deliveryCount: deliveries.length,
        primaryDeliveryNumber: firstDelivery.deliveryNumber,
        primaryCustomerName,
        primaryDestination,
        driverName,
        truckLabel,
        materialSummary,
        invoiceCount: fallbackInvoices.length,
        invoicePreview: fallbackInvoices
          .slice(0, 3)
          .map((inv: any) => inv.invoiceNumber || inv.number || inv.id)
          .filter(Boolean),
        scheduledLabel: formatDate(firstDelivery.scheduledTime || trip.createdAt),
        statusValue,
        delayed: !!trip.delayed || deliveries.some((delivery: any) => !!delivery.delayed),
        rawTrip: trip,
        rawDelivery: firstDelivery,
      };
    });
  }, [orders]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dispatchAssignments;

    return dispatchAssignments.filter((assignment) =>
      [
        assignment.driverName,
        assignment.truckLabel,
        assignment.primaryCustomerName,
        assignment.primaryDestination,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [dispatchAssignments, searchQuery]);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Deseja sair do console?');
      if (confirmLogout) {
        logout();
      }
    } else {
      Alert.alert('Encerrar Sessão', 'Deseja sair do console?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const trips = orders || [];
  const totalInvoices = trips.reduce((acc: number, t: any) => acc + (t.invoices?.length || 0), 0);
  const dispatcherName = user?.name || 'Despachante';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => setShowNav(!showNav)} style={styles.menuBtn}>
            <Text style={styles.menuBtnText}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerBrand}>
            <View style={styles.headerLogo}>
              <Text style={styles.headerLogoText}>DP</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Console de Armazém</Text>
              <Text style={styles.headerUserName}>{dispatcherName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
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
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.syncRow}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Sincronizado com Admin</Text>
        </View>
      </View>

      {showNav && (
        <TouchableOpacity style={styles.backdrop} onPress={() => setShowNav(false)}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Navegação</Text>
            <TouchableOpacity style={styles.drawerItemActive}>
              <Text style={styles.drawerItemText}>📊 Console ao Vivo</Text>
              <Text style={styles.drawerItemHint}>Entregas e prioridades</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                setShowNav(false);
                navigation.navigate('GpsMonitoring');
              }}
            >
              <Text style={styles.drawerItemText}>📍 Em Movimento</Text>
              <Text style={styles.drawerItemHint}>Rastreamento contínuo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                setShowNav(false);
                navigation.navigate('FuelControl');
              }}
            >
              <Text style={styles.drawerItemText}>⛽ Combustível</Text>
              <Text style={styles.drawerItemHint}>Controle de abastecimento</Text>
            </TouchableOpacity>
            <View style={styles.drawerSummary}>
              <Text style={styles.drawerSummaryLabel}>Resumo da Frota</Text>
              <View style={styles.drawerSummaryRow}>
                <Text style={styles.drawerSummaryKey}>Viagens:</Text>
                <Text style={styles.drawerSummaryValue}>{trips.length}</Text>
              </View>
              <View style={styles.drawerSummaryRow}>
                <Text style={styles.drawerSummaryKey}>Entregas:</Text>
                <Text style={styles.drawerSummaryValue}>{dispatchAssignments.length}</Text>
              </View>
              <View style={styles.drawerSummaryRow}>
                <Text style={styles.drawerSummaryKey}>Notas:</Text>
                <Text style={styles.drawerSummaryValue}>{totalInvoices}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchWrap}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar motorista"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>🚛 Painel de Entregas</Text>
            <Text style={styles.sectionSubtitle}>{filteredAssignments.length} motoristas em acompanhamento</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipText}>{totalInvoices} notas</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Carregando viagens...</Text>
          </View>
        ) : filteredAssignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Nenhum motorista encontrado</Text>
          </View>
        ) : (
          filteredAssignments.map((assignment) => {
            const statusColor = getStatusColor(assignment.statusValue);
            const statusBg = getStatusBg(assignment.statusValue);
            const statusLabel = getStatusLabel(assignment.statusValue);
            const rowId =
              assignment.primaryDeliveryNumber ||
              assignment.orderNumber ||
              assignment.id.slice(0, 8);

            return (
              <TouchableOpacity
                key={assignment.id}
                style={[styles.deliveryCard, assignment.delayed && styles.deliveryCardDelayed]}
                onPress={() =>
                  navigation.navigate('DeliveryDetail', {
                    trip: assignment.rawTrip,
                    delivery: assignment.rawDelivery,
                    row: assignment,
                  })
                }
                activeOpacity={0.8}
              >
                <View style={styles.deliveryTop}>
                  <View style={styles.deliveryIdentity}>
                    <Text style={styles.deliveryId}>{rowId}</Text>
                    <Text style={styles.driverName}>{assignment.driverName}</Text>
                    <Text style={styles.deliveryCustomer} numberOfLines={1}>
                      {assignment.primaryCustomerName}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>

                <Text style={styles.deliveryDestination} numberOfLines={2}>
                  {assignment.primaryDestination}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaMono}>{assignment.truckLabel}</Text>
                  <Text style={styles.metaDivider}>•</Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {assignment.materialSummary}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metricBadge}>
                    <Text style={styles.metricBadgeText}>
                      {assignment.deliveryCount} {assignment.deliveryCount === 1 ? 'entrega' : 'entregas'}
                    </Text>
                  </View>
                  <View style={styles.metricBadge}>
                    <Text style={styles.metricBadgeText}>
                      {assignment.invoiceCount} {assignment.invoiceCount === 1 ? 'nota' : 'notas'}
                    </Text>
                  </View>
                </View>

                <View style={styles.deliveryFooter}>
                  <Text style={styles.footerLabel}>{assignment.scheduledLabel}</Text>
                  <Text style={styles.footerLabel} numberOfLines={1}>
                    {assignment.invoicePreview.join(', ') || 'Sem notas'}
                  </Text>
                </View>

                {assignment.delayed ? (
                  <View style={styles.delayBanner}>
                    <Text style={styles.delayBannerText}>Atraso em acompanhamento</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footerMenu, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.footerItemActive}>
          <Text style={styles.footerItemIcon}>🏠</Text>
          <Text style={styles.footerItemTextActive}>Painel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('GpsMonitoring')}
        >
          <Text style={styles.footerItemIcon}>📍</Text>
          <Text style={styles.footerItemText}>Rota</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('FuelControl')}
        >
          <Text style={styles.footerItemIcon}>⛽</Text>
          <Text style={styles.footerItemText}>Combustível</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => setShowNotifications(true)}
        >
          <Text style={styles.footerItemIcon}>🔔</Text>
          <Text style={styles.footerItemText}>Alertas</Text>
        </TouchableOpacity>
      </View>

      {showNotifications && (
        <View style={styles.modalOverlay}>
          <View style={styles.notifModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitleNotif}>Notificações</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {displayNotifications.length > 0 ? (
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
                  if (Platform.OS === 'web') {
                    window.alert('Todas as notificações marcadas como lidas.');
                  } else {
                    Alert.alert('Sucesso', 'Todas as notificações marcadas como lidas.');
                  }
                }}
              >
                <Text style={styles.modalMarkAllText}>Marcar todas como lidas</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuBtn: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuBtnText: { fontSize: 18 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: {
    width: 36,
    height: 36,
    backgroundColor: '#2563EB',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoText: { fontSize: 14, fontWeight: '900', color: colors.white },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  headerUserName: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  bellIcon: { fontSize: 16 },
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
    borderColor: colors.white,
  },
  bellBadgeText: { color: colors.white, fontSize: 8, fontWeight: '900' },
  logoutBtn: { padding: 10 },
  logoutBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  syncText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 50,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    backgroundColor: colors.white,
    padding: 20,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  drawerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  drawerItemActive: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  drawerItemText: { fontSize: 14, fontWeight: '700', color: colors.text },
  drawerItemHint: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  drawerSummary: {
    marginTop: 24,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  drawerSummaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  drawerSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  drawerSummaryKey: { fontSize: 12, color: colors.textSecondary },
  drawerSummaryValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  searchWrap: { marginBottom: 16 },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.text,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  sectionSubtitle: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  summaryChip: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryChipText: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
  loadingContainer: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  deliveryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  deliveryCardDelayed: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBF9',
  },
  deliveryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  deliveryIdentity: { flex: 1 },
  deliveryId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 6,
  },
  deliveryCustomer: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 4 },
  deliveryDestination: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  metaText: { fontSize: 11, color: colors.textSecondary, flexShrink: 1 },
  metaMono: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaDivider: { color: colors.border },
  metricBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  metricBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerLabel: { fontSize: 10, fontWeight: '700', color: colors.textTertiary },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  delayBanner: {
    marginTop: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  delayBannerText: { fontSize: 9, fontWeight: '800', color: '#B91C1C' },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },
  notifModalContent: {
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
    marginBottom: 12,
  },
  modalTitleNotif: { fontSize: 18, fontWeight: '900', color: colors.text },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  modalScroll: { maxHeight: 400 },
  notificationItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  notificationItemUnread: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: { fontSize: 12, fontWeight: '800', color: colors.text },
  notificationUnreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  notificationMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationDate: { fontSize: 9, fontWeight: '600', color: colors.textTertiary },
  modalEmpty: { alignItems: 'center', paddingVertical: 40 },
  modalEmptyIcon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  modalEmptyText: { fontSize: 14, color: colors.textSecondary },
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
  footerMenu: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingTop: 10,
    ...shadows.sm,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
  },
  footerItemActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
  },
  footerItemIcon: { fontSize: 16, marginBottom: 4 },
  footerItemText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  footerItemTextActive: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
});
