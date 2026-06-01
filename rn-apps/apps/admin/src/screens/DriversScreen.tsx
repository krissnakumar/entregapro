import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDrivers, colors, borderRadius, shadows } from '@rn-apps/shared';

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data: drivers, isLoading } = useDrivers();

  const filtered = (drivers || []).filter((d: any) =>
    (d.user?.name || d.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Motoristas</Text>
        <TouchableOpacity>
          <Text style={styles.addBtn}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar motoristas..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando motoristas...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((d: any) => {
            const driverName = d.user?.name || d.name || '';
            const isActive = d.isOnline ?? d.active ?? false;
            const vehiclePlate = d.vehicle?.vehicleNumber || d.vehicle?.plate || '';
            return (
            <View key={d.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarText}>{driverName?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isActive ? colors.success : colors.muted },
                      ]}
                    />
                  </View>
                  {d.phone && <Text style={styles.driverDetail}>{d.phone}</Text>}
                </View>
                {vehiclePlate && (
                  <View style={styles.vehicleBadge}>
                    <Text style={styles.vehicleBadgeText}>{vehiclePlate}</Text>
                  </View>
                )}
              </View>
              {d.licenseNumber && <Text style={styles.driverLicense}>{d.licenseNumber}</Text>}
            </View>
            );
          })}
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
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  avatarSmall: {
    width: 44, height: 44, backgroundColor: '#EEF2FF', borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverName: { fontSize: 14, fontWeight: '800', color: colors.text },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  driverDetail: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  vehicleBadge: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0',
  },
  vehicleBadgeText: { fontSize: 10, fontWeight: '700', color: colors.text, fontFamily: 'monospace' },
  driverLicense: { fontSize: 10, color: colors.textTertiary, fontFamily: 'monospace' },
});
