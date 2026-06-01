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
import { useVehicles, colors, borderRadius, shadows } from '@rn-apps/shared';

export default function VehiclesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data: vehicles, isLoading } = useVehicles();

  const filtered = (vehicles || []).filter((v: any) =>
    v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.type?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Frota</Text>
        <TouchableOpacity>
          <Text style={styles.addBtn}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar veículos..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando veículos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((v: any) => (
            <View key={v.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Text style={styles.iconText}>🚛</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.vehicleNumber}>{v.vehicleNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: v.active ? '#ECFDF5' : '#F3F4F6' }]}>
                      <Text style={[styles.statusText, { color: v.active ? colors.success : colors.textTertiary }]}>
                        {v.active ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.vehicleDetail}>
                    {[v.type, v.capacity, v.fuelType].filter(Boolean).join(' · ')}
                  </Text>
                  {v.driver && <Text style={styles.driverAssigned}>Motorista: {v.driver?.user?.name || v.driver?.name || ''}</Text>}
                </View>
              </View>
            </View>
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
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconBox: {
    width: 44, height: 44, backgroundColor: '#EFF6FF', borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  iconText: { fontSize: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  vehicleNumber: { fontSize: 14, fontWeight: '800', color: colors.text, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  vehicleDetail: { fontSize: 11, color: colors.textSecondary },
  driverAssigned: { fontSize: 10, color: colors.primary, fontWeight: '600', marginTop: 4 },
});
