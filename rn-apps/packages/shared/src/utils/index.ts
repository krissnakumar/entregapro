// Re-export all platform-agnostic utilities from @entregapro/ui
export {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  formatWeight,
  formatVolume,
  getInitials,
  formatPhone,
  cn,
} from '@entregapro/ui/utils';

/**
 * Platform detection without importing react-native directly.
 * Runtime detection via typeof checks for React Native globals.
 */
const RN_PLATFORM: string | undefined =
  typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
    ? (globalThis as any).Platform?.OS
    : undefined;

export function isAndroid(): boolean {
  return RN_PLATFORM === 'android';
}

export function isIOS(): boolean {
  return RN_PLATFORM === 'ios';
}
