import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  AlertTriangle, MapPin, Clock, User, Truck, FileText,
  Loader2, ChevronRight, Phone,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

export function DeliveryFailureQueue() {
  const { data: failedDeliveries, isLoading } = useQuery({
    queryKey: ['dispatcher-deliveries', 'failed'],
    queryFn: () => api.get<any>('/deliveries?deliveryStatus=FAILED'),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-300" />
      </div>
    );
  }

  const failures = failedDeliveries?.data || [];

  if (failures.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
        <p className="text-sm text-slate-500">Nenhuma entrega falhada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Entregas com Falha ({failures.length})
      </h3>

      {failures.map((delivery: any) => (
        <div key={delivery.id} className="bg-white rounded-2xl border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {delivery.customer?.name || delivery.customerName || 'Cliente'}
                </p>
                <StatusBadge status="FAILED" size="sm" />
              </div>

              <p className="text-xs text-slate-500 mb-2">
                {delivery.street}, {delivery.number} - {delivery.neighborhood}
              </p>

              {delivery.failureReason && (
                <div className="bg-red-50 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-red-600 font-medium uppercase mb-0.5">Motivo da Falha</p>
                  <p className="text-xs text-red-800">{delivery.failureReason}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                {delivery.driver?.user?.name && (
                  <span className="flex items-center gap-1">
                    <Truck size={10} /> {delivery.driver.user.name}
                  </span>
                )}
                {delivery.failedAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {new Date(delivery.failedAt).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

              {/* Action: Reassign or Mark as Done */}
              <div className="mt-3 flex gap-2">
                <button className="flex-1 p-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                  <Truck size={12} />
                  Reatribuir
                </button>
                <button className="p-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                  <Phone size={12} />
                  Ligar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
