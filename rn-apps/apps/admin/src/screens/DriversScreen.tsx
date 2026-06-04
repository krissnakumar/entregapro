import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDrivers, useVehicles, useUpdateDriver, colors, borderRadius, shadows } from '@rn-apps/shared';

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data: driversRaw, isLoading } = useDrivers();
  const { data: vehiclesRaw } = useVehicles();
  const updateDriverMutation = useUpdateDriver();

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  const drivers = Array.isArray(driversRaw)
    ? driversRaw
    : (driversRaw as any)?.data || [];

  const vehicles = Array.isArray(vehiclesRaw)
    ? vehiclesRaw
    : (vehiclesRaw as any)?.data || [];

  const filtered = drivers.filter((d: any) =>
    (d.name || d.user?.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleOpenVehicleModal = (driver: any) => {
    setSelectedDriver(driver);
    setVehicleModalVisible(true);
  };

  const handleSelectVehicle = (vehicleId: string | null) => {
    if (!selectedDriver) return;

    updateDriverMutation.mutate(
      {
        id: selectedDriver.id,
        data: { vehicleId },
      },
      {
        onSuccess: () => {
          setVehicleModalVisible(false);
          setSelectedDriver(null);
          Alert.alert('Sucesso', 'Veículo atualizado com sucesso!');
        },
        onError: (err: any) => {
          Alert.alert('Erro', err.message || 'Não foi possível atualizar o veículo.');
        },
      }
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Motoristas</Text>
        <TouchableOpacity>
          <Text style={styles.addBtn}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar motoristas..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando motoristas...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((d: any) => {
            const driverName = d.name || d.user?.name || '';
            const isActive = d.isOnline ?? d.active ?? false;
            const vehiclePlate = d.currentVehicle?.vehicleNumber || d.vehicle?.vehicleNumber || d.vehicle?.plate || '';
            return (
            <View key={d.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarText}>{driverName?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isActive ? colors.success : colors.muted },
                      ]}
                    />
                  </View>
                  {d.phone && <Text style={styles.driverDetail}>{d.phone}</Text>}
                </View>
                {vehiclePlate ? (
                  <TouchableOpacity 
                    style={styles.vehicleBadge}
                    onPress={() => handleOpenVehicleModal(d)}
                  >
                    <Text style={styles.vehicleBadgeText}>{vehiclePlate} ✏️</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.vehicleBadge, { backgroundColor: '#F8FAFC', borderStyle: 'dashed' }]}
                    onPress={() => handleOpenVehicleModal(d)}
                  >
                    <Text style={[styles.vehicleBadgeText, { color: colors.textTertiary }]}>+ Veículo</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(d.cnhNumber || d.licenseNumber) ? (
                <Text style={styles.driverLicense}>CNH: {d.cnhNumber || d.licenseNumber}</Text>
              ) : null}
            </View>
            );
          })}
        </ScrollView>
      )}

      {/* Vehicle Picker Modal */}
      <Modal
        visible={vehicleModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Veículo</Text>
              <Text style={styles.modalSubtitle}>
                Motorista: {selectedDriver?.name || selectedDriver?.user?.name}
              </Text>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => handleSelectVehicle(null)}
              >
                <Text style={[styles.modalItemTitle, { color: colors.error }]}>Desatribuir Veículo</Text>
              </TouchableOpacity>
              
              {vehicles.map((v: any) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectVehicle(v.id)}
                >
                  <Text style={styles.modalItemTitle}>{v.vehicleNumber}</Text>
                  <Text style={styles.modalItemSub}>{v.type} • {v.capacity}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setVehicleModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  avatarSmall: {
    width: 44, height: 44, backgroundColor: '#EEF2FF', borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverName: { fontSize: 14, fontWeight: '800', color: colors.text },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  driverDetail: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  vehicleBadge: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0',
  },
  vehicleBadgeText: { fontSize: 10, fontWeight: '700', color: colors.text, fontFamily: 'monospace' },
  driverLicense: { fontSize: 10, color: colors.textTertiary, fontFamily: 'monospace' },

  // Modal Styles
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
    maxHeight: '80%',
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalScroll: {
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  modalItemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
