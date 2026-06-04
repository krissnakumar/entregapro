import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useAuthStore,
  useCreateFuelRequest,
  useFuelLogs,
  colors,
  borderRadius,
  shadows,
} from '@rn-apps/shared';

function formatFuelSequence(value?: string) {
  if (!value) return 'Sequencial';
  const digits = value.match(/\d+/g)?.join('');
  return digits || value;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [odometer, setOdometer] = useState('');
  
  // Fuel Logs hooks
  const { data: logs, refetch: refetchLogs } = useFuelLogs();
  const createFuelRequest = useCreateFuelRequest();

  // Filter logs for the current driver
  const driverLogs = logs?.filter((log) => log.driver?.userId === user?.id) || [];

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Deseja realmente sair do terminal?');
      if (confirmLogout) {
        logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } else {
      Alert.alert('Encerrar Sessão', 'Deseja realmente sair do terminal?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]);
    }
  };

  const handleRequestFuel = () => {
    if (!odometer) {
      Alert.alert('Erro', 'Por favor, informe a quilometragem do odômetro.');
      return;
    }
    const odoNum = Number(odometer);
    if (isNaN(odoNum) || odoNum <= 0) {
      Alert.alert('Erro', 'Odômetro inválido.');
      return;
    }
    createFuelRequest.mutate(
      { odometer: odoNum },
      {
        onSuccess: () => {
          Alert.alert('Sucesso', 'Sua solicitação de abastecimento foi enviada ao despachante!');
          setShowFuelModal(false);
          setOdometer('');
          refetchLogs();
        },
        onError: (err: any) => {
          Alert.alert('Erro', err.response?.data?.message || err.message || 'Falha ao enviar solicitação.');
        },
      }
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes da Cabine</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'M'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name || 'Motorista'}</Text>
            <Text style={styles.profileRole}>CNH Categoria E — Frota Ativa</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Modo Offline</Text>
            <View style={styles.settingBadge}>
              <Text style={styles.settingBadgeText}>Ativo</Text>
            </View>
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Roteamento OSRM</Text>
            <Text style={styles.settingValue}>v4.1.2</Text>
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Sincronização</Text>
            <Text style={styles.settingValue}>A cada 5 min</Text>
          </View>
        </View>

        {/* Fuel Button */}
        <TouchableOpacity
          style={styles.fuelBtn}
          onPress={() => setShowFuelModal(true)}
        >
          <Text style={styles.fuelBtnText}>Solicitar Abastecimento ⛽</Text>
        </TouchableOpacity>

        {/* Sync Button */}
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => {
            if (Platform.OS === 'web') {
              window.alert('Banco de dados local SQLite otimizado.');
            } else {
              Alert.alert('Sincronizado', 'Banco de dados local SQLite otimizado.');
            }
          }}
        >
          <Text style={styles.syncBtnText}>Sincronizar Cargas</Text>
        </TouchableOpacity>

        {/* Fuel History Section */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Histórico de Abastecimentos</Text>
          {driverLogs.length === 0 ? (
            <Text style={styles.noHistoryText}>Nenhum abastecimento solicitado recentemente.</Text>
          ) : (
            driverLogs.map((log) => (
              <View key={log.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyCardDate}>
                    {new Date(log.createdAt || log.fillDate).toLocaleString('pt-BR')}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      log.status === 'APPROVED'
                        ? styles.statusApproved
                        : log.status === 'PENDING'
                        ? styles.statusPending
                        : styles.statusRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        log.status === 'APPROVED'
                          ? styles.statusApprovedText
                          : log.status === 'PENDING'
                          ? styles.statusPendingText
                          : styles.statusRejectedText,
                      ]}
                    >
                      {log.status === 'APPROVED'
                        ? 'APROVADO'
                        : log.status === 'PENDING'
                        ? 'PENDENTE'
                        : 'RECUSADO'}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyCardDivider} />
                <View style={styles.historyCardBody}>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>Odômetro:</Text>
                    <Text style={styles.historyValue}>{log.odometer} KM</Text>
                  </View>
                  {log.status === 'APPROVED' && (
                    <>
                      <View style={styles.historyRow}>
                        <Text style={styles.historyLabel}>Nº:</Text>
                        <Text style={styles.historyValueCode}>{formatFuelSequence(log.jobNumber)}</Text>
                      </View>
                      <View style={styles.historyRow}>
                        <Text style={styles.historyLabel}>Posto:</Text>
                        <Text style={styles.historyValue}>{log.stationName || 'N/A'}</Text>
                      </View>
                      <View style={styles.historyRow}>
                        <Text style={styles.historyLabel}>Qtd Abastecida:</Text>
                        <Text style={styles.historyValue}>{log.litersFilled} Litros</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Fuel Request Modal */}
      {showFuelModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Solicitar Abastecimento</Text>
            <Text style={styles.modalDescription}>
              Informe a quilometragem atual do odômetro do veículo para que o despachante aprove o abastecimento.
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: 124500"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={odometer}
              onChangeText={setOdometer}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setShowFuelModal(false);
                  setOdometer('');
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleRequestFuel}
              >
                <Text style={styles.modalBtnConfirmText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('DriverHome')}>
          <Text style={styles.navItemIcon}>📋</Text>
          <Text style={styles.navItemLabel}>Manifestos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItemActive}>
          <Text style={styles.navItemIcon}>👤</Text>
          <Text style={styles.navItemLabelActive}>Sistema</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
  },
  backBtn: { paddingVertical: 8, paddingRight: 12 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  headerTitle: { fontSize: 13, fontWeight: '800', color: colors.white, textTransform: 'uppercase', letterSpacing: 1 },
  logoutText: { fontSize: 12, fontWeight: '700', color: '#FCA5A5' },
  scroll: { flex: 1, marginBottom: 70 },
  scrollContent: { paddingBottom: 24 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    margin: 20,
    padding: 20,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: colors.white },
  profileName: { fontSize: 16, fontWeight: '800', color: colors.text },
  profileRole: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, marginTop: 2 },
  settingsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  settingBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  settingBadgeText: { fontSize: 10, fontWeight: '700', color: colors.success },
  settingValue: { fontSize: 12, fontWeight: '600', color: colors.textTertiary },
  settingDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: 20 },
  fuelBtn: {
    backgroundColor: '#059669',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  fuelBtnText: { fontSize: 12, fontWeight: '800', color: colors.white, textTransform: 'uppercase', letterSpacing: 1 },
  syncBtn: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncBtnText: { fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 1 },
  historySection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  noHistoryText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCardDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusApprovedText: {
    color: '#059669',
  },
  statusPendingText: {
    color: '#D97706',
  },
  statusRejectedText: {
    color: '#DC2626',
  },
  historyCardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 8,
  },
  historyCardBody: {
    gap: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  historyValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '800',
  },
  historyValueCode: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '85%',
    padding: 24,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalBtnConfirm: {
    backgroundColor: '#059669',
  },
  modalBtnConfirmText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
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
  navItemLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  navItemLabelActive: { fontSize: 9, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
});
