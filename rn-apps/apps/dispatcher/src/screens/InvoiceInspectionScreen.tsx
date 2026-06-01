import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, colors, borderRadius } from '@rn-apps/shared';

export default function InvoiceInspectionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { invoice, trip } = route.params || {};

  const [remark, setRemark] = useState('');

  const quickTags = [
    'Carga Conferida',
    'Lacre Checado',
    'Aviso de Frágil',
    'Revisar Documentação',
  ];

  const handleSave = async () => {
    try {
      if (remark.trim()) {
        await api.patch(`/invoices/${invoice.id || invoice.number}/remarks`, { remark: remark.trim() });
      }
      Alert.alert('Observação Salva', remark.trim()
        ? `Registro atualizado: "${remark}"`
        : 'Observação limpa.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a observação.');
    }
    navigation.goBack();
  };

  if (!invoice) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Nota fiscal não encontrada</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Nota</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Invoice Header */}
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceNumber}>{invoice.number}</Text>
          <View style={styles.invoiceBadge}>
            <Text style={styles.invoiceBadgeText}>NF-e</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Destinatário</Text>
          <Text style={styles.infoValue}>{invoice.customer}</Text>
        </View>

        {/* Material Details Grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Material</Text>
            <Text style={styles.gridValue}>{invoice.material}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Volume</Text>
            <Text style={styles.gridValue}>{invoice.volume}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Peso</Text>
            <Text style={styles.gridValue}>{invoice.weight}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Lacre</Text>
            <Text style={[styles.gridValue, { color: colors.success }]}>✓ Validado</Text>
          </View>
        </View>

        {/* Trip Context */}
        {trip && (
          <View style={styles.tripContext}>
            <Text style={styles.tripContextLabel}>Viagem Vinculada</Text>
            <Text style={styles.tripContextDriver}>
              🚛 {trip.assignedDriver} — {trip.assignedTruck}
            </Text>
            <Text style={styles.tripContextDest}>
              📍 {trip.primaryDestination}
            </Text>
          </View>
        )}

        {/* Security Notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>🛡️</Text>
          <Text style={styles.noticeText}>
            Parâmetros configurados pela central Admin. Conferência física obrigatória antes da liberação.
          </Text>
        </View>

        {/* Remarks Editor */}
        <View style={styles.remarksSection}>
          <View style={styles.remarksHeader}>
            <Text style={styles.remarksTitle}>Observações do Despachante</Text>
            <Text style={styles.remarksOptional}>Opcional</Text>
          </View>

          <TextInput
            style={styles.remarksInput}
            placeholder="Adicione uma observação..."
            placeholderTextColor={colors.textTertiary}
            value={remark}
            onChangeText={setRemark}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.tagsRow}>
            {quickTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tag}
                onPress={() => setRemark((prev) => (prev ? `${prev} | ${tag}` : tag))}
              >
                <Text style={styles.tagText}>+ {tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar Observação</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorText: { textAlign: 'center', marginTop: 40, color: colors.error, fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  headerTitle: { fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerSpacer: { width: 60 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  invoiceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  invoiceNumber: {
    fontSize: 20, fontWeight: '900', color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  invoiceBadge: {
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE',
  },
  invoiceBadgeText: { fontSize: 9, fontWeight: '800', color: '#4338CA', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoBlock: { marginBottom: 16 },
  infoLabel: { fontSize: 9, fontWeight: '800', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  gridItem: {
    width: '47%', backgroundColor: '#F8FAFC', borderRadius: borderRadius.lg,
    padding: 14, borderWidth: 1, borderColor: colors.borderLight,
  },
  gridLabel: { fontSize: 8, fontWeight: '800', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  gridValue: { fontSize: 12, fontWeight: '700', color: colors.text },
  tripContext: {
    backgroundColor: '#F8FAFC', borderRadius: borderRadius.lg,
    padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.borderLight,
  },
  tripContextLabel: { fontSize: 9, fontWeight: '800', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  tripContextDriver: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 4 },
  tripContextDest: { fontSize: 10, color: colors.textSecondary },
  notice: {
    flexDirection: 'row', gap: 10, backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.lg, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  noticeIcon: { fontSize: 16 },
  noticeText: { fontSize: 10, color: '#1E3A5F', fontWeight: '500', flex: 1, lineHeight: 16 },
  remarksSection: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: 20, borderWidth: 1, borderColor: colors.borderLight },
  remarksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  remarksTitle: { fontSize: 11, fontWeight: '800', color: colors.text },
  remarksOptional: { fontSize: 9, color: colors.textTertiary },
  remarksInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, padding: 14, fontSize: 13, color: colors.text,
    minHeight: 80, textAlignVertical: 'top',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 16 },
  tag: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight,
  },
  tagText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  saveBtn: {
    backgroundColor: '#EFF6FF', borderRadius: borderRadius.lg,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  saveBtnText: { fontSize: 12, fontWeight: '800', color: '#1D4ED8' },
});
