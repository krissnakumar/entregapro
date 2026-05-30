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
import { useInvoices, colors, borderRadius, shadows, formatCurrency } from '@rn-apps/shared';

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data: invoices, isLoading } = useInvoices();

  const filtered = (invoices || []).filter((inv: any) =>
    inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    (inv.vendor || inv.customer?.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PROCESSED': return { bg: '#ECFDF5', text: colors.success };
      case 'PENDING': return { bg: '#FFFBEB', text: '#D97706' };
      case 'ERROR': return { bg: '#FEF2F2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: colors.textTertiary };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Faturas</Text>
        <TouchableOpacity>
          <Text style={styles.addBtn}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar faturas..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando faturas...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((inv: any) => {
            const s = getStatusStyle(inv.status);
            return (
              <View key={inv.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.text }]}>{inv.status}</Text>
                  </View>
                </View>
                <Text style={styles.vendorName}>{inv.vendor || inv.customer?.name || '-'}</Text>
                <View style={styles.cardBottom}>
                  <Text style={styles.amount}>{formatCurrency(inv.totalAmount || inv.amount || 0)}</Text>
                  {inv.date && <Text style={styles.date}>{inv.date}</Text>}
                </View>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  invoiceNumber: { fontSize: 12, fontWeight: '800', color: colors.text, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  vendorName: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: '900', color: colors.primary },
  date: { fontSize: 11, color: colors.textTertiary },
});
