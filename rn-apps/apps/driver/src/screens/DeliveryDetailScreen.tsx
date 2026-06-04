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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import {
  useAuthStore,
  useSubmitPOD,
  useDelivery,
  useUpdateDeliveryStatus,
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
import SignaturePad from '../components/SignaturePad';
import { useOfflineStore } from '../store/offlineStore';

export default function DeliveryDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialDelivery: Delivery = route.params?.delivery;
  
  // Real-time query to synchronize status updates and POD completion
  const { data: liveDelivery } = useDelivery(initialDelivery.id);
  
  const { isOffline, enqueueMutation, updateLocalDeliveryStatus, updateLocalDeliveryPOD } = useOfflineStore();
  const delivery = liveDelivery || initialDelivery;
  
  const { user } = useAuthStore();
  const submitPOD = useSubmitPOD();
  const updateStatus = useUpdateDeliveryStatus();
  const [permission, requestPermission] = useCameraPermissions();

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [cameraType, setCameraType] = useState<'photo' | 'signature'>('photo');
  const [notes, setNotes] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const isCompleted = delivery.status === 'DELIVERED';
  const isInTransit = delivery.status === 'IN_TRANSIT';
  const statusColor = getStatusColor(delivery.status);
  const statusBg = getStatusBg(delivery.status);
  const statusLabel = getStatusLabel(delivery.status);

  // Timeline Step Generator
  const getTimelineSteps = () => {
    const steps = [
      { label: 'Designado', key: 'ASSIGNED' },
      { label: 'Carregando', key: 'LOADING' },
      { label: 'Em Trânsito', key: 'IN_TRANSIT' },
      { label: 'Entregue', key: 'DELIVERED' },
      { label: 'POD Enviado', key: 'POD' },
    ];
    const statusOrder = ['PENDING', 'ASSIGNED', 'LOADING', 'IN_TRANSIT', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(delivery.status);

    return steps.map((step, idx) => {
      let active = false;
      let completed = false;

      if (step.key === 'POD') {
        completed =
          isCompleted &&
          (!!photoData ||
            !!delivery.proof_image_url ||
            !!signatureData ||
            !!delivery.signature_url);
        active = isCompleted && !completed;
      } else {
        const stepIdx = statusOrder.indexOf(step.key);
        completed = currentIndex > stepIdx;
        active = currentIndex === stepIdx;
      }

      return { ...step, active, completed };
    });
  };

  const toggleCamera = useCallback(
    async (type: 'photo' | 'signature') => {
      if (type === 'signature') {
        setShowSignaturePad(true);
        return;
      }

      // Check and request camera permission before showing camera overlay
      if (!permission || !permission.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          Alert.alert(
            'Permissão necessária',
            'Precisamos de acesso à câmera para fotografar o lacre da entrega.'
          );
          return;
        }
      }

      setCameraType(type);
      setShowCamera(true);
    },
    [permission, requestPermission]
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.35,
      });

      if (photo?.uri && photo.base64) {
        const dataUri = `data:image/jpeg;base64,${photo.base64}`;

        if (cameraType === 'photo') {
          setPhotoData(dataUri);
        } else {
          setSignatureData(dataUri);
        }
      } else {
        throw new Error('Falha ao processar imagem capturada.');
      }
      setShowCamera(false);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao capturar imagem.');
      setShowCamera(false);
    }
  }, [cameraType]);

  const handleCompleteDelivery = useCallback(async () => {
    if (!photoData) {
      Alert.alert(
        'Atenção',
        'É obrigatório capturar a foto do lacre ou comprovante antes de finalizar.'
      );
      return;
    }

    if (isOffline) {
      // Offline mode support
      updateLocalDeliveryPOD(delivery.id, signatureData, photoData);
      enqueueMutation('POD', delivery.id, {
        signatureUrl: signatureData || undefined,
        photoUrl: photoData,
      });
      Alert.alert(
        'Modo Offline',
        'Comprovante registrado localmente. A sincronização com a central será feita assim que houver sinal de internet.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await submitPOD.mutateAsync({
        deliveryId: delivery.id,
        signatureUrl: signatureData || undefined,
        photoUrl: photoData,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      Alert.alert('Sucesso', 'Entrega finalizada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao enviar comprovantes.');
    }
  }, [delivery.id, signatureData, photoData, submitPOD, navigation, isOffline, updateLocalDeliveryPOD, enqueueMutation]);

  const handleStartTrip = useCallback(async () => {
    if (isOffline) {
      // Offline mode support
      updateLocalDeliveryStatus(delivery.id, 'IN_TRANSIT');
      enqueueMutation('STATUS', delivery.id, { status: 'IN_TRANSIT' });
      Alert.alert(
        'Modo Offline',
        'Viagem iniciada localmente. O status será transmitido à central quando a conexão for restabelecida.'
      );
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: delivery.id,
        status: 'IN_TRANSIT',
      });
      Alert.alert('Sucesso', 'Viagem iniciada!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao iniciar viagem.');
    }
  }, [delivery.id, updateStatus, isOffline, updateLocalDeliveryStatus, enqueueMutation]);

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`
    );
  };

  const makeCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const formatted = cleaned.startsWith('55') && cleaned.length >= 12 ? cleaned : `55${cleaned}`;
    Linking.openURL(`https://wa.me/${formatted}`);
  };

  if (!delivery) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Entrega não encontrada</Text>
      </View>
    );
  }

  // Signature drawing pad overlay
  if (showSignaturePad) {
    return (
      <View style={[styles.signatureOverlayContainer, { paddingTop: insets.top + 30 }]}>
        <View style={styles.signaturePadWrapper}>
          <SignaturePad
            onSave={(base64) => {
              setSignatureData(base64);
              setShowSignaturePad(false);
            }}
            onClose={() => setShowSignaturePad(false)}
          />
        </View>
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
        />
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Offline Mode Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📡 Modo Offline Ativo</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>{delivery.id.slice(0, 8)}...</Text>
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
        {/* Real-time Delivery Timeline Widget */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineCardTitle}>📊 Linha do Tempo da Entrega</Text>
          <View style={styles.timelineContainer}>
            {getTimelineSteps().map((step, idx) => {
              const isLast = idx === 4;
              return (
                <View key={step.key} style={styles.timelineStepWrapper}>
                  <View style={styles.timelineNodeBlock}>
                    <View
                      style={[
                        styles.timelineCircle,
                        step.completed && styles.timelineCircleCompleted,
                        step.active && styles.timelineCircleActive,
                      ]}
                    >
                      {step.completed ? (
                        <Text style={styles.timelineCheckText}>✓</Text>
                      ) : (
                        <View
                          style={[
                            styles.timelineDot,
                            step.active && styles.timelineDotActive,
                          ]}
                        />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineConnector,
                          step.completed && styles.timelineConnectorCompleted,
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      step.completed && styles.timelineLabelCompleted,
                      step.active && styles.timelineLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

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
                  openWhatsApp(delivery.customer?.phone || '')
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
                    <Text style={styles.recaptureBtnText}>Recapturar Assinatura</Text>
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
                    Opcional
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
                    <Text style={styles.recaptureBtnText}>Recapturar Foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.capturePlaceholder}
                  onPress={() => toggleCamera('photo')}
                >
                  <Text style={styles.captureIcon}>📷</Text>
                  <Text style={styles.captureLabel}>Foto do Lacre / Carga</Text>
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
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
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
  offlineBanner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
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
  
  // Timeline Styles
  timelineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  timelineCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  timelineStepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineNodeBlock: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    height: 24,
  },
  timelineCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineCircleActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  timelineCircleCompleted: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  timelineCheckText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '900',
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  timelineDotActive: {
    backgroundColor: '#2563EB',
  },
  timelineConnector: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    top: 10,
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  timelineConnectorCompleted: {
    backgroundColor: '#10B981',
  },
  timelineLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    width: '90%',
  },
  timelineLabelActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  timelineLabelCompleted: {
    color: '#0F172A',
  },

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
    minHeight: 180,
  },
  capturedImage: { width: '100%', height: 140 },
  recaptureBtn: { padding: 12, alignItems: 'center', backgroundColor: colors.white },
  recaptureBtnText: { fontSize: 11, fontWeight: '800', color: colors.primary },
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
    ...StyleSheet.absoluteFillObject,
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
  // Signature pad styles
  signatureOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  signaturePadWrapper: {
    width: '100%',
    maxWidth: 500,
  },
});
