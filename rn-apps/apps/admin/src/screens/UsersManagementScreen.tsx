import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useUsers, colors, borderRadius, shadows, formatDate } from '@rn-apps/shared';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DISPATCHER: 'Despachante',
  DRIVER: 'Motorista',
  ACCOUNTANT: 'Financeiro',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#4F46E5',
  DISPATCHER: '#2563EB',
  DRIVER: '#059669',
  ACCOUNTANT: '#D97706',
};

export default function UsersManagementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useUsers();

  const filtered = (users || []).filter(
    (u: any) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Usuários</Text>
        <TouchableOpacity>
          <Text style={styles.addBtn}>+ Convidar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar usuários..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando usuários...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((user: any) => (
            <TouchableOpacity
              key={user.id}
              style={styles.card}
              onPress={() => Alert.alert('Gerenciar', `Editar permissões de ${user.name}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarText}>{user.name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: `${ROLE_COLORS[user.role] || '#6B7280'}15` },
                  ]}
                >
                  <Text
                    style={[styles.roleText, { color: ROLE_COLORS[user.role] || '#6B7280' }]}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: user.active ? colors.success : colors.muted },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </Text>
                </View>
                {user.lastLoginAt && (
                  <Text style={styles.lastAccess}>
                    Último acesso: {formatDate(user.lastLoginAt)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { fontSize: 14, fontWeight: '700', color: colors.text },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  addBtn: { fontSize: 13, fontWeight: '700', color: colors.primary },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text,
  },
  loadingContainer: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  avatarSmall: {
    width: 44, height: 44, backgroundColor: colors.primaryBg, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  userName: { fontSize: 14, fontWeight: '800', color: colors.text },
  userEmail: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  roleText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, color: colors.textSecondary },
  lastAccess: { fontSize: 9, color: colors.textTertiary },
});
