import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  Truck, MapPin, Clock, Package, CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

export function DispatcherDriverMonitor() {
  const { data: drivers, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<any>('/drivers'),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-300" />
      </div>
    );
  }

  const driverList = drivers?.data || [];

  if (driverList.length === 0) {
    return (
      <div className="text-center py-8">
        <Truck size={32} className="mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">Nenhum motorista cadastrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Monitor de Motoristas
      </h3>

      {driverList.map((driver: any) => {
        const user = driver.user;
        const vehicle = driver.vehicle;
        const activeDeliveries = driver.deliveries?.filter((d: any) =>
          ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'LOADING', 'LOADED'].includes(d.deliveryStatus || d.status)
        ) || [];

        return (
          <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'M'}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  activeDeliveries.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Motorista'}</p>
                  {vehicle && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      {vehicle.vehicleNumber || vehicle.plateNumber}
                    </span>
                  )}
                </div>

                {activeDeliveries.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {activeDeliveries.map((delivery: any) => (
                      <div key={delivery.id} className="flex items-center gap-2">
                        <StatusBadge status={delivery.deliveryStatus || delivery.status} size="sm" />
                        <span className="text-[10px] text-slate-500 truncate">
                          {delivery.customer?.name || delivery.customerName}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Sem entregas ativas</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
