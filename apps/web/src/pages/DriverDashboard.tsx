import { useState, useMemo, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge, LoadingStatusBadge } from '../components/ui/StatusBadge';
import { DeliveryTimeline } from '../components/ui/DeliveryTimeline';
import { useSocket } from '../hooks/useSocket';
import {
  Truck, MapPin, CheckCircle, Clock, Phone, MessageSquare,
  Navigation, LogOut, User as UserIcon, ChevronRight, Camera,
  AlertCircle, X, Loader2, Home, List, Package, Fuel,
  ArrowLeft, RefreshCw, User, CircleDot,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type Screen = 'home' | 'batches' | 'batch-detail' | 'delivery' | 'problem' | 'fuel' | 'proof' | 'timeline';
type BottomTab = 'home' | 'batches' | 'fuel';

const FAILURE_REASONS = [
  { value: 'customer_absent', label: 'Cliente ausente', icon: User },
  { value: 'wrong_address', label: 'Endereço errado', icon: MapPin },
  { value: 'damaged_product', label: 'Produto danificado', icon: AlertCircle },
  { value: 'payment_issue', label: 'Problema de pagamento', icon: CircleDot },
  { value: 'site_inaccessible', label: 'Local inacessível', icon: X },
  { value: 'vehicle_problem', label: 'Problema no veículo', icon: Truck },
  { value: 'partial_delivery', label: 'Entrega parcial', icon: Package },
  { value: 'other', label: 'Outro', icon: AlertCircle },
];

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const ms = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
    navigator.vibrate(ms);
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
    if (diff > 0 && diff < 150) {
      setPullDistance(diff);
    }
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

const DriverDashboard = () => {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

  useSocket();

  const { data: batches, isLoading: batchesLoading, refetch: refetchBatches } = useQuery({
    queryKey: ['driver-batches'],
    queryFn: () => api.get<any[]>('/load-batches/my-loads'),
    refetchInterval: 15000,
  });

  const { data: deliveries, isLoading: deliveriesLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ['driver-deliveries'],
    queryFn: () => api.get<any[]>('/deliveries/my-deliveries'),
    refetchInterval: 15000,
  });

  const myDeliveries = useMemo(() => deliveries || [], [deliveries]);
  const activeBatches = useMemo(() =>
    (batches || []).filter((b: any) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(b.status)),
    [batches]
  );

  const completedCount = myDeliveries.filter((d: any) => d.deliveryStatus === 'DELIVERED').length;
  const totalCount = myDeliveries.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const currentDelivery = selectedDeliveryId ? myDeliveries.find((d: any) => d.id === selectedDeliveryId) : null;
  const currentBatch = selectedBatchId ? activeBatches.find((b: any) => b.id === selectedBatchId) : null;

  const handleRefresh = useCallback(() => {
    refetchBatches();
    refetchDeliveries();
  }, [refetchBatches, refetchDeliveries]);

  const { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(handleRefresh);

  const updateDeliveryStatus = useMutation({
    mutationFn: async ({ id, deliveryStatus, notes, failureReason }: {
      id: string; deliveryStatus: string; notes?: string; failureReason?: string;
    }) => api.patch(`/deliveries/${id}/delivery-status`, { deliveryStatus, notes, failureReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-batches'] });
      toast.success('Status atualizado!');
      haptic('medium');
      setScreen('home');
      setSelectedDeliveryId(null);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
  });

  const acceptBatch = useMutation({
    mutationFn: async (id: string) => api.patch(`/load-batches/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-batches'] });
      toast.success('Lote aceito!');
      haptic('medium');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao aceitar'),
  });

  const startLoading = useMutation({
    mutationFn: async (id: string) => api.patch(`/load-batches/${id}/start-loading`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-batches'] });
      toast.success('Carregamento iniciado!');
      haptic('medium');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markLoaded = useMutation({
    mutationFn: async (id: string) => api.patch(`/load-batches/${id}/mark-loaded`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-batches'] });
      toast.success('Carregamento concluído!');
      haptic('medium');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const startRoute = useMutation({
    mutationFn: async (id: string) => api.patch(`/load-batches/${id}/start-route`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-batches'] });
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
      toast.success('Rota iniciada!');
      haptic('heavy');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const submitProof = useMutation({
    mutationFn: async (data: { deliveryId: string; photoUrl?: string; signatureUrl?: string; driverNote?: string }) =>
      api.post('/proof-of-delivery', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
      toast.success('Comprovante registrado!');
      haptic('heavy');
      setScreen('home');
      setSelectedDeliveryId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createFuelRequest = useMutation({
    mutationFn: async (data: any) => api.post('/fuel-requests', data),
    onSuccess: () => {
      toast.success('Solicitação enviada!');
      haptic('medium');
      setScreen('home');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleNavigate = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };
  const handleCall = (phone: string) => window.open(`tel:${phone}`, '_blank');
  const handleWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${clean}`, '_blank');
  };

  const navigateTo = (s: Screen, batchId?: string, deliveryId?: string) => {
    haptic();
    if (batchId) setSelectedBatchId(batchId);
    if (deliveryId) setSelectedDeliveryId(deliveryId);
    setScreen(s);
  };

  // ─── SUB-SCREEN ROUTING ──────────────────────────────────────────────────

  if (screen === 'delivery' && currentDelivery) {
    return (
      <DeliveryDetailScreen
        delivery={currentDelivery}
        onBack={() => { setScreen('home'); setSelectedDeliveryId(null); }}
        onComplete={() => updateDeliveryStatus.mutate({ id: currentDelivery.id, deliveryStatus: 'DELIVERED' })}
        onFailed={(reason) => updateDeliveryStatus.mutate({ id: currentDelivery.id, deliveryStatus: 'FAILED', failureReason: reason })}
        onProof={() => setScreen('proof')}
        onTimeline={() => setScreen('timeline')}
        onCall={() => handleCall(currentDelivery.customer?.phone || '')}
        onWhatsApp={() => handleWhatsApp(currentDelivery.customer?.phone || '')}
        onNavigate={() => {
          if (currentDelivery.latitude && currentDelivery.longitude) {
            handleNavigate(currentDelivery.latitude, currentDelivery.longitude);
          }
        }}
        isUpdating={updateDeliveryStatus.isPending}
      />
    );
  }

  if (screen === 'timeline' && currentDelivery) {
    return (
      <div className="min-h-dvh bg-slate-50 safe-bottom">
        <MobileHeader title="Histórico" onBack={() => setScreen('delivery')} />
        <div className="px-4 pb-24 pt-2">
          <DeliveryTimeline deliveryId={currentDelivery.id} />
        </div>
      </div>
    );
  }

  if (screen === 'proof' && currentDelivery) {
    return (
      <ProofScreen
        delivery={currentDelivery}
        onBack={() => setScreen('delivery')}
        onSubmit={(data) => submitProof.mutate({ deliveryId: currentDelivery.id, ...data })}
        isSubmitting={submitProof.isPending}
      />
    );
  }

  if (screen === 'problem' && currentDelivery) {
    return (
      <ProblemScreen
        onBack={() => setScreen('delivery')}
        onSelect={(reason) => {
          updateDeliveryStatus.mutate({ id: currentDelivery.id, deliveryStatus: 'FAILED', failureReason: reason });
        }}
        isSubmitting={updateDeliveryStatus.isPending}
      />
    );
  }

  if (screen === 'fuel') {
    return (
      <FuelRequestScreen
        onBack={() => setScreen('home')}
        onSubmit={(data) => createFuelRequest.mutate(data)}
        isSubmitting={createFuelRequest.isPending}
      />
    );
  }

  if (screen === 'batch-detail' && currentBatch) {
    return (
      <BatchDetailScreen
        batch={currentBatch}
        onBack={() => setScreen('batches')}
        onSelectDelivery={(id) => navigateTo('delivery', undefined, id)}
        onAccept={() => acceptBatch.mutate(currentBatch.id)}
        onStartLoading={() => startLoading.mutate(currentBatch.id)}
        onMarkLoaded={() => markLoaded.mutate(currentBatch.id)}
        onStartRoute={() => startRoute.mutate(currentBatch.id)}
        isUpdating={acceptBatch.isPending || startLoading.isPending || markLoaded.isPending || startRoute.isPending}
      />
    );
  }

  // ─── HOME SCREEN ────────────────────────────────────────────────────────

  const isLoading = batchesLoading || deliveriesLoading;

  return (
    <div
      className="min-h-dvh bg-slate-50 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: isRefreshing ? 48 : Math.min(pullDistance * 0.6, 60) }}
        >
          <RefreshCw
            size={20}
            className={cn("text-indigo-500", (isRefreshing || pullDistance > 80) && "animate-spin")}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 pt-4 pb-24 overflow-y-auto">
        {isLoading ? (
          <SkeletonHome />
        ) : (
          <div className="max-w-lg mx-auto space-y-4">
            {/* Header Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {user?.name?.charAt(0) || 'M'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Motorista'}</p>
                    <p className="text-xs text-slate-400">Veículo: {user?.vehicleNumber || 'N/A'}</p>
                  </div>
                </div>
                <button onClick={() => { logout(); haptic(); }} className="p-2.5 bg-slate-100 rounded-xl text-slate-400 cursor-pointer active:scale-95 transition-transform">
                  <LogOut size={18} />
                </button>
              </div>

              {/* Progress */}
              <div className="bg-slate-50 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progresso do Dia</p>
                  <p className="text-xs font-bold text-indigo-600">{completedCount}/{totalCount}</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2.5 mt-3.5">
                <StatPill label="Lotes" value={activeBatches.length} color="text-amber-600" bg="bg-amber-50" />
                <StatPill label="Feitas" value={completedCount} color="text-emerald-600" bg="bg-emerald-50" />
                <StatPill label="Restam" value={totalCount - completedCount} color="text-slate-600" bg="bg-slate-100" />
              </div>
            </div>

            {/* Active Batches */}
            {activeBatches.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Lotes Ativos</h3>
                {activeBatches.map((batch: any) => (
                  <button
                    key={batch.id}
                    onClick={() => navigateTo('batch-detail', batch.id)}
                    className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 active:border-indigo-300 active:bg-indigo-50/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {batch.totalDeliveries}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{batch.batchCode}</p>
                        <p className="text-xs text-slate-400">{batch.totalDeliveries} entrega(s) · {batch.vehicle?.vehicleNumber || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={batch.status} size="sm" />
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Delivery List */}
            {myDeliveries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  {activeBatches.length > 0 ? 'Próximas Entregas' : 'Todas as Entregas'}
                </h3>
                {(activeBatches.length > 0 ? myDeliveries.slice(0, 5) : myDeliveries).map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => navigateTo('delivery', undefined, d.id)}
                    className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 active:border-indigo-300 active:bg-indigo-50/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[10px] shrink-0',
                        d.deliveryStatus === 'DELIVERED' ? 'bg-emerald-500' :
                        d.deliveryStatus === 'IN_TRANSIT' ? 'bg-blue-500' :
                        d.deliveryStatus === 'ARRIVED' ? 'bg-amber-500' :
                        d.deliveryStatus === 'FAILED' ? 'bg-rose-500' : 'bg-slate-400'
                      )}>
                        {d.deliveryNumber?.slice(-3) || 'N/A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{d.customer?.name || 'Cliente'}</p>
                        <p className="text-xs text-slate-400 truncate">{d.deliveryAddress}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={d.deliveryStatus || d.status} size="sm" />
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && myDeliveries.length === 0 && activeBatches.length === 0 && (
              <div className="text-center py-12">
                <Truck size={48} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">Nenhuma entrega atribuída</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <BottomNav
        active={screen === 'batches' ? 'batches' : screen === 'fuel' ? 'fuel' : 'home'}
        onTab={(tab) => {
          haptic();
          if (tab === 'batches') setScreen('batches');
          else if (tab === 'fuel') setScreen('fuel');
          else setScreen('home');
        }}
        badges={{ batches: activeBatches.length }}
      />
    </div>
  );
};

export default DriverDashboard;

// ─── BOTTOM NAV ─────────────────────────────────────────────────────────────

function BottomNav({ active, onTab, badges }: { active: BottomTab; onTab: (tab: BottomTab) => void; badges?: { batches?: number } }) {
  const tabs: Array<{ id: BottomTab; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'batches', label: 'Lotes', icon: Package },
    { id: 'fuel', label: 'Combustível', icon: Fuel },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          const badge = tab.id === 'batches' ? badges?.batches : 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all cursor-pointer active:scale-95",
                isActive ? "text-indigo-600" : "text-slate-400"
              )}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {badge && badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MOBILE HEADER ──────────────────────────────────────────────────────────

function MobileHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100 safe-top">
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        <button onClick={onBack} className="p-2.5 -ml-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer active:scale-95">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-base font-bold text-slate-900 flex-1 truncate">{title}</h1>
        {right}
      </div>
    </div>
  );
}

// ─── STAT PILL ──────────────────────────────────────────────────────────────

function StatPill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn("rounded-xl p-2.5 text-center", bg)}>
      <p className={cn("text-xl font-black", color)}>{value}</p>
      <p className="text-[9px] font-bold text-slate-500 uppercase">{label}</p>
    </div>
  );
}

// ─── SKELETON LOADING ───────────────────────────────────────────────────────

function SkeletonHome() {
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-pulse">
      <div className="bg-white rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-200 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/4" />
          </div>
        </div>
        <div className="h-8 bg-slate-100 rounded-full" />
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-200 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DELIVERY DETAIL SCREEN ─────────────────────────────────────────────────

function DeliveryDetailScreen({
  delivery, onBack, onComplete, onFailed, onProof, onTimeline, onCall, onWhatsApp, onNavigate, isUpdating,
}: {
  delivery: any; onBack: () => void; onComplete: () => void; onFailed: (reason: string) => void;
  onProof: () => void; onTimeline: () => void; onCall: () => void; onWhatsApp: () => void;
  onNavigate: () => void; isUpdating: boolean;
}) {
  const [showFailure, setShowFailure] = useState(false);

  return (
    <div className="min-h-dvh bg-slate-50 safe-bottom">
      <MobileHeader title="Detalhes da Entrega" onBack={onBack} />
      <div className="px-4 pt-4 pb-24 space-y-4 max-w-lg mx-auto">
        {/* Customer */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-indigo-600" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Entrega</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{delivery.customer?.name || 'Cliente'}</h2>
          <p className="text-sm text-slate-500">{delivery.deliveryAddress}</p>
          {delivery.customer?.phone && (
            <p className="text-sm text-slate-400 mt-0.5">{delivery.customer.phone}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <StatusBadge status={delivery.deliveryStatus} size="sm" />
            {delivery.loadingStatus && <LoadingStatusBadge status={delivery.loadingStatus} size="sm" />}
          </div>
        </div>

        {/* Items */}
        {delivery.deliveryItems && delivery.deliveryItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Itens</p>
            <div className="space-y-1.5">
              {delivery.deliveryItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate">{item.productName}</span>
                  <span className="text-slate-500 font-medium shrink-0 ml-2">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onComplete} disabled={isUpdating}
            className="p-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition-transform min-h-[56px]">
            {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Entregue
          </button>
          <button onClick={() => { setShowFailure(true); haptic(); }}
            className="p-4 bg-rose-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform min-h-[56px]">
            <AlertCircle size={18} /> Falhou
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={onProof}
            className="p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform min-h-[60px]">
            <Camera size={18} className="text-slate-500" />
            <span className="text-[10px]">Foto</span>
          </button>
          <button onClick={onTimeline}
            className="p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform min-h-[60px]">
            <Clock size={18} className="text-slate-500" />
            <span className="text-[10px]">Histórico</span>
          </button>
          <button onClick={onNavigate}
            className="p-3.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform min-h-[60px]">
            <Navigation size={18} />
            <span className="text-[10px]">Navegar</span>
          </button>
        </div>

        {/* Contact Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={onCall}
            className="p-4 bg-blue-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform min-h-[52px]">
            <Phone size={16} /> Ligar
          </button>
          <button onClick={onWhatsApp}
            className="p-4 bg-green-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform min-h-[52px]">
            <MessageSquare size={16} /> WhatsApp
          </button>
        </div>

        {/* Failure Selection */}
        {showFailure && (
          <div className="bg-white rounded-3xl shadow-lg border border-rose-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Motivo da Falha</h3>
              <button onClick={() => setShowFailure(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {FAILURE_REASONS.map((reason) => {
                const Icon = reason.icon;
                return (
                  <button
                    key={reason.value}
                    onClick={() => { onFailed(reason.value); setShowFailure(false); haptic('medium'); }}
                    className="p-3.5 rounded-xl border-2 border-slate-100 text-center flex flex-col items-center gap-1.5 cursor-pointer active:border-rose-400 active:bg-rose-50 transition-all min-h-[72px]"
                  >
                    <Icon size={20} className="text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-700">{reason.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROOF SCREEN ───────────────────────────────────────────────────────────

function ProofScreen({ delivery, onBack, onSubmit, isSubmitting }: {
  delivery: any; onBack: () => void; onSubmit: (data: { photoUrl?: string; signatureUrl?: string; driverNote?: string }) => void; isSubmitting: boolean;
}) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="min-h-dvh bg-slate-50 safe-bottom">
      <MobileHeader title="Comprovante de Entrega" onBack={onBack} />
      <div className="px-4 pt-4 pb-24 space-y-4 max-w-lg mx-auto">
        <p className="text-sm text-slate-500">{delivery.customer?.name} · #{delivery.deliveryNumber}</p>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-5">
          {/* Photo */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Foto</label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center active:border-indigo-300 transition-colors">
              <Camera size={32} className="mx-auto mb-2 text-slate-300" />
              <button onClick={() => { setPhotoUrl('photo_captured.jpg'); haptic('medium'); }}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold cursor-pointer active:scale-95 transition-transform min-h-[44px]">
                Capturar Foto
              </button>
              {photoUrl && <p className="text-xs text-emerald-600 mt-2 font-medium">Foto capturada!</p>}
            </div>
          </div>

          {/* Signature */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assinatura</label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center active:border-indigo-300 transition-colors">
              <CheckCircle size={32} className="mx-auto mb-2 text-slate-300" />
              <button onClick={() => { setSignatureUrl('signature_captured.png'); haptic('medium'); }}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold cursor-pointer active:scale-95 transition-transform min-h-[44px]">
                Coletar Assinatura
              </button>
              {signatureUrl && <p className="text-xs text-emerald-600 mt-2 font-medium">Assinatura coletada!</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Observações</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm min-h-[80px] resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Observações opcionais..."
            />
          </div>
        </div>

        <button
          onClick={() => onSubmit({ photoUrl: photoUrl || undefined, signatureUrl: signatureUrl || undefined, driverNote: note || undefined })}
          disabled={isSubmitting}
          className="w-full p-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition-transform min-h-[56px]"
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          Registrar Comprovante
        </button>
      </div>
    </div>
  );
}

// ─── PROBLEM SCREEN ─────────────────────────────────────────────────────────

function ProblemScreen({ onBack, onSelect, isSubmitting }: {
  onBack: () => void; onSelect: (reason: string) => void; isSubmitting: boolean;
}) {
  return (
    <div className="min-h-dvh bg-slate-50 safe-bottom">
      <MobileHeader title="Problema na Entrega" onBack={onBack} />
      <div className="px-4 pt-4 pb-24 space-y-4 max-w-lg mx-auto">
        <p className="text-sm text-slate-500">Selecione o motivo da falha:</p>
        <div className="grid grid-cols-2 gap-3">
          {FAILURE_REASONS.map(reason => {
            const Icon = reason.icon;
            return (
              <button key={reason.value} onClick={() => { onSelect(reason.value); haptic('medium'); }} disabled={isSubmitting}
                className="p-5 rounded-2xl border-2 border-slate-100 bg-white text-center flex flex-col items-center gap-2 cursor-pointer active:border-rose-400 active:bg-rose-50 transition-all disabled:opacity-50 min-h-[88px]">
                <Icon size={24} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">{reason.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── FUEL REQUEST SCREEN ────────────────────────────────────────────────────

function FuelRequestScreen({ onBack, onSubmit, isSubmitting }: {
  onBack: () => void; onSubmit: (data: any) => void; isSubmitting: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [station, setStation] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div className="min-h-dvh bg-slate-50 safe-bottom">
      <MobileHeader title="Solicitar Abastecimento" onBack={onBack} />
      <div className="px-4 pt-4 pb-24 space-y-4 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Fuel size={20} className="text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Abastecimento</h2>
          </div>

          <InputMobile label="Valor (R$)" value={amount} onChange={setAmount} type="number" placeholder="0,00" />
          <InputMobile label="Litros Estimados" value={liters} onChange={setLiters} type="number" placeholder="0" />
          <InputMobile label="Posto" value={station} onChange={setStation} placeholder="Nome do posto" />

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Motivo</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm min-h-[80px] resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Motivo da solicitação..." />
          </div>

          <button
            onClick={() => onSubmit({ amountRequested: parseFloat(amount) || undefined, fuelLiters: parseFloat(liters) || undefined, fuelStation: station || undefined, reason: reason || undefined })}
            disabled={isSubmitting}
            className="w-full p-4 bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition-transform min-h-[56px]"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Fuel size={18} />}
            Solicitar Abastecimento
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BATCH LIST SCREEN ──────────────────────────────────────────────────────

function BatchListScreen({ batches, onSelect, onBack }: { batches: any[]; onSelect: (id: string) => void; onBack: () => void }) {
  return (
    <div className="min-h-dvh bg-slate-50 safe-bottom">
      <MobileHeader title="Meus Lotes" onBack={onBack} />
      <div className="px-4 pt-4 pb-24 space-y-4 max-w-lg mx-auto">
        <p className="text-sm text-slate-500">{batches.length} lote(s) ativo(s)</p>
        {batches.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">Nenhum lote ativo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch: any) => (
              <button key={batch.id} onClick={() => { onSelect(batch.id); haptic(); }}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 active:border-indigo-300 active:bg-indigo-50/50 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {batch.totalDeliveries}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{batch.batchCode}</p>
                    <p className="text-xs text-slate-400">{batch.vehicle?.vehicleNumber || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={batch.status} size="sm" />
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BATCH DETAIL SCREEN ────────────────────────────────────────────────────

function BatchDetailScreen({ batch, onBack, onSelectDelivery, onAccept, onStartLoading, onMarkLoaded, onStartRoute, isUpdating }: {
  batch: any; onBack: () => void; onSelectDelivery: (id: string) => void;
  onAccept: () => void; onStartLoading: () => void; onMarkLoaded: () => void; onStartRoute: () => void; isUpdating: boolean;
}) {
  const deliveries = batch.deliveries?.map((bd: any) => bd.delivery).filter(Boolean) || [];
  const sortedDeliveries = [...deliveries].sort((a: any, b: any) => {
    const aOrder = batch.deliveries?.find((bd: any) => bd.deliveryId === a.id)?.stopOrder || 0;
    const bOrder = batch.deliveries?.find((bd: any) => bd.deliveryId === b.id)?.stopOrder || 0;
    return aOrder - bOrder;
  });

  const currentStep = batch.status === 'DRIVER_NOTIFIED' ? 'accept' :
    batch.status === 'ACCEPTED_BY_DRIVER' ? 'loading' :
    batch.status === 'LOADING' ? 'loaded' :
    batch.status === 'LOADED' ? 'route' : 'done';

  return (
    <div className="min-h-dvh bg-slate-50 safe-bottom">
      <MobileHeader title={batch.batchCode} onBack={onBack}
        right={<StatusBadge status={batch.status} size="sm" />} />
      <div className="px-4 pt-4 pb-24 space-y-4 max-w-lg mx-auto">
        {/* Batch Info */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-slate-500">{batch.vehicle?.vehicleNumber || 'N/A'}</p>
            </div>
            <p className="text-xs font-bold text-slate-400">{sortedDeliveries.length} entregas</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-4">
            {['accept', 'loading', 'loaded', 'route'].map((step, i) => (
              <div key={step} className="flex-1">
                <div className={cn(
                  "h-1.5 rounded-full transition-colors",
                  ['accept', 'loading', 'loaded', 'route'].indexOf(currentStep) >= i ? 'bg-indigo-500' : 'bg-slate-200'
                )} />
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="space-y-2">
            {batch.status === 'DRIVER_NOTIFIED' && (
              <button onClick={() => { onAccept(); haptic('medium'); }} disabled={isUpdating}
                className="w-full p-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition-transform min-h-[56px]">
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Aceitar Lote
              </button>
            )}
            {batch.status === 'ACCEPTED_BY_DRIVER' && (
              <button onClick={() => { onStartLoading(); haptic('medium'); }} disabled={isUpdating}
                className="w-full p-4 bg-cyan-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition-transform min-h-[56px]">
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Package size={18} />}
                Iniciar Carregamento
              </button>
            )}
            {batch.status === 'LOADING' && (
              <button onClick={() => { onMarkLoaded(); haptic('medium'); }} disabled={isUpdating}
                className="w-full p-4 bg-purple-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition-transform min-h-[56px]">
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Carregamento Concluído
              </button>
            )}
            {batch.status === 'LOADED' && (
              <button onClick={() => { onStartRoute(); haptic('heavy'); }} disabled={isUpdating}
                className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 transition-transform min-h-[56px]">
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                Iniciar Rota
              </button>
            )}
          </div>
        </div>

        {/* Deliveries */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Paradas</h3>
          {sortedDeliveries.map((del: any, idx: number) => {
            const stopOrder = batch.deliveries?.find((bd: any) => bd.deliveryId === del.id)?.stopOrder || idx + 1;
            return (
              <button key={del.id} onClick={() => { onSelectDelivery(del.id); haptic(); }}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 active:border-indigo-300 active:bg-indigo-50/50 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {stopOrder}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{del.customer?.name || 'Cliente'}</p>
                    <p className="text-xs text-slate-400 truncate">{del.deliveryAddress}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={del.deliveryStatus || del.status} size="sm" />
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED INPUT ───────────────────────────────────────────────────────────

function InputMobile({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[48px]"
      />
    </div>
  );
}
