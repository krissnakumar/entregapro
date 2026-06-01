import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Order } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { Role } from '../types';
import { Package, MapPin, Clock, Plus, LayoutGrid, List, Sparkles, Share2, ExternalLink, Loader2, FileText, ClipboardList, Truck, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import DispatchBoard from './DispatchBoard';
import DispatcherOverview from './DispatcherOverview';
import InvoiceUploadModal from './InvoiceUploadModal';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const OrdersList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['active-dispatch'],
    queryFn: () => api.get<any[]>('/dispatch'),
  });

  const handleOptimize = async () => {
    setIsOptimizing(true);
    toast.loading('Executando despacho inteligente...', { id: 'optimize' });
    
    try {
      const response = await api.post<{ message: string; savedDistanceKm?: number; assignments: any[] }>('/dispatch/optimize', {});
      setIsOptimizing(false);
      
      const savedDistance = response.savedDistanceKm || 0;
      toast.success(response.message || 'Despacho inteligente concluído!', { 
        id: 'optimize',
        description: response.assignments?.length > 0 
          ? `Alocados ${response.assignments.length} veículos de forma inteligente. Economia de ${savedDistance}km de distância.` 
          : 'Nenhuma nova alocação pendente ou motorista disponível.',
        duration: 6000,
      });
      refetch();
    } catch (err: any) {
      setIsOptimizing(false);
      toast.error('Falha ao rodar algoritmo de otimização de despacho.', { id: 'optimize' });
    }
  };

  const copyTrackingLink = (orderId: string) => {
    const link = `${window.location.origin}/tracking/${orderId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de rastreamento copiado para a área de transferência!', {
      description: 'Agora você pode compartilhar com o cliente diretamente.',
      icon: <Share2 size={16} />
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Comando de Operações</h2>
          <p className="text-sm text-slate-500 font-medium">Orquestração de frota e despacho em tempo real</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-white border shadow-sm rounded-xl p-1">
            <button 
              onClick={() => setView('board')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'board' ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
              )}
              title="Visão de Painel Kanban"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'list' ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
              )}
              title="Visão de Lista"
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="bg-white border text-indigo-600 px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-indigo-50 transition-all shadow-sm font-bold disabled:opacity-50"
          >
            {isOptimizing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span className="text-sm">Otimizar Rotas</span>
          </button>

          {user?.role === Role.ADMIN && (
            <button 
              onClick={() => setIsInvoiceModalOpen(true)}
              className="bg-white border border-indigo-200 text-indigo-700 px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-indigo-50 transition-all shadow-sm font-bold"
            >
              <FileText size={18} />
              <span className="text-sm">Importar NF-e</span>
            </button>
          )}
        </div>
      </div>

      <DispatcherOverview />

      <div className="flex-1 min-h-0">
        {view === 'board' ? (
          <DispatchBoard />
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino da Entrega</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade da Frota</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume / Carga</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders?.flatMap(o => o.deliveries || []).map((delivery: any, idx: number) => {
                  const simulatedWeight = 14 + (idx * 4.5);
                  const isHeavy = simulatedWeight > 20;

                  return (
                    <tr key={delivery.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-xs uppercase">
                        #{delivery.deliveryNumber || delivery.id.split('-')[0]}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{delivery.customer?.name || 'Cliente Avulso'}</p>
                          <p className="text-[10px] text-slate-500 flex items-center mt-1 font-medium">
                            <MapPin size={10} className="mr-1 text-indigo-500" /> {delivery.deliveryAddress || 'São Paulo - SP'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                          delivery.status === 'PENDING' ? "bg-slate-100 text-slate-600 border-slate-200" :
                          delivery.status === 'ASSIGNED' ? "bg-blue-50 text-blue-600 border-blue-100" :
                          delivery.status === 'IN_TRANSIT' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          delivery.status === 'DELIVERED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          delivery.status === 'DELAYED' ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" :
                          "bg-slate-50 text-slate-600 border-slate-100"
                        )}>
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs font-bold text-slate-600">
                          <Truck size={14} className="mr-2 text-indigo-500" />
                          {delivery.driver?.user?.name || 'Não Atribuído'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            isHeavy ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-700"
                          )}>
                            {simulatedWeight.toFixed(1)}t
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Carga Seca
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => copyTrackingLink(delivery.id)}
                            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-colors"
                            title="Compartilhar Link de Rastreamento"
                          >
                            <Share2 size={16} />
                          </button>
                          <button 
                            onClick={() => window.open(`/tracking/${delivery.id}`, '_blank')}
                            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-colors"
                            title="Visualizar Tela do Cliente Ao Vivo"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!orders || orders.length === 0) && (
              <div className="p-20 text-center text-slate-400 italic flex flex-col items-center">
                <div className="w-16 h-16 bg-white border rounded-2xl flex items-center justify-center mb-4">
                  <ClipboardList size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-medium">Fila limpa. Nenhum despacho ativo localizado no momento.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <InvoiceUploadModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </div>
  );
};

export default OrdersList;
