import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';
import {
  Fuel, CheckCircle, XCircle, Clock, DollarSign, Receipt, Truck, User,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

export function FuelApprovalQueue() {
  const queryClient = useQueryClient();

  const { data: fuelRequests, isLoading } = useQuery({
    queryKey: ['fuel-requests', 'pending'],
    queryFn: () => api.get<any>('/fuel-requests?status=REQUESTED'),
    refetchInterval: 15000,
  });

  const approveFuel = useMutation({
    mutationFn: (id: string) => api.patch(`/fuel-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-requests'] });
      toast.success('Solicitação de combustível aprovada!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao aprovar'),
  });

  const rejectFuel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/fuel-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-requests'] });
      toast.success('Solicitação rejeitada');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao rejeitar'),
  });

  const requests = fuelRequests?.data?.filter((r: any) => r.status === 'REQUESTED') || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Combustível Pendente
        </h3>
        {requests.length > 0 && (
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {requests.length}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-xs text-slate-500">Nenhuma solicitação pendente</p>
        </div>
      ) : (
        requests.map((req: any) => (
          <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Fuel size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {req.liters ? `${req.liters}L` : 'Solicitação'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {req.driver?.user?.name || 'Motorista'}
                  </p>
                </div>
              </div>
              <StatusBadge status="REQUESTED" size="sm" />
            </div>

            {/* Details */}
            <div className="space-y-1.5 mb-3">
              {req.vehicle?.plateNumber && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Truck size={12} className="text-slate-400" />
                  <span>{req.vehicle.plateNumber}</span>
                </div>
              )}
              {req.odometer !== undefined && req.odometer !== null && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="text-slate-400">km:</span>
                  <span>{req.odometer.toLocaleString('pt-BR')}</span>
                </div>
              )}
              {req.estimatedCost && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <DollarSign size={12} className="text-slate-400" />
                  <span>R$ {req.estimatedCost.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => approveFuel.mutate(req.id)}
                disabled={approveFuel.isPending}
                className="flex-1 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {approveFuel.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Aprovar
              </button>
              <button
                onClick={() => rejectFuel.mutate({ id: req.id })}
                disabled={rejectFuel.isPending}
                className="flex-1 p-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <XCircle size={12} />
                Rejeitar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
