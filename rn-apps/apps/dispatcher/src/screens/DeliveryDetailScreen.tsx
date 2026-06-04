import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  colors,
  borderRadius,
  shadows,
  getStatusLabel,
  getStatusColor,
  getStatusBg,
} from '@rn-apps/shared';

function buildResponsibilities(statusValue: string, delayed: boolean) {
  const normalized = String(statusValue || '').toUpperCase();

  if (normalized.includes('DELIVER')) {
    return [
      'Conferir comprovante, foto e observacoes finais.',
      'Validar se todas as notas chegaram ao destino correto.',
      'Fechar pendencias e sinalizar conclusao para a central.',
    ];
  }

  if (normalized.includes('TRANSIT') || normalized.includes('ROUTE')) {
    return [
      'Acompanhar a localizacao e responder desvios de rota.',
      'Atualizar cliente e operacao em caso de parada ou atraso.',
      delayed
        ? 'Escalar o atraso e revisar janela de entrega com o motorista.'
        : 'Manter contato com o motorista ate a confirmacao de chegada.',
    ];
  }

  return [
    'Confirmar motorista, veiculo e documentacao da carga.',
    'Garantir que notas e destino estejam coerentes antes da saida.',
    'Liberar acompanhamento e preparar tratativa para ocorrencias.',
  ];
}

export default function DeliveryDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { trip, delivery, row } = route.params || {};

  const details = useMemo(() => {
    const invoices = delivery?.invoices || delivery?.items || trip?.invoices || trip?.items || [];
    const customerName =
      row?.primaryCustomerName ||
      delivery?.customer?.name ||
      trip?.customer?.name ||
      invoices[0]?.customer ||
      'Cliente nao informado';
    const destination =
      row?.primaryDestination ||
      delivery?.deliveryAddress ||
      trip?.deliveryAddress ||
      trip?.destination ||
      trip?.primaryDestination ||
      'Destino nao informado';
    const driverName =
      row?.driverName ||
      delivery?.driver?.user?.name ||
      delivery?.driver?.name ||
      trip?.driver?.user?.name ||
      trip?.driver?.name ||
      trip?.assignedDriver ||
      'Sem motorista';
    const truckLabel =
      row?.truckLabel ||
      delivery?.vehicle?.vehicleNumber ||
      delivery?.vehicle?.plate ||
      trip?.vehicle?.vehicleNumber ||
      trip?.vehicle?.plate ||
      trip?.assignedTruck ||
      'Sem veiculo';
    const materialLabel =
      row?.materialSummary ||
      delivery?.materialType ||
      invoices[0]?.material ||
      invoices[0]?.materialType ||
      'Material nao informado';
    const quantityLabel =
      String(delivery?.quantity || invoices[0]?.quantity || invoices[0]?.volume || '-');
    const statusValue = row?.statusValue || delivery?.status || delivery?.deliveryStatus || trip?.status || 'PENDING';
    const delayed = !!row?.delayed || !!trip?.delayed || !!delivery?.delayed;
    const manifestNumber = row?.deliveryNumber || row?.orderNumber || delivery?.deliveryNumber || trip?.orderNumber || delivery?.id || trip?.id;
    const scheduledAt = row?.scheduledLabel || 'Sem agenda';

    return {
      invoices,
      customerName,
      destination,
      driverName,
      truckLabel,
      materialLabel,
      quantityLabel,
      statusValue,
      delayed,
      manifestNumber,
      scheduledAt,
      deliveryCount: row?.deliveryCount || (trip?.deliveries?.length || 1),
      responsibilities: buildResponsibilities(statusValue, delayed),
    };
  }, [delivery, row, trip]);

  const statusColor = getStatusColor(details.statusValue);
  const statusBg = getStatusBg(details.statusValue);
  const statusLabel = getStatusLabel(details.statusValue);

  const handleOpenFirstInvoice = () => {
    if (!details.invoices.length) {
      Alert.alert('Sem notas', 'Esta entrega ainda nao possui notas para inspecao.');
      return;
    }

    navigation.navigate('InvoiceInspection', {
      invoice: details.invoices[0],
      trip,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entrega</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIdentity}>
              <Text style={styles.heroLabel}>Motorista</Text>
              <Text style={styles.heroValue}>{details.driverName}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.customerName}>{details.truckLabel}</Text>
          <Text style={styles.destinationText}>
            Manifesto {details.manifestNumber} • {details.deliveryCount} {details.deliveryCount === 1 ? 'entrega' : 'entregas'}
          </Text>

          {details.delayed ? (
            <View style={styles.delayBanner}>
              <Text style={styles.delayBannerText}>Entrega com atraso em acompanhamento</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo operacional</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Cliente principal</Text>
              <Text style={styles.infoValue}>{details.customerName}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Motorista</Text>
              <Text style={styles.infoValue}>{details.driverName}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Veiculo</Text>
              <Text style={styles.infoValueMono}>{details.truckLabel}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Carga</Text>
              <Text style={styles.infoValue}>{details.materialLabel}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Quantidade</Text>
              <Text style={styles.infoValue}>{details.quantityLabel}</Text>
            </View>
            <View style={styles.infoCardWide}>
              <Text style={styles.infoLabel}>Destino principal</Text>
              <Text style={styles.infoValue}>{details.destination}</Text>
            </View>
            <View style={styles.infoCardWide}>
              <Text style={styles.infoLabel}>Agenda</Text>
              <Text style={styles.infoValue}>{details.scheduledAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acoes do despachante</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionCardPrimary} onPress={handleOpenFirstInvoice}>
              <Text style={styles.actionTitlePrimary}>Inspecionar notas</Text>
              <Text style={styles.actionHintPrimary}>
                {details.invoices.length} {details.invoices.length === 1 ? 'nota vinculada' : 'notas vinculadas'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('GpsMonitoring')}
            >
              <Text style={styles.actionTitle}>Rastreamento</Text>
              <Text style={styles.actionHint}>Acompanhar deslocamento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('FuelControl')}
            >
              <Text style={styles.actionTitle}>Combustivel</Text>
              <Text style={styles.actionHint}>Validar consumo e parada</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Papel do despachante</Text>
          <View style={styles.roleCard}>
            {details.responsibilities.map((item) => (
              <View key={item} style={styles.roleRow}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas fiscais</Text>
          {details.invoices.length > 0 ? (
            details.invoices.map((invoice: any, index: number) => (
              <TouchableOpacity
                key={invoice.id || invoice.number || index}
                style={styles.invoiceCard}
                onPress={() => navigation.navigate('InvoiceInspection', { invoice, trip })}
              >
                <View>
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber || invoice.number || `NF ${index + 1}`}</Text>
                  <Text style={styles.invoiceCustomer} numberOfLines={1}>
                    {invoice.customer || details.customerName}
                  </Text>
                </View>
                <Text style={styles.invoiceHint}>Abrir</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhuma nota vinculada a esta entrega.</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSpacer: { width: 60 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroIdentity: { flex: 1 },
  heroLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  customerName: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 14 },
  destinationText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  delayBanner: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  delayBannerText: { fontSize: 9, fontWeight: '800', color: '#B91C1C' },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 10 },
  infoGrid: { gap: 10 },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoCardWide: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  infoValueMono: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionRow: { gap: 10 },
  actionCardPrimary: {
    backgroundColor: '#1E3A8A',
    borderRadius: borderRadius.xl,
    padding: 16,
  },
  actionTitlePrimary: { fontSize: 13, fontWeight: '800', color: colors.white },
  actionHintPrimary: { fontSize: 11, color: '#DBEAFE', marginTop: 4 },
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionTitle: { fontSize: 12, fontWeight: '800', color: colors.text },
  actionHint: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  roleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  roleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 5,
  },
  roleText: { flex: 1, fontSize: 11, lineHeight: 17, color: colors.textSecondary },
  invoiceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  invoiceCustomer: { fontSize: 10, color: colors.textSecondary, marginTop: 4, maxWidth: 220 },
  invoiceHint: { fontSize: 10, fontWeight: '800', color: '#2563EB' },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyText: { fontSize: 11, color: colors.textSecondary },
});
