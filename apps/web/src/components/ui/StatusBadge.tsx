import React from 'react';
import { cn } from '../../lib/utils';
import {
  Truck, CheckCircle, Clock, AlertCircle, X, Package,
  MapPin, ArrowRight, RotateCcw, Ban, Loader2,
} from 'lucide-react';

type DeliveryStatus =
  | 'CREATED' | 'PENDING_DISPATCH' | 'ASSIGNED' | 'DRIVER_NOTIFIED'
  | 'ACCEPTED_BY_DRIVER' | 'LOADING_STARTED' | 'LOADED' | 'IN_TRANSIT'
  | 'ARRIVED' | 'DELIVERED' | 'PARTIALLY_DELIVERED' | 'FAILED'
  | 'RETURNED' | 'CANCELLED';

interface StatusBadgeProps {
  status: DeliveryStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; borderColor: string; icon: React.ComponentType<any> }> = {
  CREATED: {
    label: 'Criada',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    borderColor: 'border-slate-200',
    icon: Package,
  },
  PENDING_DISPATCH: {
    label: 'Aguardando Despacho',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  ASSIGNED: {
    label: 'Atribuída',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Truck,
  },
  DRIVER_NOTIFIED: {
    label: 'Motorista Notificado',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: ArrowRight,
  },
  ACCEPTED_BY_DRIVER: {
    label: 'Aceita pelo Motorista',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: CheckCircle,
  },
  LOADING_STARTED: {
    label: 'Carregando',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    icon: Loader2,
  },
  LOADED: {
    label: 'Carregada',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    borderColor: 'border-teal-200',
    icon: Package,
  },
  IN_TRANSIT: {
    label: 'Em Trânsito',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Truck,
  },
  ARRIVED: {
    label: 'Chegou',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: MapPin,
  },
  DELIVERED: {
    label: 'Entregue',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    icon: CheckCircle,
  },
  PARTIALLY_DELIVERED: {
    label: 'Parcialmente Entregue',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertCircle,
  },
  FAILED: {
    label: 'Falhou',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    borderColor: 'border-rose-200',
    icon: X,
  },
  RETURNED: {
    label: 'Devolvida',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    borderColor: 'border-slate-200',
    icon: RotateCcw,
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: Ban,
  },
  // Legacy statuses
  PENDING: {
    label: 'Pendente',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Aceita',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: CheckCircle,
  },
  PICKING_UP: {
    label: 'Coletando',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    icon: Loader2,
  },
};

const SIZE_CONFIG = {
  sm: { text: 'text-[10px]', padding: 'px-1.5 py-0.5', iconSize: 10 },
  md: { text: 'text-xs', padding: 'px-2 py-1', iconSize: 12 },
  lg: { text: 'text-sm', padding: 'px-3 py-1.5', iconSize: 14 },
};

export function StatusBadge({ status, size = 'md', showIcon = true, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: AlertCircle,
  };
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg font-bold border',
        config.color,
        config.bg,
        config.borderColor,
        sizeConfig.text,
        sizeConfig.padding,
        className,
      )}
    >
      {showIcon && <Icon size={sizeConfig.iconSize} />}
      {config.label}
    </span>
  );
}

export function LoadingStatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    NOT_LOADED: { label: 'Não Carregado', color: 'text-slate-500', bg: 'bg-slate-100' },
    LOADING: { label: 'Carregando', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    LOADED: { label: 'Carregado', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    LOAD_ISSUE: { label: 'Problema no Carregamento', color: 'text-rose-600', bg: 'bg-rose-50' },
  };
  const c = config[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-100' };
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <span className={cn('inline-flex items-center rounded-lg font-bold', c.color, c.bg, sizeConfig.text, sizeConfig.padding)}>
      {c.label}
    </span>
  );
}
