import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import {
  Truck, User, MapPin, Clock, FileText,
  Navigation, Activity, Bell, LogOut,
  Fuel, Layers, Menu, RefreshCw, AlertTriangle,
  Users, Route, Sparkles, Loader2, X, Play,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { FuelMaintenanceModule } from '../components/FuelMaintenanceModule';
import { DispatchCommandCenter } from '../components/dispatch/DispatchCommandCenter';

const DispatcherDashboard = () => {
  const { user, logout } = useAuthStore();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'gps' | 'fuel' | 'dispatch'>('console');
  const [showAlerts, setShowAlerts] = useState(false);

  const { data: deliveries, isLoading, isError, refetch } = useQuery({
    queryKey: ['dispatcher-deliveries'],
    queryFn: () => api.get<any[]>('/deliveries?take=100'),
    refetchInterval: 15_000,
  });

  const { data: workloads } = useQuery({
    queryKey: ['workload-alerts'],
    queryFn: () => api.get<any[]>('/workload/alerts').catch(() => []),
    refetchInterval: 30000,
    enabled: activeTab === 'console',
  });

  const { data: unavailability } = useQuery({
    queryKey: ['unavailable-customers'],
    queryFn: () => api.get<any[]>('/availability/unavailable').catch(() => []),
    refetchInterval: 30000,
    enabled: activeTab === 'console',
  });

  const alerts = [
    ...((workloads as any[]) || []).map((w: any) => ({
      type: 'workload' as const,
      title: 'Carga alta detectada',
      message: `${w.totalDeliveries} entregas - previsão término ${w.estimatedEndTime ? new Date(w.estimatedEndTime).toLocaleTimeString('pt-BR') : 'N/A'}`,
      severity: w.workloadScore > 80 ? 'high' as const : 'medium' as const,
    })),
    ...((unavailability as any[]) || []).map((u: any) => ({
      type: 'unavailable' as const,
      title: 'Cliente indisponível',
      message: `${u.delivery?.customer?.name || 'Cliente'} - Entrega #${u.delivery?.deliveryNumber || 'N/A'}`,
      severity: 'high' as const,
    })),
  ];

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      PENDING: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
      ASSIGNED: { label: 'Atribuído', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
      ACCEPTED: { label: 'Aceito', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
      PICKING_UP: { label: 'Coletando', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
      LOADED: { label: 'Carregado', color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
      IN_TRANSIT: { label: 'Em Rota', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
      ARRIVED: { label: 'Chegou', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
      DELIVERED: { label: 'Entregue', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      FAILED: { label: 'Falhou', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
      CANCELLED: { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' },
    };
    return map[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
  };

  const navItems = [
    { id: 'console' as const, label: 'Console', icon: Activity, desc: 'Entregas ativas' },
    { id: 'dispatch' as const, label: 'Despacho', icon: Route, desc: 'Kanban e rotas' },
    { id: 'gps' as const, label: 'Rastreamento', icon: Navigation, desc: 'Localização da frota' },
    { id: 'fuel' as const, label: 'Combustível', icon: Fuel, desc: 'Abastecimentos' },
  ];

  const activeDeliveries = deliveries?.filter(
    (d: any) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status)
  ) || [];

  const stats = {
    pendentes: deliveries?.filter((d: any) => d.status === 'PENDING').length || 0,
    emRota: deliveries?.filter((d: any) => d.status === 'IN_TRANSIT').length || 0,
    entregues: deliveries?.filter((d: any) => d.status === 'DELIVERED').length || 0,
    falhas: deliveries?.filter((d: any) => d.status === 'FAILED').length || 0,
    total: deliveries?.length || 0,
  };

  const alertCount = alerts.length;

  return (
    <div className="h-screen bg-white text-slate-900 font-sans flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className={cn(
              "p-2 rounded-xl transition-all border flex items-center justify-center shrink-0 cursor-pointer",
              isNavOpen ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            )}
          >
            <Menu size={20} />
          </button>
          <div className="p-2 bg-blue-600 text-white rounded-xl hidden sm:block shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">Console do Despachante</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Painel de operações em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={cn(
              "p-2 rounded-xl border relative cursor-pointer",
              showAlerts ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
            )}
          >
            <Bell size={16} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-500 cursor-pointer"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">
              {deliveries ? `${activeDeliveries.length} ativas` : 'Carregando...'}
            </span>
          </div>
          <button
            onClick={() => { logout(); toast.success('Sessão encerrada'); }}
            className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-100 cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {isNavOpen && (
          <div onClick={() => setIsNavOpen(false)} className="fixed inset-0 bg-slate-900/20 z-20 md:hidden" />
        )}

        <aside className={cn(
          "bg-slate-50 border-r border-slate-200 p-4 flex flex-col shrink-0 overflow-y-auto transition-all duration-300 absolute inset-y-0 left-0 z-30 md:relative",
          isNavOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden p-0 border-r-0"
        )}>
          <nav className="space-y-2 w-56">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 block">Navegação</span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsNavOpen(false); }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border",
                    isActive ? "bg-white text-blue-700 border-blue-200 shadow-xs" : "bg-transparent text-slate-600 border-transparent hover:bg-slate-100"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", isActive ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-500")}>
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-slate-500 mb-4">Erro ao carregar dados.</p>
              <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">
                Tentar novamente
              </button>
            </div>
          )}

          {activeTab === 'console' && !isLoading && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Pendentes" value={stats.pendentes} color="text-amber-600" bg="bg-amber-50" />
                <StatCard label="Em Rota" value={stats.emRota} color="text-blue-600" bg="bg-blue-50" />
                <StatCard label="Entregues Hoje" value={stats.entregues} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="Falhas" value={stats.falhas} color="text-rose-600" bg="bg-rose-50" />
                <StatCard label="Total" value={stats.total} color="text-slate-900" bg="bg-slate-100" />
              </div>

              {/* Workload Overview */}
              {workloads && (workloads as any[]).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    Carga dos Motoristas
                  </h3>
                  <div className="space-y-2">
                    {(workloads as any[]).slice(0, 5).map((w: any) => (
                      <div key={w.driverId} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white",
                          w.workloadScore > 80 ? "bg-rose-500" : w.workloadScore > 50 ? "bg-amber-500" : "bg-emerald-500"
                        )}>
                          {w.totalDeliveries}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">Motorista {w.driverId?.slice(0, 8)}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{w.totalDeliveries} entregas</span>
                            <span>{w.totalWeight?.toFixed(0)}kg</span>
                            <span>~{Math.round(w.totalDurationMin / 60)}h</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-xs font-bold",
                            w.workloadScore > 80 ? "text-rose-600" : w.workloadScore > 50 ? "text-amber-600" : "text-emerald-600"
                          )}>
                            {w.workloadScore?.toFixed(0)}%
                          </p>
                          {w.suggestedReduction > 0 && (
                            <p className="text-[9px] text-rose-500">-{w.suggestedReduction} sugeridas</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Entregas Ativas</h2>
                {activeDeliveries.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Truck size={40} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-sm">Nenhuma entrega ativa no momento</p>
                  </div>
                )}
                {activeDeliveries.map((del: any) => {
                  const statusInfo = getStatusInfo(del.status);
                  return (
                    <div key={del.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-slate-400">#{del.deliveryNumber || del.id?.slice(0, 8)}</span>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", statusInfo.bg, statusInfo.color)}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm text-slate-900 truncate">
                            {del.customer?.name || 'Cliente'}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <MapPin size={10} />
                            <span className="truncate">{del.deliveryAddress || del.customer?.address || 'Endereço'}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {del.driver?.user?.name && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <User size={10} />
                              <span>{del.driver.user.name}</span>
                            </div>
                          )}
                          {del.vehicle?.vehicleNumber && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <Truck size={10} />
                              <span>{del.vehicle.vehicleNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {del.materialType && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                          <FileText size={10} />
                          <span>{del.materialType} {del.quantity ? `• ${del.quantity}` : ''}</span>
                          {del.scheduledTime && (
                            <>
                              <Clock size={10} />
                              <span>{new Date(del.scheduledTime).toLocaleString('pt-BR')}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'dispatch' && !isLoading && (
            <div className="max-w-7xl mx-auto">
              <DispatchCommandCenter />
            </div>
          )}

          {activeTab === 'gps' && !isLoading && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                  <Navigation size={18} className="text-blue-600" />
                  Frota em Movimento
                </h3>
                {activeDeliveries.filter((d: any) => d.status === 'IN_TRANSIT').length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Nenhum veículo em rota no momento</p>
                ) : (
                  <div className="space-y-3">
                    {activeDeliveries.filter((d: any) => d.status === 'IN_TRANSIT').map((del: any) => (
                      <div key={del.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{del.driver?.user?.name || 'Motorista'}</p>
                          <p className="text-xs text-slate-500">{del.vehicle?.vehicleNumber || 'Veículo'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{del.deliveryAddress || del.customer?.address}</p>
                        </div>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Em Rota</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'fuel' && <FuelMaintenanceModule />}
        </main>

        {/* Right Alerts Panel */}
        {showAlerts && (
          <>
            <div onClick={() => setShowAlerts(false)} className="fixed inset-0 bg-slate-900/10 z-20" />
            <aside className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto shrink-0 relative z-30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Bell size={16} className="text-amber-500" />
                  Alertas
                </h3>
                <button onClick={() => setShowAlerts(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertTriangle size={24} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-xs">Nenhum alerta no momento</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-2xl border",
                        alert.severity === 'high'
                          ? 'bg-rose-50 border-rose-100'
                          : 'bg-amber-50 border-amber-100'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={12} className={alert.severity === 'high' ? 'text-rose-500' : 'text-amber-500'} />
                        <span className={cn(
                          "text-[10px] font-bold uppercase",
                          alert.severity === 'high' ? 'text-rose-700' : 'text-amber-700'
                        )}>
                          {alert.type === 'workload' ? 'Carga Alta' : 'Indisponível'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900">{alert.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
};

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-slate-200`}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default DispatcherDashboard;
