import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Bell, Check, Clock, Info, AlertCircle, Truck,
  Package, Fuel, FileText, X, CheckCheck,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  payload?: any;
  createdAt: string;
}

interface NotificationCenterProps {
  maxHeight?: string;
  showHeader?: boolean;
}

const NOTIFICATION_ICONS: Record<string, React.ComponentType<any>> = {
  DELIVERY_ASSIGNED: Truck,
  DELIVERY_FAILED: AlertCircle,
  DELIVERED: CheckCircle,
  LOADING_STARTED: Package,
  LOADED: Package,
  IN_TRANSIT: Truck,
  DRIVER_ACCEPTED: CheckCircle,
  ADMIN_ALERT: AlertCircle,
  DISPATCHER_ALERT: AlertCircle,
  EXCEL_UPLOAD: FileText,
  DELAY_ALERT: Clock,
};

function CheckCircle({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function NotificationCenter({ maxHeight = '400px', showHeader = true }: NotificationCenterProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Todas as notificações marcadas como lidas');
    },
  });

  const filteredNotifications = (notifications || []).filter(
    (n) => filter === 'all' || !n.isRead,
  );

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {showHeader && (
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Notificações</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 uppercase"
            >
              {filter === 'all' ? 'Não lidas' : 'Todas'}
            </button>
            <button
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:no-underline flex items-center gap-1"
            >
              <CheckCheck size={12} />
              Marcar todas
            </button>
          </div>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Bell size={24} className="mx-auto mb-2 text-slate-200" />
            <p className="text-sm">
              {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const Icon = NOTIFICATION_ICONS[notif.type || ''] || Info;
            return (
              <div
                key={notif.id}
                className={cn(
                  'p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group',
                  !notif.isRead && 'bg-blue-50/50',
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      'mt-0.5 p-1.5 rounded-full shrink-0',
                      notif.isRead
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-blue-100 text-blue-600',
                    )}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-xs font-bold text-slate-900',
                          !notif.isRead && 'text-blue-900',
                        )}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead.mutate(notif.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded shrink-0"
                          title="Marcar como lida"
                        >
                          <Check size={12} className="text-blue-600" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center mt-1.5">
                      <Clock size={10} className="mr-1" />
                      {new Date(notif.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
