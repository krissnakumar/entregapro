import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { StatusBadge } from '../ui/StatusBadge';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Sparkles, CheckCircle, XCircle, Truck, MapPin, Weight,
  Box, Clock, AlertTriangle, Loader2, RefreshCw, ChevronRight,
  User, FileText,
} from 'lucide-react';

export function DispatchAssignmentPanel() {
  const queryClient = useQueryClient();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: suggestions, isLoading, refetch } = useQuery({
    queryKey: ['assignment-suggestions'],
    queryFn: () => api.get<any>('/assignment/recommend'),
    enabled: false,
  });

  const autoAssign = useMutation({
    mutationFn: () => api.post('/dispatch/auto-assign'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['load-batches'] });
      toast.success(data.message || 'Alocação concluída!');
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Erro na alocação'),
  });

  const approveAssignment = useMutation({
    mutationFn: (id: string) => api.patch(`/load-batches/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['load-batches'] });
      toast.success('Lote aprovado!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao aprovar'),
  });

  const rejectAssignment = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/load-batches/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['load-batches'] });
      toast.success('Lote rejeitado');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao rejeitar'),
  });

  return (
    <div className="space-y-4">
      {/* Auto Assign Button */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles size={24} />
          <h3 className="text-lg font-bold">Alocação Automática</h3>
        </div>
        <p className="text-sm text-indigo-100 mb-4">
          O algoritmo agrupará entregas por proximidade e atribuirá ao melhor motorista/veículo.
        </p>
        <button
          onClick={() => autoAssign.mutate()}
          disabled={autoAssign.isPending}
          className="w-full p-3 bg-white text-indigo-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {autoAssign.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          Auto Atribuir Lotes
        </button>
      </div>

      {/* Pending Batches */}
      <PendingBatchesList
        onApprove={(id) => approveAssignment.mutate(id)}
        onReject={(id) => rejectAssignment.mutate({ id })}
        isApproving={approveAssignment.isPending}
        isRejecting={rejectAssignment.isPending}
      />
    </div>
  );
}

function PendingBatchesList({ onApprove, onReject, isApproving, isRejecting }: {
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['load-batches', 'pending'],
    queryFn: () => api.get<any>('/load-batches?status=CREATED'),
    refetchInterval: 15000,
  });

  const pendingBatches = batches?.data?.filter((b: any) => b.status === 'CREATED' || b.status === 'ASSIGNED') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (pendingBatches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
        <p className="text-sm text-slate-500">Nenhum lote pendente de aprovação</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Lotes Pendentes ({pendingBatches.length})
      </h3>
      {pendingBatches.map((batch: any) => (
        <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-bold text-slate-900">{batch.batchCode}</p>
              <p className="text-xs text-slate-500">
                {batch.driver?.user?.name || 'Sem motorista'} • {batch.vehicle?.vehicleNumber || 'N/A'}
              </p>
            </div>
            <StatusBadge status={batch.status} size="sm" />
          </div>

          {/* Batch Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-slate-900">{batch.totalDeliveries}</p>
              <p className="text-[9px] text-slate-500 uppercase">Entregas</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-slate-900">{batch.totalWeight?.toFixed(0) || '-'}</p>
              <p className="text-[9px] text-slate-500 uppercase">kg</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-slate-900">{batch.estimatedDurationMinutes ? `${Math.round(batch.estimatedDurationMinutes / 60)}h` : '-'}</p>
              <p className="text-[9px] text-slate-500 uppercase">Estimado</p>
            </div>
          </div>

          {/* Deliveries Preview */}
          {batch.deliveries && batch.deliveries.length > 0 && (
            <div className="space-y-1 mb-3">
              {batch.deliveries.slice(0, 3).map((bd: any) => (
                <div key={bd.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[8px] shrink-0">
                    {bd.stopOrder}
                  </div>
                  <span className="truncate">{bd.delivery?.customer?.name || 'Cliente'}</span>
                  <ChevronRight size={10} className="text-slate-300 shrink-0" />
                </div>
              ))}
              {batch.deliveries.length > 3 && (
                <p className="text-[10px] text-slate-400">+{batch.deliveries.length - 3} mais</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(batch.id)}
              disabled={isApproving}
              className="flex-1 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              {isApproving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Aprovar
            </button>
            <button
              onClick={() => onReject(batch.id)}
              disabled={isRejecting}
              className="flex-1 p-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <XCircle size={12} />
              Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
