import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { DriverWorkloadPanel } from './DriverWorkloadPanel';
import { GpsSimulatorPanel } from './GpsSimulatorPanel';
import DispatchBoard from '../DispatchBoard';
import MapView from '../MapView';
import {
  LayoutDashboard, Map, Users, Truck, Clock, AlertTriangle,
  PackageCheck, ClipboardList, Navigation, Loader2, Route,
  Sparkles, ChevronRight, Eye, ArrowLeft,
} from 'lucide-react';

type Tab = 'kanban' | 'mapa' | 'carga' | 'rotas';

export function DispatchCommandCenter() {
  const [tab, setTab] = useState<Tab>('kanban');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['active-dispatch'],
    queryFn: () => api.get<any[]>('/dispatch'),
    refetchInterval: 10000,
  });

  const { data: routesData } = useQuery({
    queryKey: ['routes'],
    queryFn: () => api.get<{ data: any[]; total: number }>('/routes?take=20'),
    refetchInterval: 15000,
  });

  const { data: routeDetail } = useQuery({
    queryKey: ['route', selectedRoute],
    queryFn: () => api.get<any>(`/routes/${selectedRoute}`),
    enabled: !!selectedRoute,
    refetchInterval: 10000,
  });

  const optimizeMutation = useMutation({
    mutationFn: () => api.post<any>('/dispatch/optimize'),
    onSuccess: (data) => {
      toast.success(data.message || 'Rotas otimizadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['active-dispatch'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao otimizar rotas');
    },
  });

  const deliveries = orders?.flatMap(o => o.deliveries) || [];
  const routes = routesData?.data || [];

  const lateDeliveries = deliveries.filter((d: any) => {
    if (d.status === 'DELIVERED' || d.status === 'CANCELLED') return false;
    if (!d.scheduledTime) return false;
    return new Date(d.scheduledTime) < new Date();
  });

  const stats = [
    { label: 'Pendentes', value: deliveries.filter((d: any) => d.status === 'PENDING').length, color: 'text-rose-600', bg: 'bg-rose-50', icon: ClipboardList },
    { label: 'Carregando', value: deliveries.filter((d: any) => d.status === 'LOADING').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: PackageCheck },
    { label: 'Em Rota', value: deliveries.filter((d: any) => d.status === 'IN_TRANSIT').length, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Truck },
    { label: 'Entregues', value: deliveries.filter((d: any) => d.status === 'DELIVERED').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Clock },
    { label: 'Atrasadas', value: lateDeliveries.length, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
  ];

  const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'kanban', label: 'Kanban', icon: LayoutDashboard },
    { key: 'mapa', label: 'Mapa', icon: Map },
    { key: 'carga', label: 'Carga', icon: Users },
    { key: 'rotas', label: 'Rotas', icon: Route },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
              {stats.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn('p-2 rounded-xl', s.bg)}>
                        <Icon size={16} className={s.color} />
                      </div>
                      {isLoading && <Loader2 size={12} className="animate-spin text-slate-300" />}
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                    <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => optimizeMutation.mutate()}
              disabled={optimizeMutation.isPending}
              className="px-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 h-fit shrink-0 cursor-pointer"
            >
              {optimizeMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Otimizar Rotas
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1 w-fit">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer',
                    tab === t.key ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  )}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-[500px]">
            {tab === 'kanban' && <DispatchBoard />}
            {tab === 'mapa' && (
              <div className="h-[600px] rounded-2xl overflow-hidden">
                <MapView />
              </div>
            )}
            {tab === 'carga' && <DriverWorkloadPanel />}
            {tab === 'rotas' && (
              selectedRoute ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Voltar para rotas
                  </button>
                  {routeDetail ? (
                    <RouteDetailCard route={routeDetail} />
                  ) : (
                    <div className="flex justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                  )}
                </div>
              ) : (
                <RouteList
                  routes={routes}
                  onSelect={setSelectedRoute}
                  onOptimize={() => optimizeMutation.mutate()}
                  isOptimizing={optimizeMutation.isPending}
                />
              )
            )}
          </div>
        </div>

        <div className="xl:col-span-1 space-y-4">
          <GpsSimulatorPanel />
        </div>
      </div>
    </div>
  );
}

function RouteList({
  routes,
  onSelect,
  onOptimize,
  isOptimizing,
}: {
  routes: any[];
  onSelect: (id: string) => void;
  onOptimize: () => void;
  isOptimizing: boolean;
}) {
  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <Route size={48} className="mx-auto mb-4 text-slate-200" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhuma rota criada</h3>
        <p className="text-sm text-slate-500 mb-6">Clique em "Otimizar Rotas" para criar rotas inteligentes baseadas nas entregas pendentes.</p>
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
        >
          {isOptimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Otimizar Rotas Agora
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    SUGGESTED: 'bg-amber-100 text-amber-700',
    STARTED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Rotas ({routes.length})
        </h3>
      </div>
      {routes.map((route: any) => (
        <button
          key={route.id}
          onClick={() => onSelect(route.id)}
          className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-slate-900 truncate">
                  {route.name || `Rota ${route.id?.slice(0, 8)}`}
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold',
                  statusColors[route.status] || 'bg-slate-100 text-slate-600'
                )}>
                  {route.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Truck size={11} />
                  {route.vehicle?.vehicleNumber || 'Sem veículo'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {route.stopCount || 0} paradas
                </span>
                {route.totalWeight ? (
                  <span>{route.totalWeight}kg</span>
                ) : null}
              </div>
            </div>
            <div className="text-right shrink-0 flex items-center gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {route.optimizedAt ? (
                    <span className="text-emerald-600 text-xs">Otimizada</span>
                  ) : (
                    <span className="text-amber-600 text-xs">Pendente</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">{route.driver?.user?.name || 'Sem motorista'}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function RouteDetailCard({ route }: { route: any }) {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-600',
    ARRIVED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{route.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {route.driver?.user?.name || 'Sem motorista'} • {route.vehicle?.vehicleNumber || 'Sem veículo'}
            </p>
          </div>
          <span className={cn(
            'px-3 py-1 rounded-lg text-xs font-bold',
            route.status === 'SUGGESTED' ? 'bg-amber-100 text-amber-700' :
            route.status === 'STARTED' ? 'bg-blue-100 text-blue-700' :
            route.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          )}>
            {route.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Paradas</p>
            <p className="text-xl font-black text-slate-900">{route.stopCount || 0}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Peso Total</p>
            <p className="text-xl font-black text-slate-900">{route.totalWeight || 0}kg</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Carga</p>
            <p className="text-xl font-black text-slate-900">{route.capacityUtilization ? `${route.capacityUtilization.toFixed(0)}%` : '-'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Distância</p>
            <p className="text-xl font-black text-slate-900">{route.totalDistance ? `${route.totalDistance.toFixed(0)}m` : '-'}</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-700 mb-3">Paradas</h3>
        <div className="space-y-2">
          {route.stops?.map((stop: any, idx: number) => (
            <div key={stop.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {stop.invoice?.invoiceNumber || `Nota ${stop.invoiceId?.slice(0, 8)}`}
                </p>
                <p className="text-xs text-slate-500">
                  {stop.invoice?.weight ? `${stop.invoice.weight}kg` : ''}
                  {stop.invoice?.volume ? ` • ${stop.invoice.volume}m³` : ''}
                </p>
                {stop.actualArrival && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Chegou: {new Date(stop.actualArrival).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              <span className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold',
                statusColors[stop.status] || 'bg-slate-100 text-slate-600'
              )}>
                {stop.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
