import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket, useRealtimeNotifications } from '../hooks/useSocket';
import {
  Truck, User, MapPin, Clock, FileText,
  Navigation, Activity, Bell, LogOut,
  Fuel, RefreshCw, AlertTriangle,
  Users, Route, Loader2, X, Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { FuelMaintenanceModule } from '../components/FuelMaintenanceModule';
import { DispatchCommandCenter } from '../components/dispatch/DispatchCommandCenter';
import { DispatchAssignmentPanel } from '../components/dispatch/DispatchAssignmentPanel';
import { FuelApprovalQueue } from '../components/dispatch/FuelApprovalQueue';
import { DispatcherDriverMonitor } from '../components/dispatch/DispatcherDriverMonitor';
import { DeliveryFailureQueue } from '../components/dispatch/DeliveryFailureQueue';

type Tab = 'console' | 'dispatch' | 'falhas' | 'combustivel' | 'gps';

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 20 : 30);
  }
}

function usePullToRefresh(onRefresh: () => void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && diff < 150) setPullDistance(diff);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      haptic('medium');
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    }
    setPullDistance(0);
    pulling.current = false;
  }, [pullDistance, onRefresh]);

  return { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd };
}

const DispatcherDashboard = () => {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { socket, getSocket } = useSocket();
  const [activeTab, setActiveTab] = useState<Tab>('console');
  const [showAlerts, setShowAlerts] = useState(false);

  // Real-time Socket.IO
  useEffect(() => {
    const s = socket || getSocket();
    if (!s) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['load-batches'] });
    };

    const onDeliveryCreated = () => { invalidate(); toast.success('Nova entrega criada'); };
    const onDeliveryStatusChanged = (data: any) => { invalidate(); if (data.newStatus === 'FAILED') toast.error(`Entrega falhou`); };
    const onFuelRequestCreated = () => { queryClient.invalidateQueries({ queryKey: ['fuel-requests'] }); toast.info('Nova solicitação de combustível'); };

    s.on('deliveryCreated', onDeliveryCreated);
    s.on('deliveryStatusChanged', onDeliveryStatusChanged);
    s.on('deliveryAssigned', invalidate);
    s.on('deliveryAssignedToLoadBatch', invalidate);
    s.on('fuelRequestCreated', onFuelRequestCreated);
    s.on('fuelRequestUpdated', onFuelRequestCreated);
    s.on('loadBatchApproved', invalidate);

    return () => {
      s.off('deliveryCreated', onDeliveryCreated);
      s.off('deliveryStatusChanged', onDeliveryStatusChanged);
      s.off('deliveryAssigned', invalidate);
      s.off('deliveryAssignedToLoadBatch', invalidate);
      s.off('fuelRequestCreated', onFuelRequestCreated);
      s.off('fuelRequestUpdated', onFuelRequestCreated);
      s.off('loadBatchApproved', invalidate);
    };
  }, [socket, getSocket, queryClient]);

  useRealtimeNotifications((n) => {
    if (n.type?.includes('DELIVERY') || n.type?.includes('FUEL')) {
      queryClient.invalidateQueries({ queryKey: ['dispatcher-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-requests'] });
    }
  });

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
      message: `${w.totalDeliveries} entregas`,
      severity: w.workloadScore > 80 ? 'high' as const : 'medium' as const,
    })),
    ...((unavailability as any[]) || []).map((u: any) => ({
      type: 'unavailable' as const,
      title: 'Cliente indisponível',
      message: `${u.delivery?.customer?.name || 'Cliente'}`,
      severity: 'high' as const,
    })),
  ];

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      PENDING: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
      ASSIGNED: { label: 'Atribuído', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
      IN_TRANSIT: { label: 'Em Rota', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
      DELIVERED: { label: 'Entregue', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      FAILED: { label: 'Falhou', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    };
    return map[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
  };

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

  const { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(() => refetch());

  const handleTabChange = (tab: Tab) => {
    haptic();
    setActiveTab(tab);
  };

  return (
    <div
      className="h-dvh bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull to Refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex items-center justify-center overflow-hidden bg-white" style={{ height: isRefreshing ? 48 : Math.min(pullDistance * 0.6, 60) }}>
          <RefreshCw size={20} className={cn("text-blue-500", (isRefreshing || pullDistance > 80) && "animate-spin")} />
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-40 safe-top">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
            <Settings size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Despachante</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400">{activeDeliveries.length} ativas</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { refetch(); haptic(); }}
            className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 cursor-pointer active:scale-95 transition-transform">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setShowAlerts(true); haptic(); }}
            className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 relative cursor-pointer active:scale-95 transition-transform">
            <Bell size={16} />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {alerts.length > 9 ? '9+' : alerts.length}
              </span>
            )}
          </button>
          <button onClick={() => { logout(); haptic(); }}
            className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 cursor-pointer active:scale-95 transition-transform">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <AlertTriangle size={32} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 mb-4">Erro ao carregar dados</p>
            <button onClick={() => refetch()} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-transform min-h-[44px]">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="p-4 pb-24">
            {/* Console Tab */}
            {activeTab === 'console' && (
              <div className="space-y-4 max-w-6xl mx-auto">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <StatCard label="Pendentes" value={stats.pendentes} color="text-amber-600" bg="bg-amber-50" />
                  <StatCard label="Em Rota" value={stats.emRota} color="text-blue-600" bg="bg-blue-50" />
                  <StatCard label="Entregues" value={stats.entregues} color="text-emerald-600" bg="bg-emerald-50" />
                  <StatCard label="Falhas" value={stats.falhas} color="text-rose-600" bg="bg-rose-50" />
                  <StatCard label="Total" value={stats.total} color="text-slate-900" bg="bg-slate-100" />
                </div>

                {/* Workload */}
                {workloads && (workloads as any[]).length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Users size={14} className="text-indigo-600" />
                      Carga dos Motoristas
                    </h3>
                    <div className="space-y-2">
                      {(workloads as any[]).slice(0, 5).map((w: any) => (
                        <div key={w.driverId} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0",
                            w.workloadScore > 80 ? "bg-rose-500" : w.workloadScore > 50 ? "bg-amber-500" : "bg-emerald-500"
                          )}>
                            {w.totalDeliveries}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">Motorista {w.driverId?.slice(0, 8)}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>{w.totalDeliveries} entregas</span>
                              <span>{w.totalWeight?.toFixed(0)}kg</span>
                            </div>
                          </div>
                          <p className={cn(
                            "text-xs font-bold shrink-0",
                            w.workloadScore > 80 ? "text-rose-600" : w.workloadScore > 50 ? "text-amber-600" : "text-emerald-600"
                          )}>
                            {w.workloadScore?.toFixed(0)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Deliveries */}
                <div className="space-y-2.5">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Entregas Ativas</h2>
                  {activeDeliveries.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                      <Truck size={36} className="mx-auto mb-2 text-slate-200" />
                      <p className="text-sm text-slate-400">Nenhuma entrega ativa</p>
                    </div>
                  ) : (
                    activeDeliveries.map((del: any) => {
                      const si = getStatusInfo(del.status);
                      return (
                        <div key={del.id} className="bg-white border border-slate-100 rounded-2xl p-4 active:border-blue-300 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-[10px] font-bold text-slate-400">#{del.deliveryNumber || del.id?.slice(0, 6)}</span>
                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border", si.bg, si.color)}>
                                  {si.label}
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold text-slate-900 truncate">{del.customer?.name || 'Cliente'}</h3>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                <MapPin size={10} className="shrink-0" />
                                <span className="truncate">{del.deliveryAddress || 'Endereço'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {del.driver?.user?.name && (
                                <p className="text-[10px] text-slate-600 flex items-center gap-1">
                                  <User size={10} />{del.driver.user.name}
                                </p>
                              )}
                              {del.vehicle?.vehicleNumber && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Truck size={10} />{del.vehicle.vehicleNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Dispatch Tab */}
            {activeTab === 'dispatch' && (
              <div className="max-w-7xl mx-auto space-y-4">
                <DispatchCommandCenter />
                <DispatchAssignmentPanel />
              </div>
            )}

            {/* Failures Tab */}
            {activeTab === 'falhas' && (
              <div className="max-w-6xl mx-auto">
                <DeliveryFailureQueue />
              </div>
            )}

            {/* Fuel Tab */}
            {activeTab === 'combustivel' && (
              <div className="max-w-6xl mx-auto space-y-4">
                <FuelApprovalQueue />
                <FuelMaintenanceModule />
              </div>
            )}

            {/* GPS Tab */}
            {activeTab === 'gps' && (
              <div className="max-w-6xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Navigation size={14} className="text-blue-600" />
                    Frota em Movimento
                  </h3>
                  {activeDeliveries.filter((d: any) => d.status === 'IN_TRANSIT').length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Nenhum veículo em rota</p>
                  ) : (
                    <div className="space-y-2.5">
                      {activeDeliveries.filter((d: any) => d.status === 'IN_TRANSIT').map((del: any) => (
                        <div key={del.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{del.driver?.user?.name || 'Motorista'}</p>
                            <p className="text-xs text-slate-500 truncate">{del.vehicle?.vehicleNumber || 'Veículo'}</p>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg shrink-0 ml-2">Em Rota</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DispatcherDriverMonitor />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <DispatcherBottomNav active={activeTab} onTab={handleTabChange} alertsCount={alerts.length} />

      {/* Alerts Modal (full-screen on mobile) */}
      {showAlerts && (
        <>
          <div onClick={() => setShowAlerts(false)} className="fixed inset-0 bg-black/30 z-50" />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[80dvh] overflow-y-auto safe-bottom md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-96 md:rounded-2xl">
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell size={16} className="text-amber-500" />
                Alertas ({alerts.length})
              </h3>
              <button onClick={() => setShowAlerts(false)} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer active:scale-95 transition-transform">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertTriangle size={28} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm">Nenhum alerta</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((alert, idx) => (
                    <div key={idx} className={cn(
                      "p-3.5 rounded-2xl border",
                      alert.severity === 'high' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
                    )}>
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
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function DispatcherBottomNav({ active, onTab, alertsCount }: { active: Tab; onTab: (tab: Tab) => void; alertsCount: number }) {
  const tabs: Array<{ id: Tab; label: string; icon: typeof Activity; badge?: number }> = [
    { id: 'console', label: 'Console', icon: Activity },
    { id: 'dispatch', label: 'Despacho', icon: Route },
    { id: 'falhas', label: 'Falhas', icon: AlertTriangle },
    { id: 'combustivel', label: 'Combustível', icon: Fuel },
    { id: 'gps', label: 'GPS', icon: Navigation },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 transition-all cursor-pointer active:scale-95",
                isActive ? "text-blue-600" : "text-slate-400"
              )}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {tab.id === 'falhas' && alertsCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                    {alertsCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-semibold leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn("rounded-xl p-3 border border-slate-200", bg)}>
      <p className="text-[10px] text-slate-500 font-medium">{label}</p>
      <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}

export default DispatcherDashboard;
