import { getStatusLabel, getStatusHexColor, getStatusHexBg } from '@entregapro/ui/constants';

export { getStatusLabel, getStatusHexColor as getStatusColor, getStatusHexBg as getStatusBg };

export const colors = {
  // Primary palette
  primary: '#4F46E5',       // Indigo-600
  primaryDark: '#4338CA',   // Indigo-700
  primaryLight: '#6366F1',  // Indigo-500
  primaryBg: '#EEF2FF',     // Indigo-50

  // Semantic colors
  success: '#059669',       // Emerald-600
  successBg: '#ECFDF5',     // Emerald-50
  warning: '#D97706',       // Amber-600
  warningBg: '#FFFBEB',     // Amber-50
  error: '#DC2626',         // Red-600
  errorBg: '#FEF2F2',       // Red-50
  info: '#2563EB',          // Blue-600
  infoBg: '#EFF6FF',        // Blue-50

  // Neutrals
  white: '#FFFFFF',
  background: '#F8FAFC',    // Slate-50
  surface: '#FFFFFF',
  border: '#E2E8F0',        // Slate-200
  borderLight: '#F1F5F9',   // Slate-100
  text: '#0F172A',          // Slate-900
  textSecondary: '#64748B', // Slate-500
  textTertiary: '#94A3B8',  // Slate-400
  muted: '#CBD5E1',         // Slate-300

  // Status colors for deliveries
  statusPending: '#6B7280',
  statusAssigned: '#2563EB',
  statusLoading: '#D97706',
  statusInTransit: '#7C3AED',
  statusDelivered: '#059669',
  statusCancelled: '#DC2626',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const typography = {
  h1: {
    fontSize: fontSize['3xl'],
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    color: colors.text,
  },
  h2: {
    fontSize: fontSize['2xl'],
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    color: colors.text,
  },
  h3: {
    fontSize: fontSize.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  body: {
    fontSize: fontSize.sm,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: '600' as const,
    color: colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  badge: {
    fontSize: 8,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
};
