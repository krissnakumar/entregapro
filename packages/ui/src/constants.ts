/**
 * Shared constants & helpers — platform-agnostic
 * Usable by both React DOM and React Native apps.
 */

// ─── Status Labels ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  ASSIGNED: 'Atribuído',
  LOADING: 'Carregando',
  LOADING_STARTED: 'A Carregar',
  LOADING_COMPLETED: 'Carregado',
  TRUCK_ARRIVED: 'Caminhão Chegou',
  DISPATCHED: 'Despachado',
  IN_TRANSIT: 'Em Trânsito',
  ARRIVED_DESTINATION: 'Chegou ao Destino',
  UNLOADING: 'Descarregando',
  COMPLETED: 'Concluído',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  DELIVERY_FAILED: 'Falha na Entrega',
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

// ─── Status Colors (Tailwind-friendly class segments) ───────────────────────
// For React Native see `getStatusColorToken` which returns hex values.

export const STATUS_COLOR_CLASSES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  LOADING: 'bg-orange-50 text-orange-700 border-orange-200',
  LOADING_STARTED: 'bg-orange-50 text-orange-700 border-orange-200',
  LOADING_COMPLETED: 'bg-amber-50 text-amber-700 border-amber-200',
  TRUCK_ARRIVED: 'bg-purple-50 text-purple-700 border-purple-200',
  DISPATCHED: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_TRANSIT: 'bg-amber-50 text-amber-700 border-amber-200',
  ARRIVED_DESTINATION: 'bg-teal-50 text-teal-700 border-teal-200',
  UNLOADING: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  DELIVERY_FAILED: 'bg-red-50 text-red-700 border-red-200',
};

export function getStatusColorClasses(status: string): string {
  return STATUS_COLOR_CLASSES[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

// ─── Status Colors (hex values for React Native) ────────────────────────────

export const STATUS_HEX_COLORS: Record<string, string> = {
  PENDING: '#6B7280',
  ASSIGNED: '#2563EB',
  LOADING: '#D97706',
  LOADING_STARTED: '#D97706',
  LOADING_COMPLETED: '#D97706',
  TRUCK_ARRIVED: '#7C3AED',
  DISPATCHED: '#7C3AED',
  IN_TRANSIT: '#7C3AED',
  ARRIVED_DESTINATION: '#0D9488',
  UNLOADING: '#0891B2',
  COMPLETED: '#059669',
  DELIVERED: '#059669',
  CANCELLED: '#DC2626',
  DELIVERY_FAILED: '#DC2626',
};

export function getStatusHexColor(status: string): string {
  return STATUS_HEX_COLORS[status] || '#94A3B8';
}

export const STATUS_HEX_BGS: Record<string, string> = {
  PENDING: '#F3F4F6',
  ASSIGNED: '#EFF6FF',
  LOADING: '#FFFBEB',
  LOADING_STARTED: '#FFFBEB',
  LOADING_COMPLETED: '#FFFBEB',
  TRUCK_ARRIVED: '#F5F3FF',
  DISPATCHED: '#F5F3FF',
  IN_TRANSIT: '#F5F3FF',
  ARRIVED_DESTINATION: '#F0FDFA',
  UNLOADING: '#ECFEFF',
  COMPLETED: '#ECFDF5',
  DELIVERED: '#ECFDF5',
  CANCELLED: '#FEF2F2',
  DELIVERY_FAILED: '#FEF2F2',
};

export function getStatusHexBg(status: string): string {
  return STATUS_HEX_BGS[status] || '#F8FAFC';
}

// ─── Roles ──────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  DISPATCHER: 'Despachante',
  DRIVER: 'Motorista',
  HELPER: 'Ajudante',
  ACCOUNTANT: 'Contador',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}
