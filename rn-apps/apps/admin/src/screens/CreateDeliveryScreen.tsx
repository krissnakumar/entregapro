import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useCustomers,
  useDrivers,
  useVehicles,
  useCreateDelivery,
  colors,
  borderRadius,
  shadows,
  typography,
} from '@rn-apps/shared';

export default function CreateDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const createDeliveryMutation = useCreateDelivery();

  // Queries
  const { data: customersRaw, isLoading: loadingCustomers } = useCustomers();
  const { data: driversRaw, isLoading: loadingDrivers } = useDrivers();
  const { data: vehiclesRaw, isLoading: loadingVehicles } = useVehicles();

  const customers = Array.isArray(customersRaw)
    ? customersRaw
    : (customersRaw as any)?.data || [];

  const drivers = Array.isArray(driversRaw)
    ? driversRaw
    : (driversRaw as any)?.data || [];

  const vehicles = Array.isArray(vehiclesRaw)
    ? vehiclesRaw
    : (vehiclesRaw as any)?.data || [];

  // Form State
  const [deliveryNumber, setDeliveryNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Modals for Selection
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  // Generate unique delivery number and set default date
  useEffect(() => {
    const num = `ENT-${Math.floor(100000 + Math.random() * 900000)}`;
    setDeliveryNumber(num);

    const now = new Date();
    // Default to tomorrow 8:00 AM
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())} ${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
    setScheduledTime(formatted);
  }, []);

  const selectedCustomerObj = customers.find((c: any) => c.id === selectedCustomerId);
  const selectedDriverObj = drivers.find((d: any) => d.id === selectedDriverId);
  const selectedVehicleObj = vehicles.find((v: any) => v.id === selectedVehicleId);

  const handleSave = () => {
    if (!deliveryNumber.trim()) {
      showAlert('Erro', 'Por favor, informe o número da entrega.');
      return;
    }
    if (!selectedCustomerId) {
      showAlert('Erro', 'Por favor, selecione um cliente.');
      return;
    }
    if (!materialType.trim()) {
      showAlert('Erro', 'Por favor, informe o tipo de material.');
      return;
    }
    if (!quantity.trim()) {
      showAlert('Erro', 'Por favor, informe a quantidade.');
      return;
    }
    if (!scheduledTime.trim()) {
      showAlert('Erro', 'Por favor, informe a data/hora agendada.');
      return;
    }

    // Basic date parsing validation
    const parsedDate = new Date(scheduledTime.replace(' ', 'T'));
    if (isNaN(parsedDate.getTime())) {
      showAlert('Erro', 'Data agendada inválida. Use o formato AAAA-MM-DD HH:MM.');
      return;
    }

    createDeliveryMutation.mutate(
      {
        deliveryNumber: deliveryNumber.trim(),
        customerId: selectedCustomerId,
        materialType: materialType.trim(),
        quantity: quantity.trim(),
        scheduledTime: parsedDate.toISOString(),
        driverId: selectedDriverId || undefined,
        vehicleId: selectedVehicleId || undefined,
      },
      {
        onSuccess: () => {
          if (Platform.OS === 'web') {
            window.alert('Entrega criada com sucesso!');
            navigation.goBack();
          } else {
            Alert.alert('Sucesso', 'Entrega criada com sucesso!', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          }
        },
        onError: (err: any) => {
          showAlert('Erro de Criação', err.message || 'Não foi possível criar a entrega.');
        },
      }
    );
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nova Entrega</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        {/* Delivery Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Número da Ordem / Entrega</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={deliveryNumber}
              onChangeText={setDeliveryNumber}
              placeholder="Ex: ENT-123456"
              placeholderTextColor={colors.textTertiary}
            />
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setDeliveryNumber(`ENT-${Math.floor(100000 + Math.random() * 900000)}`)}
            >
              <Text style={styles.actionBtnText}>Gerar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Select */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cliente</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setCustomerModalVisible(true)}
            activeOpacity={0.8}
          >
            {selectedCustomerObj ? (
              <View>
                <Text style={styles.selectText}>{selectedCustomerObj.name}</Text>
                <Text style={styles.selectSubtext} numberOfLines={1}>
                  📍 {selectedCustomerObj.address}
                </Text>
              </View>
            ) : (
              <Text style={styles.selectPlaceholder}>Selecionar Cliente...</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Material Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tipo de Material</Text>
          <TextInput
            style={styles.input}
            value={materialType}
            onChangeText={setMaterialType}
            placeholder="Ex: Concreto Usinado, Areia, Brita"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Quantity */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Quantidade</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Ex: 8 m³, 12 toneladas"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Scheduled Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Agendamento (AAAA-MM-DD HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={scheduledTime}
            onChangeText={setScheduledTime}
            placeholder="Ex: 2026-06-05 08:00"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Driver Select (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Motorista (Opcional)</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setDriverModalVisible(true)}
            activeOpacity={0.8}
          >
            {selectedDriverObj ? (
              <View>
                <Text style={styles.selectText}>{selectedDriverObj.name || selectedDriverObj.user?.name || selectedDriverObj.cnhNumber || selectedDriverObj.licenseNumber || 'Sem Nome'}</Text>
                <Text style={styles.selectSubtext}>
                  🪪 CNH: {selectedDriverObj.cnhNumber || selectedDriverObj.licenseNumber || 'N/A'}
                </Text>
              </View>
            ) : (
              <Text style={styles.selectPlaceholder}>Atribuir Motorista...</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Vehicle Select (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Veículo (Opcional)</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setVehicleModalVisible(true)}
            activeOpacity={0.8}
          >
            {selectedVehicleObj ? (
              <View>
                <Text style={styles.selectText}>
                  🚚 Placa/Número: {selectedVehicleObj.vehicleNumber}
                </Text>
                <Text style={styles.selectSubtext}>
                  Tipo: {selectedVehicleObj.type} | Cap: {selectedVehicleObj.capacity}
                </Text>
              </View>
            ) : (
              <Text style={styles.selectPlaceholder}>Atribuir Veículo...</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, createDeliveryMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={createDeliveryMutation.isPending}
          activeOpacity={0.9}
        >
          {createDeliveryMutation.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Criar Entrega</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal visible={customerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Cliente</Text>
              <TouchableOpacity onPress={() => setCustomerModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingCustomers ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
              <ScrollView style={styles.modalList}>
                {customers.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemTitle}>{c.name}</Text>
                    <Text style={styles.modalItemSub}>{c.address}</Text>
                  </TouchableOpacity>
                ))}
                {customers.length === 0 && (
                  <Text style={styles.emptyText}>Nenhum cliente cadastrado</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Driver Selection Modal */}
      <Modal visible={driverModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Motorista</Text>
              <TouchableOpacity onPress={() => setDriverModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingDrivers ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
              <ScrollView style={styles.modalList}>
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedDriverId('');
                    setDriverModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemTitle, { color: colors.error }]}>Nenhum / Desatribuir</Text>
                </TouchableOpacity>
                {drivers.map((d: any) => (
                  <TouchableOpacity
                    key={d.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedDriverId(d.id);
                      setDriverModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemTitle}>{d.name || d.user?.name || d.cnhNumber || d.licenseNumber || 'Sem Nome'}</Text>
                    <Text style={styles.modalItemSub}>CNH: {d.cnhNumber || d.licenseNumber || 'N/A'} {d.isOnline ? '• Online 🟢' : ''}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Vehicle Selection Modal */}
      <Modal visible={vehicleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Veículo</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingVehicles ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : (
              <ScrollView style={styles.modalList}>
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedVehicleId('');
                    setVehicleModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemTitle, { color: colors.error }]}>Nenhum / Desatribuir</Text>
                </TouchableOpacity>
                {vehicles.map((v: any) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedVehicleId(v.id);
                      setVehicleModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemTitle}>🚚 {v.vehicleNumber} ({v.type})</Text>
                    <Text style={styles.modalItemSub}>Capacidade: {v.capacity} | Combustível: {v.fuelType}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtnWrapper: { paddingVertical: 4 },
  backBtn: { fontSize: 14, fontWeight: '700', color: colors.text },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerSpacer: { width: 48 },
  formContainer: { padding: 20, paddingBottom: 60 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { ...typography.label, marginBottom: 8, color: colors.textSecondary },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  actionBtn: {
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  actionBtnText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  selectTrigger: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  selectText: { fontSize: 15, fontWeight: '700', color: colors.text },
  selectSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  selectPlaceholder: { fontSize: 15, color: colors.textTertiary },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  modalList: { marginBottom: 20 },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  modalItemSub: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  emptyText: { textAlign: 'center', color: colors.textTertiary, paddingVertical: 20 },
  loader: { paddingVertical: 20 },
});
