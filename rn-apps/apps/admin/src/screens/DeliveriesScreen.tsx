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
import { useDeliveries, colors, borderRadius, shadows, getStatusColor, getStatusBg, getStatusLabel } from '@rn-apps/shared';

export default function DeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data: deliveries, isLoading } = useDeliveries();

  const filtered = (deliveries || []).filter((d: any) =>
    d.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.deliveryNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Entregas</Text>
        <TouchableOpacity>
          <Text style={styles.addBtn}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar entregas..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando entregas...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma entrega encontrada</Text>
          </View>
        ) : (
          filtered.map((delivery: any) => {
            const sColor = getStatusColor(delivery.status);
            const sBg = getStatusBg(delivery.status);
            const sLabel = getStatusLabel(delivery.status);

            return (
              <View key={delivery.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.deliveryNumber}>{delivery.deliveryNumber}</Text>
                  <View style={[styles.statusChip, { backgroundColor: sBg }]}>
                    <View style={[styles.statusDot, { backgroundColor: sColor }]} />
                    <Text style={[styles.statusLabel, { color: sColor }]}>{sLabel}</Text>
                  </View>
                </View>
                <Text style={styles.customerName}>{delivery.customer?.name}</Text>
                <View style={styles.detailsRow}>
                  {delivery.driver && <Text style={styles.detail}>🚚 {delivery.driver?.user?.name || delivery.driver?.name || ''}</Text>}
                  {delivery.materialType && <Text style={styles.detail}>📦 {delivery.materialType}</Text>}
                </View>
                {delivery.scheduledTime && (
                  <Text style={styles.schedule}>
                    {new Date(delivery.scheduledTime).toLocaleDateString('pt-BR')}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  deliveryNumber: { fontSize: 12, fontWeight: '800', color: colors.text, fontFamily: 'monospace' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  customerName: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  detail: { fontSize: 11, color: colors.textSecondary },
  schedule: { fontSize: 10, color: colors.textTertiary, fontFamily: 'monospace' },
});
