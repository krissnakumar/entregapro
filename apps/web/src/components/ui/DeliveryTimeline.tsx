import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import {
  Clock, CheckCircle, Truck, Package, AlertCircle,
  Camera, FileText, MessageSquare, MapPin, Loader2,
  Fuel, Edit, User,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  eventType: string;
  oldStatus?: string;
  newStatus?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  signatureUrl?: string;
  actorId?: string;
  actorRole?: string;
  metadata?: any;
  createdAt: string;
}

interface DeliveryTimelineProps {
  deliveryId: string;
  compact?: boolean;
  maxItems?: number;
}

const EVENT_ICONS: Record<string, React.ComponentType<any>> = {
  STATUS_CHANGE: Clock,
  LOADING: Package,
  PROBLEM: AlertCircle,
  NOTE: MessageSquare,
  FUEL: Fuel,
  POD: Camera,
};

const EVENT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  STATUS_CHANGE: { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-200' },
  LOADING: { bg: 'bg-cyan-100', text: 'text-cyan-600', ring: 'ring-cyan-200' },
  PROBLEM: { bg: 'bg-rose-100', text: 'text-rose-600', ring: 'ring-rose-200' },
  NOTE: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' },
  FUEL: { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-200' },
  POD: { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-200' },
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Criada',
  PENDING_DISPATCH: 'Aguardando Despacho',
  ASSIGNED: 'Atribuída',
  DRIVER_NOTIFIED: 'Motorista Notificado',
  ACCEPTED_BY_DRIVER: 'Aceita',
  LOADING_STARTED: 'Carregamento Iniciado',
  LOADED: 'Carregada',
  IN_TRANSIT: 'Em Trânsito',
  ARRIVED: 'Chegou',
  DELIVERED: 'Entregue',
  PARTIALLY_DELIVERED: 'Parcialmente Entregue',
  FAILED: 'Falhou',
  RETURNED: 'Devolvida',
  CANCELLED: 'Cancelada',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  DISPATCHER: 'Despachante',
  DRIVER: 'Motorista',
  SYSTEM: 'Sistema',
};

export function DeliveryTimeline({ deliveryId, compact = false, maxItems }: DeliveryTimelineProps) {
  const { data: timeline, isLoading } = useQuery({
    queryKey: ['delivery-timeline', deliveryId],
    queryFn: () => api.get<TimelineEvent[]>(`/deliveries/${deliveryId}/timeline`),
    enabled: !!deliveryId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-300" />
      </div>
    );
  }

  const events = maxItems ? (timeline || []).slice(0, maxItems) : timeline || [];

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        <Clock size={24} className="mx-auto mb-2 text-slate-200" />
        Nenhum evento registrado
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const Icon = EVENT_ICONS[event.eventType] || Clock;
        const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.STATUS_CHANGE;
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-3">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200" />
            )}

            {/* Icon */}
            <div className={cn(
              'relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-2',
              colors.bg,
              colors.text,
              colors.ring,
            )}>
              <Icon size={14} />
            </div>

            {/* Content */}
            <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  {event.eventType === 'STATUS_CHANGE' && event.oldStatus && event.newStatus ? (
                    <p className="text-sm font-semibold text-slate-900">
                      {STATUS_LABELS[event.oldStatus] || event.oldStatus}
                      <span className="text-slate-400 mx-1">→</span>
                      {STATUS_LABELS[event.newStatus] || event.newStatus}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">
                      {event.note || event.eventType}
                    </p>
                  )}

                  {event.note && event.eventType !== 'STATUS_CHANGE' && (
                    <p className="text-xs text-slate-500 mt-0.5">{event.note}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">
                    {new Date(event.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(event.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Actor info */}
              {event.actorRole && (
                <div className="flex items-center gap-1 mt-1">
                  <User size={10} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400">
                    {ROLE_LABELS[event.actorRole] || event.actorRole}
                  </span>
                </div>
              )}

              {/* Photo */}
              {event.photoUrl && !compact && (
                <div className="mt-2">
                  <img
                    src={event.photoUrl}
                    alt="Foto do evento"
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                  />
                </div>
              )}

              {/* Location */}
              {event.latitude && event.longitude && !compact && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={10} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400">
                    {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TimelineCompact({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {events.slice(0, 5).map((event) => {
        const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS.STATUS_CHANGE;
        return (
          <div
            key={event.id}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium shrink-0',
              colors.bg,
              colors.text,
            )}
          >
            {event.newStatus && STATUS_LABELS[event.newStatus]}
          </div>
        );
      })}
    </div>
  );
}
