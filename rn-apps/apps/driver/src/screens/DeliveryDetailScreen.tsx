import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import {
  useAuthStore,
  useSubmitPOD,
  colors,
  borderRadius,
  shadows,
  typography,
  getStatusLabel,
  getStatusColor,
  getStatusBg,
  formatCurrency,
} from '@rn-apps/shared';
import type { Delivery } from '@rn-apps/shared';

export default function DeliveryDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const delivery: Delivery = route.params?.delivery;
  const { user } = useAuthStore();
  const submitPOD = useSubmitPOD();

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<'photo' | 'signature'>('photo');
  const [notes, setNotes] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const isCompleted = delivery.status === 'DELIVERED';
  const isInTransit = delivery.status === 'IN_TRANSIT';
  const statusColor = getStatusColor(delivery.status);
  const statusBg = getStatusBg(delivery.status);
  const statusLabel = getStatusLabel(delivery.status);

  const toggleCamera = useCallback(
    (type: 'photo' | 'signature') => {
      setCameraType(type);
      setShowCamera(true);
    },
    [],
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
      });

      if (photo?.uri) {
        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUri = `data:image/jpeg;base64,${base64}`;

        if (cameraType === 'photo') {
          setPhotoData(dataUri);
        } else {
          setSignatureData(dataUri);
        }
      }
      setShowCamera(false);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao capturar imagem.');
      setShowCamera(false);
    }
  }, [cameraType]);

  const handleCompleteDelivery = useCallback(async () => {
    if (!signatureData || !photoData) {
      Alert.alert(
        'Atenção',
        'É obrigatório capturar a assinatura digital e a foto do lacre antes de finalizar.',
      );
      return;
    }

    try {
      await submitPOD.mutateAsync({
        deliveryId: delivery.id,
        signatureUrl: signatureData,
        photoUrl: photoData,
        lat: undefined,
        lng: undefined,
      });
      Alert.alert('Sucesso', 'Entrega finalizada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao enviar comprovantes.');
    }
  }, [delivery.id, signatureData, photoData, submitPOD, navigation]);

  const updateStatusMutation = submitPOD; // Reuse for initial status updates

  const handleStartTrip = useCallback(async () => {
    try {
      await submitPOD.mutateAsync({
        deliveryId: delivery.id,
        signatureUrl: undefined,
        photoUrl: undefined,
      });
      Alert.alert('Sucesso', 'Viagem iniciada!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao iniciar viagem.');
    }
  }, [delivery.id, submitPOD]);

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    );
  };

  const makeCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  const openWhatsApp = (phone: string) => {
    Linking.openURL(`https://wa.me/55${phone.replace(/\D/g, '')}`);
  };

  if (!delivery) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Entrega não encontrada</Text>
      </View>
    );
  }

  // Camera overlay
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.cameraPreview}
          facing="back"
          flash="off"
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.cameraCloseText}>✕ Fechar</Text>
            </TouchableOpacity>

            <View style={styles.cameraGuide}>
              <Text style={styles.cameraGuideText}>
                {cameraType === 'photo'
                  ? '📷 Fotografe o lacre/documento'
                  : '✍️ Capture a assinatura digital'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cameraCaptureBtn}
              onPress={handleCapture}
            >
              <View style={styles.cameraCaptureOuter}>
                <View style={styles.cameraCaptureInner} />
              </View>
            </TouchableOpacity>
          </View>
        </CameraView>
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>{delivery.id}</Text>
          <Text style={styles.headerTitle}>Ordem de Despacho</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.headerBadgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Customer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>Cliente Final</Text>
            </View>
            <Text style={styles.invoiceCode}>{delivery.deliveryNumber}</Text>
          </View>
          <Text style={styles.customerName}>{delivery.customer?.name}</Text>
          <TouchableOpacity
            style={styles.addressCard}
            onPress={() => openMaps(delivery.deliveryAddress)}
          >
            <Text style={styles.addressIcon}>📍</Text>
            <View style={styles.addressTextBlock}>
              <Text style={styles.addressText}>{delivery.deliveryAddress}</Text>
              <Text style={styles.addressHint}>Toque para traçar rota no GPS →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Load Details */}
        <View style={styles.loadCard}>
          <View style={styles.loadItem}>
            <Text style={styles.loadLabel}>Material</Text>
            <Text style={styles.loadValue}>{delivery.materialType}</Text>
          </View>
          <View style={styles.loadDivider} />
          <View style={styles.loadItem}>
            <Text style={styles.loadLabel}>Volumes / Peso</Text>
            <Text style={styles.loadValue}>{delivery.quantity}</Text>
            {delivery.weight && (
              <Text style={styles.loadSubvalue}>{delivery.weight}</Text>
            )}
          </View>
        </View>

        {/* Invoices */}
        {delivery.invoices && delivery.invoices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notas Fiscais Vinculadas</Text>
            {delivery.invoices.map((inv, idx) => (
              <View key={idx} style={styles.invoiceItem}>
                <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                {inv.totalAmount && (
                  <Text style={styles.invoiceAmount}>
                    {formatCurrency(inv.totalAmount)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Observações</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Adicione observações sobre esta entrega..."
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Communication */}
        {delivery.customer && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Comunicação</Text>
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => makeCall(delivery.customer?.phone || '')}
              >
                <Text style={styles.contactBtnIcon}>📞</Text>
                <Text style={styles.contactBtnText}>Ligação</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() =>
                  openWhatsApp(delivery.customer?.whatsapp || '')
                }
              >
                <Text style={styles.contactBtnIcon}>💬</Text>
                <Text style={styles.contactBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* POD Section */}
        {!isCompleted && (
          <View style={styles.section}>
            <View style={styles.podHeader}>
              <Text style={styles.sectionLabel}>Comprovantes (POD)</Text>
              <Text style={styles.podBadge}>Validação SEFAZ</Text>
            </View>
            <View style={styles.podGrid}>
              {/* Signature Capture */}
              {signatureData ? (
                <View style={styles.capturedContainer}>
                  <Image
                    source={{ uri: signatureData }}
                    style={styles.capturedImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.recaptureBtn}
                    onPress={() => toggleCamera('signature')}
                  >
                    <Text style={styles.recaptureBtnText}>Recapturar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.capturePlaceholder}
                  onPress={() => toggleCamera('signature')}
                >
                  <Text style={styles.captureIcon}>✍️</Text>
                  <Text style={styles.captureLabel}>Assinatura Digital</Text>
                  <Text style={styles.captureHint}>
                    Toque para capturar
                  </Text>
                </TouchableOpacity>
              )}

              {/* Photo Capture */}
              {photoData ? (
                <View style={styles.capturedContainer}>
                  <Image
                    source={{ uri: photoData }}
                    style={styles.capturedImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.recaptureBtn}
                    onPress={() => toggleCamera('photo')}
                  >
                    <Text style={styles.recaptureBtnText}>Recapturar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.capturePlaceholder}
                  onPress={() => toggleCamera('photo')}
                >
                  <Text style={styles.captureIcon}>📷</Text>
                  <Text style={styles.captureLabel}>Foto do Lacre</Text>
                  <Text style={styles.captureHint}>
                    Documento / Lacre
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedIcon}>✅</Text>
            <Text style={styles.completedText}>
              Manifesto encerrado e transmitido ao centralizador
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {!isCompleted && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {isInTransit ? (
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnSuccess]}
              onPress={handleCompleteDelivery}
              disabled={submitPOD.isPending}
            >
              {submitPOD.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.footerBtnText}>
                  ✅ Finalizar Entrega (POD)
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary]}
              onPress={handleStartTrip}
              disabled={submitPOD.isPending}
            >
              {submitPOD.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.footerBtnText}>
                  🚚 Iniciar Viagem
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  errorText: { textAlign: 'center', marginTop: 40, color: colors.error },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: '#F8FAFC',
  },
  backBtn: { paddingVertical: 8, paddingRight: 12 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  headerBadgeText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBadge: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sectionBadgeText: { fontSize: 9, fontWeight: '800', color: colors.white, textTransform: 'uppercase', letterSpacing: 1 },
  invoiceCode: { fontSize: 10, fontWeight: '700', color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  customerName: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 12, lineHeight: 30 },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addressIcon: { fontSize: 18, marginRight: 10, marginTop: 2 },
  addressTextBlock: { flex: 1 },
  addressText: { fontSize: 13, fontWeight: '700', color: colors.text },
  addressHint: { fontSize: 10, color: colors.primary, fontWeight: '600', marginTop: 4 },
  loadCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
  },
  loadItem: { flex: 1, paddingHorizontal: 8 },
  loadLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  loadValue: { fontSize: 12, fontWeight: '700', color: colors.text },
  loadSubvalue: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  loadDivider: { width: 1, backgroundColor: colors.border },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  invoiceNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  invoiceAmount: { fontSize: 11, fontWeight: '800', color: colors.primary },
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 14,
    fontSize: 13,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactBtnIcon: { fontSize: 16 },
  contactBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
  podHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  podBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  podGrid: { gap: 10 },
  capturePlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    minHeight: 140,
  },
  captureIcon: { fontSize: 32, marginBottom: 8 },
  captureLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  captureHint: { fontSize: 9, color: colors.textTertiary, marginTop: 4 },
  capturedContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.successBg,
    minHeight: 140,
  },
  capturedImage: { width: '100%', height: 140 },
  recaptureBtn: { padding: 8, alignItems: 'center' },
  recaptureBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedIcon: { fontSize: 20 },
  completedText: { fontSize: 12, fontWeight: '700', color: colors.success, flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: { paddingVertical: 16, borderRadius: borderRadius.lg, alignItems: 'center' },
  footerBtnPrimary: { backgroundColor: colors.primary },
  footerBtnSuccess: { backgroundColor: colors.success },
  footerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  cameraCloseBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.lg,
  },
  cameraCloseText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  cameraGuide: { alignItems: 'center' },
  cameraGuideText: { color: colors.white, fontSize: 16, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: borderRadius.lg },
  cameraCaptureBtn: { alignSelf: 'center', alignItems: 'center' },
  cameraCaptureOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
});
