import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  Search, 
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  User,
  Navigation
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import OrdersList from '../components/OrdersList';

type DeliveriesView = 'overview' | 'orders' | 'detailed';

const DeliveriesManagement = () => {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<DeliveriesView>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: deliveries, isLoading, refetch } = useQuery({
    queryKey: ['deliveries-management'],
    queryFn: () => api.get<any[]>('/deliveries').catch(() => []),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/deliveries/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-management'] });
      toast.success('Status da entrega atualizado!');
    },
    onError: () => toast.error('Falha ao atualizar status.'),
  });

  const filteredDeliveries = useMemo(() => {
    const list = deliveries || [];
    return list.filter((d: any) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        d.deliveryNumber?.toLowerCase().includes(term) ||
        d.customer?.name?.toLowerCase().includes(term) ||
        d.customerName?.toLowerCase().includes(term) ||
        d.deliveryAddress?.toLowerCase().includes(term) ||
        d.driver?.user?.name?.toLowerCase().includes(term) ||
        d.driverName?.toLowerCase().includes(term)
      );
    });
  }, [deliveries, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    const list = deliveries || [];
    return {
      total: list.length,
      inTransit: list.filter((d: any) => d.status === 'IN_TRANSIT').length,
      delivered: list.filter((d: any) => d.status === 'DELIVERED').length,
      pending: list.filter((d: any) => d.status === 'PENDING' || d.status === 'ASSIGNED').length,
      delayed: list.filter((d: any) => d.status === 'DELAYED' || d.delayed).length,
    };
  }, [deliveries]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; bg: string }> = {
      PENDING: { label: 'Pendente', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
      ASSIGNED: { label: 'Atribuído', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      LOADING: { label: 'Carregando', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      IN_TRANSIT: { label: 'Em Trânsito', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      DELIVERED: { label: 'Entregue', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      DELAYED: { label: 'Atrasado', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
      CANCELLED: { label: 'Cancelado', bg: 'bg-red-50 text-red-700 border-red-200' },
    };
    return badges[status] || { label: status, bg: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  const exportToCSV = () => {
    const data = filteredDeliveries;
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar.');
      return;
    }
    const headers = 'ID,Cliente,Endereço,Status,Material,Quantidade,Motorista,Veículo';
    const rows = data.map((d: any) => 
      `"${d.deliveryNumber || d.id}","${d.customer?.name || d.customerName || ''}","${d.deliveryAddress || ''}","${d.status}","${d.materialType || ''}","${d.quantity || ''}","${d.driver?.user?.name || d.driverName || ''}","${d.vehicle?.vehicleNumber || d.vehicleNumber || ''}"`
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entregas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 font-sans select-none">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                Gestão de Entregas
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {kpis.total} registros
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Monitoramento de Frota</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Acompanhe todas as entregas em tempo real, gerencie status e visualize o progresso da frota.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex bg-slate-100 rounded-xl p-1">
              {(['overview', 'orders', 'detailed'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                    activeView === view
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {view === 'overview' ? 'Visão Geral' : view === 'orders' ? 'Despachos' : 'Detalhado'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { refetch(); toast.success('Dados sincronizados!'); }}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
              title="Sincronizar"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-slate-800">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis.total}</p>
          <span className="text-[8px] font-bold text-slate-500">Entregas registradas</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Em Trânsito</p>
          <p className="text-xl font-black text-blue-600 mt-1">{kpis.inTransit}</p>
          <span className="text-[8px] font-bold text-blue-600">Em rota</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entregues</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{kpis.delivered}</p>
          <span className="text-[8px] font-bold text-emerald-600">Concluídas</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pendentes</p>
          <p className="text-xl font-black text-amber-600 mt-1">{kpis.pending}</p>
          <span className="text-[8px] font-bold text-amber-600">Aguardando</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm border-l-4 border-l-rose-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Atrasadas</p>
          <p className="text-xl font-black text-rose-600 mt-1">{kpis.delayed}</p>
          <span className="text-[8px] font-bold text-rose-600">Requer atenção</span>
        </div>
      </div>

      {activeView === 'orders' ? (
        <OrdersList />
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por ID, cliente, motorista, endereço..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="ASSIGNED">Atribuído</option>
                  <option value="LOADING">Carregando</option>
                  <option value="IN_TRANSIT">Em Trânsito</option>
                  <option value="DELIVERED">Entregue</option>
                  <option value="DELAYED">Atrasado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Exportar
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Entregas */}
          <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center text-slate-400 font-bold">Carregando entregas...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4 pl-6">ID</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Material</th>
                      <th className="p-4">Motorista</th>
                      <th className="p-4">Veículo</th>
                      <th className="p-4">Endereço</th>
                      <th className="p-4 pr-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <Package size={32} className="mx-auto mb-2 opacity-30" />
                          Nenhuma entrega encontrada com os filtros ativos.
                        </td>
                      </tr>
                    ) : (
                      filteredDeliveries.map((d: any) => {
                        const badge = getStatusBadge(d.status);
                        return (
                          <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4 pl-6 font-mono font-bold text-indigo-600">
                              {d.deliveryNumber || `#${d.id.slice(0, 8)}`}
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-900">{d.customer?.name || d.customerName || 'N/A'}</span>
                            </td>
                            <td className="p-4">
                              <span className={cn('px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1', badge.bg)}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-800">{d.materialType || '-'}</span>
                              {d.quantity && <span className="text-slate-400 ml-1">({d.quantity})</span>}
                            </td>
                            <td className="p-4">
                              <span className="flex items-center gap-1.5">
                                <User size={12} className="text-slate-400" />
                                {d.driver?.user?.name || d.driverName || 'Não atribuído'}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-600">
                              {d.vehicle?.vehicleNumber || d.vehicleNumber || '-'}
                            </td>
                            <td className="p-4 max-w-[200px] truncate text-slate-500">
                              {d.deliveryAddress || d.customer?.address || '-'}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => window.open(`/tracking/${d.id}`, '_blank')}
                                  className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                  title="Rastrear"
                                >
                                  <Navigation size={14} />
                                </button>
                                {d.status !== 'DELIVERED' && d.status !== 'CANCELLED' && (
                                  <button
                                    onClick={() => {
                                      const nextStatus = d.status === 'IN_TRANSIT' ? 'DELIVERED' : 'IN_TRANSIT';
                                      updateStatusMutation.mutate({ id: d.id, status: nextStatus });
                                    }}
                                    className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                    title={d.status === 'IN_TRANSIT' ? 'Marcar como entregue' : 'Iniciar trânsito'}
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>Exibindo <strong className="text-slate-800">{filteredDeliveries.length}</strong> de <strong className="text-slate-800">{deliveries?.length || 0}</strong> entregas</span>
              <span className="px-2 py-1 bg-white border rounded">Última atualização: Ao vivo</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeliveriesManagement;
