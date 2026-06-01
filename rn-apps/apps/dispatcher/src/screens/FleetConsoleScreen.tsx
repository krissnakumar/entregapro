import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
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
  typography,
  getStatusLabel,
  getStatusColor,
  getStatusBg,
} from '@rn-apps/shared';

export default function FleetConsoleScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { data: orders, isLoading } = useDispatchOrders();
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showNav, setShowNav] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const displayNotifications = (storeNotifications.length > 0 ? storeNotifications : notifications) || [];

  const handleLogout = () => {
    Alert.alert('Encerrar Sessão', 'Deseja sair do console?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const trips = orders || [];
  const totalInvoices = trips.reduce((acc: number, t: any) => acc + (t.invoices?.length || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
              <Text style={styles.headerBadge}>DESPACHANTE</Text>
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

      {/* Navigation Side Drawer */}
      {showNav && (
        <TouchableOpacity style={styles.backdrop} onPress={() => setShowNav(false)}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Navegação</Text>
            <TouchableOpacity style={styles.drawerItemActive}>
              <Text style={styles.drawerItemText}>📊 Console ao Vivo</Text>
              <Text style={styles.drawerItemHint}>Frota e motoristas</Text>
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
            <View style={styles.drawerSummary}>
              <Text style={styles.drawerSummaryLabel}>Resumo da Frota</Text>
              <View style={styles.drawerSummaryRow}>
                <Text style={styles.drawerSummaryKey}>Viagens:</Text>
                <Text style={styles.drawerSummaryValue}>{trips.length}</Text>
              </View>
              <View style={styles.drawerSummaryRow}>
                <Text style={styles.drawerSummaryKey}>Notas:</Text>
                <Text style={styles.drawerSummaryValue}>{totalInvoices}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Main Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>ℹ️</Text>
          <Text style={styles.infoBannerText}>
            Exibição das viagens priorizando Motorista e Veículo. Notas sincronizadas do plano logístico da central Admin.
          </Text>
          <View style={styles.infoBannerBadge}>
            <Text style={styles.infoBannerBadgeText}>FOCO NO MOTORISTA</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚛 Viagens Alocadas</Text>
          <Text style={styles.sectionSubtitle}>Console de Operações</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Carregando viagens...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Nenhuma viagem alocada no momento</Text>
          </View>
        ) : (
          trips.map((trip: any) => {
            const sColor = getStatusColor(trip.status || trip.deliveryStatus);
            const sBg = getStatusBg(trip.status || trip.deliveryStatus);
            const sLabel = getStatusLabel(trip.status || trip.deliveryStatus);

            return (
              <TouchableOpacity
                key={trip.id}
                style={[styles.tripCard, trip.delayed && styles.tripCardDelayed]}
                onPress={() => setSelectedTrip(trip)}
                activeOpacity={0.7}
              >
                <View style={styles.tripHeader}>
                  <View style={styles.tripDriverRow}>
                    <View style={styles.tripBadge}>
                      <Text style={styles.tripBadgeText}>VIAGEM</Text>
                    </View>
                    <Text style={styles.tripDriver}>{trip.driver?.name || trip.assignedDriver}</Text>
                    <Text style={styles.tripSep}>|</Text>
                    <Text style={styles.tripTruck}>{trip.vehicle?.plate || trip.assignedTruck}</Text>
                  </View>
                  <Text style={styles.tripDestination} numberOfLines={1}>
                    📍 {trip.deliveryAddress || trip.destination || trip.primaryDestination}
                  </Text>
                </View>

                <View style={styles.invoicesRow}>
                  <Text style={styles.invoicesLabel}>Notas ({(trip.invoices || trip.items || []).length}):</Text>
                  {(trip.invoices || trip.items || []).slice(0, 3).map((inv: any, idx: number) => (
                    <View key={idx} style={styles.invoiceChip}>
                      <Text style={styles.invoiceChipText}>{inv.invoiceNumber || inv.number}</Text>
                      <Text style={styles.invoiceChipSep}>•</Text>
                      <Text style={styles.invoiceChipVol}>{inv.volume || inv.quantity}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.tripStatusRow, { backgroundColor: sBg }]}>
                  <View style={[styles.tripStatusDot, { backgroundColor: sColor }]} />
                  <Text style={[styles.tripStatusLabel, { color: sColor }]}>{sLabel}</Text>
                  {trip.delayed && (
                    <View style={styles.delayBadge}>
                      <Text style={styles.delayBadgeText}>ATRASO</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Notifications Modal */}
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
                  Alert.alert('Sucesso', 'Todas as notificações marcadas como lidas.');
                }}
              >
                <Text style={styles.modalMarkAllText}>Marcar todas como lidas</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Trip Detail Modal */}
      {selectedTrip && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notas da Viagem</Text>
              <TouchableOpacity onPress={() => setSelectedTrip(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {(selectedTrip.driver?.name || selectedTrip.assignedDriver)} — {(selectedTrip.vehicle?.plate || selectedTrip.assignedTruck)}
            </Text>

            <ScrollView style={styles.modalBody}>
              {(selectedTrip.invoices || selectedTrip.items || []).map((inv: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.invoiceDetailCard}
                  onPress={() => {
                    setSelectedTrip(null);
                    navigation.navigate('InvoiceInspection', { invoice: inv, trip: selectedTrip });
                  }}
                >
                  <View style={styles.invoiceDetailTop}>
                    <Text style={styles.invoiceDetailNumber}>{inv.invoiceNumber || inv.number}</Text>
                    <Text style={styles.invoiceDetailMetrics}>{inv.volume || inv.quantity} ({inv.weight || '-'})</Text>
                  </View>
                  <Text style={styles.invoiceDetailCustomer}>
                    Cliente: {selectedTrip.customer?.name || inv.customer}
                  </Text>
                  <Text style={styles.invoiceDetailMaterial}>{inv.material || inv.materialType}</Text>
                  <Text style={styles.invoiceDetailHint}>Toque para inspecionar →</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalFooter}>
              🔒 Sequenciamento atribuído pela central Admin
            </Text>
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
    padding: 10, backgroundColor: colors.background, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  menuBtnText: { fontSize: 18 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: {
    width: 36, height: 36, backgroundColor: '#2563EB', borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  headerLogoText: { fontSize: 14, fontWeight: '900', color: colors.white },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  headerBadge: {
    fontSize: 8, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase',
    letterSpacing: 1, backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 2,
  },
  logoutBtn: { padding: 10 },
  logoutBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  syncText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 50,
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 260,
    backgroundColor: colors.white, padding: 20, paddingTop: 60,
    shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  drawerTitle: { fontSize: 10, fontWeight: '800', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
  drawerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  drawerItemActive: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  drawerItemText: { fontSize: 14, fontWeight: '700', color: colors.text },
  drawerItemHint: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  drawerSummary: {
    marginTop: 24, backgroundColor: colors.background, borderRadius: borderRadius.lg,
    padding: 16,
  },
  drawerSummaryLabel: { fontSize: 9, fontWeight: '800', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  drawerSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  drawerSummaryKey: { fontSize: 12, color: colors.textSecondary },
  drawerSummaryValue: { fontSize: 12, fontWeight: '800', color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: borderRadius.xl, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 20, flexWrap: 'wrap',
  },
  infoBannerIcon: { fontSize: 16 },
  infoBannerText: { fontSize: 11, color: '#1E3A5F', fontWeight: '500', flex: 1 },
  infoBannerBadge: {
    backgroundColor: colors.white, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoBannerBadgeText: { fontSize: 8, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  sectionSubtitle: { fontSize: 10, color: colors.textTertiary },
  tripCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  tripCardDelayed: { borderColor: '#FECACA', backgroundColor: '#FFFBF9' },
  tripHeader: { marginBottom: 10 },
  tripDriverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  tripBadge: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  tripBadgeText: { fontSize: 8, fontWeight: '800', color: '#2563EB', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tripDriver: { fontSize: 12, fontWeight: '800', color: colors.text },
  tripSep: { color: colors.border },
  tripTruck: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tripDestination: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  invoicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8, alignItems: 'center' },
  invoicesLabel: { fontSize: 8, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' },
  invoiceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, borderWidth: 1, borderColor: colors.borderLight,
  },
  invoiceChipText: { fontSize: 9, fontWeight: '700', color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  invoiceChipSep: { color: colors.border },
  invoiceChipVol: { fontSize: 8, color: colors.textSecondary },
  tripStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start',
  },
  tripStatusDot: { width: 6, height: 6, borderRadius: 3 },
  tripStatusLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  delayBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3,
  },
  delayBadgeText: { fontSize: 7, fontWeight: '800', color: '#DC2626' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, zIndex: 100,
  },
  modal: {
    backgroundColor: colors.white, borderRadius: borderRadius['2xl'],
    maxHeight: '80%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  modalClose: { fontSize: 18, color: colors.textTertiary, padding: 4 },
  modalSubtitle: { fontSize: 11, color: colors.textSecondary, paddingHorizontal: 20, paddingTop: 12 },
  modalBody: { padding: 20 },
  invoiceDetailCard: {
    backgroundColor: colors.background, borderRadius: borderRadius.lg,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight,
  },
  invoiceDetailTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  invoiceDetailNumber: { fontSize: 11, fontWeight: '800', color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  invoiceDetailMetrics: { fontSize: 10, fontWeight: '700', color: colors.primary },
  invoiceDetailCustomer: { fontSize: 10, color: colors.textSecondary, marginBottom: 2 },
  invoiceDetailMaterial: { fontSize: 10, color: colors.text, fontWeight: '600' },
  invoiceDetailHint: { fontSize: 8, color: '#2563EB', fontWeight: '700', marginTop: 6 },
  modalFooter: { padding: 16, fontSize: 10, color: colors.textTertiary, textAlign: 'center', borderTopWidth: 1, borderTopColor: colors.borderLight },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellButton: {
    width: 36, height: 36, backgroundColor: colors.background,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, position: 'relative',
  },
  bellIcon: { fontSize: 16 },
  bellBadge: {
    position: 'absolute', top: -4, right: -4, backgroundColor: colors.error,
    borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.white,
  },
  bellBadgeText: { color: colors.white, fontSize: 8, fontWeight: '900' },
  notifModalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '80%', padding: 20, paddingBottom: 40,
  },
  modalTitleNotif: { fontSize: 18, fontWeight: '900', color: colors.text },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  modalCloseText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  modalScroll: { maxHeight: 400 },
  notificationItem: {
    backgroundColor: colors.background, borderRadius: borderRadius.lg,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight,
  },
  notificationItemUnread: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  notificationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: { fontSize: 12, fontWeight: '800', color: colors.text },
  notificationUnreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  notificationMessage: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  notificationDate: { fontSize: 9, fontWeight: '600', color: colors.textTertiary },
  modalEmpty: { alignItems: 'center', paddingVertical: 40 },
  modalEmptyIcon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  modalEmptyText: { fontSize: 14, color: colors.textSecondary },
  modalMarkAllBtn: {
    backgroundColor: '#1E293B', borderRadius: borderRadius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  modalMarkAllText: { color: colors.white, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
});
