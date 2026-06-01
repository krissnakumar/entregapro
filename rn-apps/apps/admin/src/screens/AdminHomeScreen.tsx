import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useAuthStore,
  useAnalytics,
  useNotifications,
  useMarkAllNotificationsRead,
  useNotificationStore,
  colors,
  borderRadius,
  shadows,
  typography,
  formatCurrency,
} from '@rn-apps/shared';

const NAV_GROUPS = [
  {
    title: 'Operações',
    items: [
      { name: 'Dashboard', screen: 'AdminHome', icon: '📊' },
      { name: 'Entregas', screen: 'Deliveries', icon: '📋' },
    ],
  },
  {
    title: 'Logística',
    items: [
      { name: 'Clientes', screen: 'Customers', icon: '🏢' },
      { name: 'Motoristas', screen: 'Drivers', icon: '👤' },
      { name: 'Frota', screen: 'Vehicles', icon: '🚛' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { name: 'Faturas', screen: 'Invoices', icon: '💰' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Usuários', screen: 'UsersManagement', icon: '🔐' },
      { name: 'Configurações', screen: 'Settings', icon: '⚙️' },
    ],
  },
];

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: analytics, isLoading, error } = useAnalytics();
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const displayNotifications = (storeNotifications.length > 0 ? storeNotifications : notifications) || [];

  const handleLogout = () => {
    Alert.alert('Encerrar Sessão', 'Deseja sair do painel administrativo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const navigateTo = (screen: string) => {
    setShowSidebar(false);
    if (screen !== 'AdminHome') {
      navigation.navigate(screen);
    }
  };

  const kpis = analytics || {
    totalDeliveriesToday: 0,
    trucksOnRoute: 0,
    delayedDeliveries: 0,
    activeDrivers: 0,
    completedDeliveries: 0,
    revenueToday: 0,
    fuelCostToday: 0,
    deliverySuccessRate: 0,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {showSidebar && (
        <TouchableOpacity style={styles.backdrop} onPress={() => setShowSidebar(false)}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogo}>
                <Text style={styles.sidebarLogoText}>EP</Text>
              </View>
              <Text style={styles.sidebarBrand}>EntregaPRO</Text>
              <Text style={styles.sidebarRole}>ADMIN</Text>
            </View>

            <ScrollView style={styles.sidebarNav}>
              {NAV_GROUPS.map((group) => (
                <View key={group.title} style={styles.navGroup}>
                  <Text style={styles.navGroupTitle}>{group.title}</Text>
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item.screen}
                      style={styles.navItem}
                      onPress={() => navigateTo(item.screen)}
                    >
                      <Text style={styles.navItemIcon}>{item.icon}</Text>
                      <Text style={styles.navItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>🚪 Encerrar Sessão</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.menuBtn}>
          <Text style={styles.menuBtnText}>☰</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerGreeting}>
            {user?.name || 'Administrador'}
          </Text>
          <View style={styles.headerStatus}>
            <View style={styles.headerStatusDot} />
            <Text style={styles.headerStatusText}>Sistemas Operacionais Conectados</Text>
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
          <TouchableOpacity onPress={handleLogout}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'A'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>📊 Visão Geral</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando indicadores...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>Erro ao carregar dados. Puxe para recarregar.</Text>
          </View>
        ) : (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Entregas Hoje</Text>
              <Text style={styles.kpiValue}>{kpis.totalDeliveriesToday}</Text>
              <Text style={styles.kpiTrend}>últimas 24h</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Em Trânsito</Text>
              <Text style={styles.kpiValue}>{kpis.trucksOnRoute}</Text>
              <Text style={styles.kpiTrend}>frota ativa</Text>
            </View>
            <View style={[styles.kpiCard, kpis.delayedDeliveries > 0 && styles.kpiCardWarning]}>
              <Text style={styles.kpiLabel}>Atrasos</Text>
              <Text style={[styles.kpiValue, kpis.delayedDeliveries > 0 && { color: '#DC2626' }]}>
                {kpis.delayedDeliveries}
              </Text>
              <Text style={styles.kpiTrend}>requer atenção</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Motoristas</Text>
              <Text style={styles.kpiValue}>{kpis.activeDrivers}</Text>
              <Text style={styles.kpiTrend}>online</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Concluídas</Text>
              <Text style={styles.kpiValue}>{kpis.completedDeliveries}</Text>
              <Text style={styles.kpiTrend}>{kpis.deliverySuccessRate}% sucesso</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Receita</Text>
              <Text style={[styles.kpiValue, { fontSize: 16 }]}>
                {formatCurrency(kpis.revenueToday)}
              </Text>
              <Text style={styles.kpiTrend}>combustível: {formatCurrency(kpis.fuelCostToday)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Deliveries')}
          >
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={styles.quickLabel}>Entregas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Customers')}
          >
            <Text style={styles.quickIcon}>🏢</Text>
            <Text style={styles.quickLabel}>Clientes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Vehicles')}
          >
            <Text style={styles.quickIcon}>🚛</Text>
            <Text style={styles.quickLabel}>Veículos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Invoices')}
          >
            <Text style={styles.quickIcon}>💰</Text>
            <Text style={styles.quickLabel}>Faturas</Text>
          </TouchableOpacity>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 50,
  },
  sidebar: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
    backgroundColor: colors.white, shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  sidebarHeader: {
    padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: '#F8FAFC',
  },
  sidebarLogo: {
    width: 40, height: 40, backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  sidebarLogoText: { fontSize: 16, fontWeight: '900', color: colors.white },
  sidebarBrand: { fontSize: 16, fontWeight: '900', color: colors.text },
  sidebarRole: { fontSize: 9, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 },
  sidebarNav: { flex: 1, padding: 16 },
  navGroup: { marginBottom: 20 },
  navGroupTitle: { fontSize: 9, fontWeight: '800', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, paddingHorizontal: 4 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: borderRadius.md,
  },
  navItemIcon: { fontSize: 16 },
  navItemText: { fontSize: 13, fontWeight: '600', color: colors.text },
  sidebarFooter: { padding: 16, borderTopWidth: 1, borderTopColor: colors.borderLight },
  logoutBtn: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: borderRadius.md },
  logoutBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  menuBtn: { padding: 10, backgroundColor: colors.background, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  menuBtnText: { fontSize: 18 },
  headerGreeting: { fontSize: 14, fontWeight: '800', color: colors.text },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  headerStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  headerStatusText: { fontSize: 9, fontWeight: '600', color: colors.textSecondary },
  avatar: {
    width: 36, height: 36, backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '900', color: colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 20 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  errorContainer: { alignItems: 'center', paddingVertical: 40 },
  errorIcon: { fontSize: 32, marginBottom: 8 },
  errorText: { fontSize: 14, color: colors.error, textAlign: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  kpiCard: {
    width: '48%', backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: 16, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  kpiCardWarning: { borderColor: '#FECACA', backgroundColor: '#FFFBF9' },
  kpiLabel: { fontSize: 9, fontWeight: '800', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  kpiValue: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 4 },
  kpiTrend: { fontSize: 9, color: colors.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.sm,
  },
  quickIcon: { fontSize: 28, marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
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
  modalOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end', zIndex: 999,
  },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '80%', padding: 20, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
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
