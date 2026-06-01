import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

// Re-export shared utilities from @entregapro/ui
export {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  formatWeight,
  formatVolume,
  getInitials,
  formatPhone,
} from '@entregapro/ui/utils';

export {
  getStatusLabel,
  getStatusColorClasses,
  getStatusHexColor,
  getStatusHexBg,
  ROLE_LABELS,
  getRoleLabel,
  STATUS_LABELS,
} from '@entregapro/ui/constants';

/**
 * Tailwind-aware classname merger.
 * Uses twMerge + clsx to intelligently resolve conflicting Tailwind classes.
 * This is intentionally kept local to apps/web since rn-apps uses StyleSheet.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
