import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useFuelLogs,
  useApproveFuelRequest,
  useRejectFuelRequest,
  colors,
  borderRadius,
  shadows,
} from '@rn-apps/shared';

function formatFuelSequence(value?: string) {
  if (!value) return 'Sequencial';
  const digits = value.match(/\d+/g)?.join('');
  return digits || value;
}

export default function FuelControlScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Fetch fuel logs
  const { data: logs, isLoading, refetch } = useFuelLogs();
  const approveMutation = useApproveFuelRequest();
  const rejectMutation = useRejectFuelRequest();

  // State
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Approval Form State
  const [liters, setLiters] = useState('');
  const [stationName, setStationName] = useState('');
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Web-friendly image capture trigger
  const handleCapturePhoto = (type: 'odometer' | 'receipt') => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Triggers back camera on mobile browsers
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            if (type === 'odometer') {
              setOdometerPhoto(base64data);
            } else {
              setReceiptPhoto(base64data);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('Câmera', 'Disponível em ambiente web/mobile.');
    }
  };

  const handleOpenApproveModal = (req: any) => {
    setSelectedRequest(req);
    setLiters('');
    setStationName('');
    setOdometerPhoto(null);
    setReceiptPhoto(null);
  };

  const handleApprove = () => {
    if (!liters || isNaN(Number(liters)) || Number(liters) <= 0) {
      Alert.alert('Erro', 'Por favor, informe a litragem abastecida.');
      return;
    }
    if (!stationName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do posto.');
      return;
    }

    approveMutation.mutate(
      {
        id: selectedRequest.id,
        data: {
          litersFilled: Number(liters),
          costPerLiter: 0,
          stationName: stationName.trim(),
          receiptPhoto,
          odometerPhoto,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Sucesso', 'Abastecimento aprovado com sucesso!');
          setSelectedRequest(null);
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Erro', err.message || 'Falha ao aprovar abastecimento.');
        },
      }
    );
  };

  const handleReject = (id: string) => {
    const confirmReject = () => {
      rejectMutation.mutate(id, {
        onSuccess: () => {
          Alert.alert('Sucesso', 'Abastecimento recusado.');
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Erro', err.message || 'Falha ao recusar abastecimento.');
        },
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja recusar esta solicitação de abastecimento?')) {
        confirmReject();
      }
    } else {
      Alert.alert('Recusar Solicitação', 'Deseja recusar esta solicitação de abastecimento?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Recusar', style: 'destructive', onPress: confirmReject },
      ]);
    }
  };

  const pendingRequests = logs?.filter((log) => log.status === 'PENDING') || [];
  const historyLogs = logs?.filter((log) => log.status !== 'PENDING') || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Controle de Combustível</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pendentes ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Histórico ({historyLogs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Carregando registros...</Text>
        </View>
      ) : activeTab === 'pending' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⛽</Text>
              <Text style={styles.emptyText}>Nenhuma solicitação de abastecimento pendente</Text>
            </View>
          ) : (
            pendingRequests.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.vehiclePlate}>🚛 {req.vehicle?.vehicleNumber || 'Sem veículo'}</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDENTE</Text>
                  </View>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>Motorista:</Text>
                  <Text style={styles.cardValue}>{req.driver?.user?.name || 'Não identificado'}</Text>
                  
                  <Text style={styles.cardLabel}>Odômetro Solicitado:</Text>
                  <Text style={styles.cardValue}>{req.odometer} KM</Text>

                  <Text style={styles.cardLabel}>Data Solicitação:</Text>
                  <Text style={styles.cardValue}>
                    {new Date(req.createdAt || req.fillDate).toLocaleString('pt-BR')}
                  </Text>
                </View>
                <View style={styles.cardButtons}>
                  <TouchableOpacity
                    style={[styles.cardBtn, styles.cardBtnReject]}
                    onPress={() => handleReject(req.id)}
                  >
                    <Text style={styles.cardBtnRejectText}>Recusar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardBtn, styles.cardBtnApprove]}
                    onPress={() => handleOpenApproveModal(req)}
                  >
                    <Text style={styles.cardBtnApproveText}>Preencher & Aprovar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {historyLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>Nenhum histórico disponível</Text>
            </View>
          ) : (
            historyLogs.map((log) => (
              <View key={log.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.vehiclePlate}>🚛 {log.vehicle?.vehicleNumber || 'Sem veículo'}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      log.status === 'APPROVED' ? styles.approvedBadge : styles.rejectedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        log.status === 'APPROVED' ? styles.approvedBadgeText : styles.rejectedBadgeText,
                      ]}
                    >
                      {log.status === 'APPROVED' ? 'APROVADO' : 'RECUSADO'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>Motorista:</Text>
                  <Text style={styles.cardValue}>{log.driver?.user?.name || 'Não informado'}</Text>

                  <Text style={styles.cardLabel}>Odômetro:</Text>
                  <Text style={styles.cardValue}>{log.odometer} KM</Text>

                  {log.status === 'APPROVED' && (
                    <>
                      <Text style={styles.cardLabel}>Nº:</Text>
                      <Text style={styles.cardValueText}>{formatFuelSequence(log.jobNumber)}</Text>

                      <Text style={styles.cardLabel}>Posto de Combustível:</Text>
                      <Text style={styles.cardValue}>{log.stationName || 'N/A'}</Text>

                      <Text style={styles.cardLabel}>Litragem Abastecida:</Text>
                      <Text style={styles.cardValue}>{log.litersFilled} Litros</Text>
                    </>
                  )}

                  <Text style={styles.cardLabel}>Data Registro:</Text>
                  <Text style={styles.cardValue}>
                    {new Date(log.fillDate || log.createdAt || '').toLocaleString('pt-BR')}
                  </Text>
                </View>

                {/* Photos Display in History */}
                {log.status === 'APPROVED' && (log.odometerPhotoUrl || log.receiptPhotoUrl) && (
                  <View style={styles.photoContainer}>
                    <Text style={styles.photoHeader}>Comprovantes Anexados:</Text>
                    <View style={styles.photoRow}>
                      {log.odometerPhotoUrl && (
                        <TouchableOpacity
                          style={styles.photoThumbWrapper}
                          onPress={() => setLightboxImage(log.odometerPhotoUrl || null)}
                        >
                          <Image source={{ uri: log.odometerPhotoUrl }} style={styles.photoThumb} />
                          <Text style={styles.photoThumbLabel}>Odômetro</Text>
                        </TouchableOpacity>
                      )}
                      {log.receiptPhotoUrl && (
                        <TouchableOpacity
                          style={styles.photoThumbWrapper}
                          onPress={() => setLightboxImage(log.receiptPhotoUrl || null)}
                        >
                          <Image source={{ uri: log.receiptPhotoUrl }} style={styles.photoThumb} />
                          <Text style={styles.photoThumbLabel}>Recibo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Approval Modal */}
      {selectedRequest && (
        <Modal transparent visible={!!selectedRequest} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Aprovar Abastecimento</Text>
              <Text style={styles.modalSubtitle}>
                {selectedRequest.driver?.user?.name} • Odo: {selectedRequest.odometer} KM
              </Text>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Nº</Text>
                  <View style={styles.inputDisabled}>
                    <Text style={styles.inputDisabledText}>Gerado automaticamente em sequência</Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Litragem Cheia (L)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 120"
                    keyboardType="numeric"
                    value={liters}
                    onChangeText={setLiters}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Nome do Posto</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Posto Petrobras"
                    value={stationName}
                    onChangeText={setStationName}
                  />
                </View>

                {/* Picture taking options for Odometer and Receipt */}
                <Text style={styles.cameraTitle}>Registros de Fotos:</Text>
                <View style={styles.cameraRow}>
                  <View style={styles.cameraColumn}>
                    <TouchableOpacity
                      style={styles.cameraBtn}
                      onPress={() => handleCapturePhoto('odometer')}
                    >
                      {odometerPhoto ? (
                        <Image source={{ uri: odometerPhoto }} style={styles.cameraPreview} />
                      ) : (
                        <View style={styles.cameraPlaceholder}>
                          <Text style={styles.cameraIcon}>📸</Text>
                          <Text style={styles.cameraText}>Foto Odômetro</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {odometerPhoto && (
                      <TouchableOpacity onPress={() => setOdometerPhoto(null)}>
                        <Text style={styles.removePhotoText}>Remover</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.cameraColumn}>
                    <TouchableOpacity
                      style={styles.cameraBtn}
                      onPress={() => handleCapturePhoto('receipt')}
                    >
                      {receiptPhoto ? (
                        <Image source={{ uri: receiptPhoto }} style={styles.cameraPreview} />
                      ) : (
                        <View style={styles.cameraPlaceholder}>
                          <Text style={styles.cameraIcon}>🧾</Text>
                          <Text style={styles.cameraText}>Foto do Recibo</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {receiptPhoto && (
                      <TouchableOpacity onPress={() => setReceiptPhoto(null)}>
                        <Text style={styles.removePhotoText}>Remover</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setSelectedRequest(null)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalBtnConfirmText}>Confirmar Aprov.</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <Modal transparent visible={!!lightboxImage} animationType="fade">
          <TouchableOpacity
            style={styles.lightboxOverlay}
            activeOpacity={1}
            onPress={() => setLightboxImage(null)}
          >
            <View style={styles.lightboxContent}>
              <Image source={{ uri: lightboxImage }} style={styles.lightboxImage} />
              <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxImage(null)}>
                <Text style={styles.lightboxCloseText}>Fechar ✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: { paddingVertical: 8, paddingRight: 12 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  headerTitle: { fontSize: 13, fontWeight: '800', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerSpacer: { width: 60 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  tabActive: {
    backgroundColor: '#334155',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: colors.white,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: '80%', lineHeight: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehiclePlate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  approvedBadgeText: {
    color: '#059669',
  },
  rejectedBadgeText: {
    color: '#DC2626',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  cardLabel: {
    width: '45%',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  cardValue: {
    width: '55%',
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  cardValueText: {
    width: '55%',
    fontSize: 11,
    color: '#475569',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cardBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cardBtnReject: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cardBtnRejectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  cardBtnApprove: {
    backgroundColor: '#10B981',
  },
  cardBtnApproveText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  photoContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  photoHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumbWrapper: {
    alignItems: 'center',
  },
  photoThumb: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
  },
  photoThumbLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputDisabled: {
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
  },
  inputDisabledText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cameraTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cameraRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  cameraColumn: {
    flex: 1,
    alignItems: 'center',
  },
  cameraBtn: {
    width: '100%',
    height: 100,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  cameraText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalBtnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalBtnConfirm: {
    backgroundColor: '#10B981',
  },
  modalBtnConfirmText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  lightboxClose: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  lightboxCloseText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
