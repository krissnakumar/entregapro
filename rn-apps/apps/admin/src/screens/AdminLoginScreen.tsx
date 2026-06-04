import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, api, colors, borderRadius, typography } from '@rn-apps/shared';

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Informe email e senha administrativos.');
      } else {
        Alert.alert('Atenção', 'Informe email e senha administrativos.');
      }
      return;
    }
    setLoading(true);
    try {
      const response = await api.post<{ access_token: string; refresh_token: string; user: any }>('/auth/login', {
        email: email.trim(),
        password,
      });
      setAuth(response.user, response.access_token, response.refresh_token);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Credenciais inválidas.');
      } else {
        Alert.alert('Erro de Autenticação', error.message || 'Credenciais inválidas.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>EP</Text>
          </View>
          <Text style={styles.brandName}>EntregaPRO</Text>
          <Text style={styles.brandTagline}>Administrador</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Portal Administrativo</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@entregapro.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Acessar Sistema</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Plataforma de gestão logística © EntregaPRO
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, backgroundColor: colors.primary, borderRadius: borderRadius.xl,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  brandName: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  brandTagline: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 3, marginTop: 4 },
  form: {
    backgroundColor: colors.surface, borderRadius: borderRadius['2xl'], padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  formTitle: { ...typography.h3, marginBottom: 20, textAlign: 'center' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { ...typography.label, marginBottom: 6, color: colors.textSecondary },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text,
  },
  button: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  footer: { ...typography.caption, textAlign: 'center', marginTop: 32, color: colors.textTertiary },
});
