import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAuthStore, useSendTestPush, colors, borderRadius, shadows } from '@rn-apps/shared';

const SETTINGS_GROUPS = [
  {
    title: 'Sistema',
    items: [
      { label: 'Configurações Gerais', value: 'Portal Centralizador' },
      { label: 'API Base', value: 'http://10.0.2.2:3000' },
      { label: 'Versão do App', value: '1.0.0 (RN)' },
    ],
  },
  {
    title: 'Notificações',
    items: [
      { label: 'Alertas de Entrega', value: 'Ativado' },
      { label: 'Relatório Diário', value: '07:00' },
      { label: 'Sincronização Automática', value: 'A cada 15 min' },
    ],
  },
  {
    title: 'Preferências',
    items: [
      { label: 'Moeda Padrão', value: 'BRL (R$)' },
      { label: 'Formato de Data', value: 'DD/MM/AAAA' },
      { label: 'Unidade de Peso', value: 'Toneladas (T)' },
    ],
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout } = useAuthStore();
  const sendTestPushMutation = useSendTestPush();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Deseja sair do painel administrativo?');
      if (confirmLogout) {
        logout();
      }
    } else {
      Alert.alert('Encerrar Sessão', 'Deseja sair do painel administrativo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  const handleSendTestPush = async () => {
    try {
      const result = await sendTestPushMutation.mutateAsync();
      const delivery = result.pushDelivery;
      const ticketSummary = delivery?.tickets
        ?.map((ticket) => ticket.details?.error || ticket.message || ticket.status || 'sem status')
        .join(', ');
      const diagnostics = delivery
        ? [
            `Tokens: ${delivery.tokenCount}`,
            `Modo: ${delivery.mode}`,
            delivery.errors.length > 0 ? `Erros: ${delivery.errors.join(', ')}` : null,
            ticketSummary ? `Expo: ${ticketSummary}` : null,
          ]
            .filter(Boolean)
            .join('\n')
        : 'Sem diagnostico de entrega.';

      Alert.alert(
        'Push enviado',
        `O teste foi disparado para sua conta.\n\n${diagnostics}`,
      );
    } catch (error: any) {
      Alert.alert(
        'Falha no push',
        error?.message || 'Nao foi possivel enviar o teste de notificacao.',
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {SETTINGS_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, idx) => (
                <View key={item.label}>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    <Text style={styles.settingValue}>{item.value}</Text>
                  </View>
                  {idx < group.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Diagnostico</Text>
          <View style={styles.groupCard}>
            <View style={styles.debugBlock}>
              <Text style={styles.debugTitle}>Teste de Push</Text>
              <Text style={styles.debugText}>
                Envia uma notificacao push para a sua propria conta para validar registro do token, fila e entrega.
              </Text>
              <TouchableOpacity
                style={[
                  styles.testPushBtn,
                  sendTestPushMutation.isPending && styles.testPushBtnDisabled,
                ]}
                onPress={handleSendTestPush}
                disabled={sendTestPushMutation.isPending}
              >
                <Text style={styles.testPushBtnText}>
                  {sendTestPushMutation.isPending ? 'Enviando...' : 'Enviar teste de push'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>🚪 Encerrar Sessão</Text>
        </TouchableOpacity>
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
  content: { padding: 20, paddingBottom: 40 },
  group: { marginBottom: 24 },
  groupTitle: {
    fontSize: 10, fontWeight: '800', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  settingLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  settingValue: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
  divider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: 20 },
  debugBlock: { padding: 20 },
  debugTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  debugText: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginBottom: 16 },
  testPushBtn: {
    backgroundColor: '#2563EB',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testPushBtnDisabled: { opacity: 0.6 },
  testPushBtnText: { fontSize: 13, fontWeight: '800', color: colors.white },
  logoutBtn: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutBtnText: { fontSize: 13, fontWeight: '800', color: '#DC2626' },
});
