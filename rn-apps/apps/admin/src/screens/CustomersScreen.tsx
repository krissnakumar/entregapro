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
import { useCustomers, colors, borderRadius, shadows, formatPhone } from '@rn-apps/shared';

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data: customersRaw, isLoading } = useCustomers();

  const customers = Array.isArray(customersRaw)
    ? customersRaw
    : (customersRaw as any)?.data || [];

  const filtered = customers.filter(
    (c: any) => c.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Clientes</Text>
        <TouchableOpacity>
          <Text style={styles.addBtn}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar clientes..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((c: any) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardAddress}>{c.address}</Text>
                  {c.city && <Text style={styles.cardCity}>{c.city}</Text>}
                  {c.phone && <Text style={styles.cardPhone}>{formatPhone(c.phone)}</Text>}
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
  cardLeft: { flexDirection: 'row', gap: 12 },
  cardIcon: { width: 44, height: 44, backgroundColor: colors.primaryBg, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { fontSize: 20 },
  cardName: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 2 },
  cardAddress: { fontSize: 11, color: colors.textSecondary },
  cardCity: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  cardPhone: { fontSize: 11, fontWeight: '600', color: colors.primary, marginTop: 4 },
});
