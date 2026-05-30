import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore, colors, borderRadius, shadows } from '@rn-apps/shared';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
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

      {/* Sync Button */}
      <TouchableOpacity style={styles.syncBtn} onPress={() => Alert.alert('Sincronizado', 'Banco de dados local SQLite otimizado.')}>
        <Text style={styles.syncBtnText}>Sincronizar Cargas</Text>
      </TouchableOpacity>

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
  syncBtn: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncBtnText: { fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 1 },
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
