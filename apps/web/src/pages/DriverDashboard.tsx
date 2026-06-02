import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Truck, MapPin, CheckCircle, Clock, Phone, MessageSquare,
  Navigation, LogOut, User as UserIcon, ChevronRight, Camera,
  AlertCircle, ThumbsUp, ThumbsDown, X, Mic, Loader2,
  Home, List, Flag,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type Screen = 'home' | 'stops' | 'delivery' | 'problem' | 'voice';

const PROBLEM_OPTIONS = [
  { value: 'absent', label: 'Cliente ausente', icon: UserIcon },
  { value: 'wrong_address', label: 'Endereço errado', icon: MapPin },
  { value: 'closed', label: 'Comércio fechado', icon: X },
  { value: 'access_denied', label: 'Acesso negado', icon: AlertCircle },
  { value: 'refused', label: 'Cliente recusou', icon: ThumbsDown },
  { value: 'vehicle_issue', label: 'Problema no veículo', icon: Truck },
  { value: 'damaged', label: 'Produto danificado', icon: AlertCircle },
  { value: 'other', label: 'Outro', icon: Flag },
];

const DriverDashboard = () => {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<string>('');
  const [showPhoto, setShowPhoto] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);

  const { data: deliveries, isLoading, refetch } = useQuery({
    queryKey: ['driver-deliveries'],
    queryFn: () => api.get<any[]>('/deliveries?take=50'),
    refetchInterval: 15000,
  });

  const myDeliveries = useMemo(() => {
    if (!deliveries) return [];
    return deliveries.filter((d: any) =>
      ['PENDING', 'ASSIGNED', 'LOADED', 'IN_TRANSIT', 'ARRIVED'].includes(d.status)
    );
  }, [deliveries]);

  const completedCount = deliveries?.filter((d: any) => d.status === 'DELIVERED').length || 0;
  const totalCount = deliveries?.length || 0;
  const remaining = totalCount - completedCount;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const currentDelivery = selectedDeliveryId
    ? myDeliveries.find((d: any) => d.id === selectedDeliveryId)
    : myDeliveries[0];

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/deliveries/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
      toast.success('Status atualizado!');
      setSelectedDeliveryId(null);
      setScreen('home');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar status'),
  });

  const submitPod = useMutation({
    mutationFn: async (data: { deliveryId: string; photoUrl?: string; signatureUrl?: string; driverNote?: string }) => {
      return api.post('/proof-of-delivery', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
      toast.success('Comprovante registrado!');
      setShowPhoto(false);
      setShowSignature(false);
      setScreen('home');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao registrar comprovante'),
  });

  const submitProblem = useMutation({
    mutationFn: async (data: { deliveryId: string; type: string; description?: string }) => {
      return api.post('/delivery-events', {
        deliveryId: data.deliveryId,
        type: `problem_${data.type}`,
        description: data.description || PROBLEM_OPTIONS.find(p => p.value === data.type)?.label || data.type,
      });
    },
    onSuccess: () => {
      toast.success('Problema registrado!');
      setSelectedProblem('');
      setScreen('home');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao registrar problema'),
  });

  const submitVoiceNote = useMutation({
    mutationFn: async (data: { deliveryId: string; audioUrl: string; durationSec?: number }) => {
      return api.post('/voice-notes', data);
    },
    onSuccess: () => {
      toast.success('Nota de voz salva!');
      setRecordingVoice(false);
      setScreen('home');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar nota de voz'),
  });

  const handleNavigate = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_blank');
  };

  const handleWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  if (screen === 'delivery' && currentDelivery) {
    return (
      <DeliveryScreen
        delivery={currentDelivery}
        onBack={() => { setScreen('home'); setSelectedDeliveryId(null); }}
        onDelivered={() => updateStatus.mutate({ id: currentDelivery.id, status: 'DELIVERED' })}
        onProblem={() => setScreen('problem')}
        onPhoto={() => setShowPhoto(true)}
        onCall={() => handleCall(currentDelivery.customer?.phone || '')}
        onWhatsApp={() => handleWhatsApp(currentDelivery.customer?.phone || '')}
        onNavigate={() => handleNavigate(currentDelivery.latitude, currentDelivery.longitude)}
        onVoiceNote={() => { setSelectedDeliveryId(currentDelivery.id); setScreen('voice'); }}
        showPhoto={showPhoto}
        onPhotoCapture={() => {
          submitPod.mutate({ deliveryId: currentDelivery.id, photoUrl: 'captured.jpg' });
          setShowPhoto(false);
        }}
        showSignature={showSignature}
        onSignatureCapture={() => {
          submitPod.mutate({ deliveryId: currentDelivery.id, signatureUrl: 'signed.png' });
          setShowSignature(false);
        }}
        isUpdating={updateStatus.isPending}
      />
    );
  }

  if (screen === 'problem') {
    return (
      <ProblemScreen
        onSelect={(value) => {
          setSelectedProblem(value);
          if (currentDelivery) {
            submitProblem.mutate({ deliveryId: currentDelivery.id, type: value });
          }
        }}
        onBack={() => setScreen('delivery')}
        selected={selectedProblem}
      />
    );
  }

  if (screen === 'voice') {
    return <VoiceNoteScreen deliveryId={selectedDeliveryId || ''} onSave={(audioUrl, duration) => {
      submitVoiceNote.mutate({ deliveryId: selectedDeliveryId!, audioUrl, durationSec: duration });
    }} onBack={() => setScreen('delivery')} />;
  }

  if (screen === 'stops') {
    return (
      <StopListScreen
        deliveries={myDeliveries}
        onSelect={(id) => { setSelectedDeliveryId(id); setScreen('delivery'); }}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-32">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                {user?.name?.charAt(0) || 'M'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{user?.name || 'Motorista'}</p>
                <p className="text-xs text-slate-400">Veículo: {user?.vehicleNumber || 'ABC-1234'}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 bg-slate-100 rounded-xl text-slate-400 cursor-pointer">
              <LogOut size={18} />
            </button>
          </div>

          {/* Route Progress */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rota de Hoje</p>
              <p className="text-xs font-bold text-indigo-600">{completedCount} de {totalCount}</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400">
              <span>{remaining} restantes</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-600">{myDeliveries.length}</p>
              <p className="text-[9px] font-bold text-amber-700 uppercase">Ativas</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-emerald-600">{completedCount}</p>
              <p className="text-[9px] font-bold text-emerald-700 uppercase">Feitas</p>
            </div>
            <div className="bg-slate-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-slate-600">{remaining}</p>
              <p className="text-[9px] font-bold text-slate-700 uppercase">Restam</p>
            </div>
          </div>
        </div>

        {/* Next Stop Card */}
        {currentDelivery && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Próxima Parada</p>
            <h2 className="text-lg font-bold text-slate-900 mb-1">{currentDelivery.customer?.name || 'Cliente'}</h2>
            <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
              <MapPin size={14} />
              {currentDelivery.deliveryAddress || currentDelivery.customer?.address || 'Endereço'}
            </p>

            <div className="flex items-center gap-4 mb-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Navigation size={14} className="text-blue-500" />
                {currentDelivery.total_km ? `${currentDelivery.total_km.toFixed(1)} km` : '~5 km'}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-amber-500" />
                {currentDelivery.eta_minutes ? `${currentDelivery.eta_minutes} min` : 'Em breve'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleNavigate(currentDelivery.latitude, currentDelivery.longitude)}
                className="p-3 bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer">
                <Navigation size={16} /> Navegar
              </button>
              <button onClick={() => handleCall(currentDelivery.customer?.phone || '')}
                className="p-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer">
                <Phone size={16} /> Ligar
              </button>
              <button onClick={() => handleWhatsApp(currentDelivery.customer?.phone || '')}
                className="p-3 bg-green-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer">
                <MessageSquare size={16} /> WhatsApp
              </button>
              <button onClick={() => { setSelectedDeliveryId(currentDelivery.id); setScreen('delivery'); }}
                className="p-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer">
                <CheckCircle size={16} /> Cheguei
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setScreen('stops')}
            className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer">
            <div className="p-2 bg-indigo-50 rounded-xl"><List size={20} className="text-indigo-600" /></div>
            <span className="text-sm font-semibold text-slate-900">Ver Paradas</span>
          </button>
          <button onClick={() => { if (currentDelivery) { setSelectedDeliveryId(currentDelivery.id); setScreen('problem'); } }}
            className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer">
            <div className="p-2 bg-rose-50 rounded-xl"><AlertCircle size={20} className="text-rose-600" /></div>
            <span className="text-sm font-semibold text-slate-900">Reportar</span>
          </button>
        </div>

        {/* Active Deliveries List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Suas Entregas</h3>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
          ) : myDeliveries.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Truck size={32} className="mx-auto mb-2 text-slate-200" />
              Nenhuma entrega ativa
            </div>
          ) : (
            myDeliveries.map((d: any) => (
              <button key={d.id} onClick={() => { setSelectedDeliveryId(d.id); setScreen('delivery'); }}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 hover:border-indigo-200 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs',
                    d.status === 'PENDING' ? 'bg-slate-400' :
                    d.status === 'ASSIGNED' ? 'bg-blue-500' :
                    d.status === 'IN_TRANSIT' ? 'bg-amber-500' :
                    d.status === 'DELIVERED' ? 'bg-emerald-500' : 'bg-slate-400'
                  )}>
                    {d.deliveryNumber?.slice(-4) || 'N/A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{d.customer?.name || 'Cliente'}</p>
                    <p className="text-xs text-slate-400 truncate">{d.deliveryAddress || d.customer?.address}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

function DeliveryScreen({
  delivery, onBack, onDelivered, onProblem, onPhoto, onCall, onWhatsApp,
  onNavigate, onVoiceNote, showPhoto, onPhotoCapture, showSignature, onSignatureCapture, isUpdating,
}: {
  delivery: any; onBack: () => void; onDelivered: () => void; onProblem: () => void;
  onPhoto: () => void; onCall: () => void; onWhatsApp: () => void; onNavigate: () => void;
  onVoiceNote: () => void; showPhoto: boolean; onPhotoCapture: () => void;
  showSignature: boolean; onSignatureCapture: () => void; isUpdating: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-32">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <ChevronRight size={16} className="rotate-180" /> Voltar
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-indigo-600" />
            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Entrega</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{delivery.customer?.name || 'Cliente'}</h2>
          <p className="text-sm text-slate-500 mb-1">{delivery.deliveryAddress || delivery.customer?.address}</p>
          <p className="text-sm text-slate-500 mb-4">{delivery.customer?.phone}</p>

          {delivery.notes && (
            <div className="bg-amber-50 rounded-xl p-3 mb-4">
              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Observações</p>
              <p className="text-sm text-amber-900">{delivery.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onDelivered} disabled={isUpdating}
                className="p-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={18} />}
                Entregue
              </button>
              <button onClick={onProblem}
                className="p-4 bg-rose-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
                <AlertCircle size={18} /> Problema
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onPhoto}
                className="p-3 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer">
                <Camera size={16} /> Foto
              </button>
              <button onClick={onVoiceNote}
                className="p-3 bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer">
                <Mic size={16} /> Voz
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={onCall}
                className="p-3 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 cursor-pointer">
                <Phone size={14} /> Ligar
              </button>
              <button onClick={onWhatsApp}
                className="p-3 bg-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 cursor-pointer">
                <MessageSquare size={14} /> Zap
              </button>
              <button onClick={onNavigate}
                className="p-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 cursor-pointer">
                <Navigation size={14} /> Ir
              </button>
            </div>
          </div>
        </div>

        {showPhoto && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
            <Camera size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900 mb-4">Tirar foto do comprovante</p>
            <button onClick={onPhotoCapture}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold cursor-pointer">
              Capturar Foto
            </button>
          </div>
        )}

        {showSignature && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
            <p className="text-sm font-semibold text-slate-900 mb-4">Coletar assinatura</p>
            <button onClick={onSignatureCapture}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold cursor-pointer">
              Assinar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProblemScreen({ onSelect, onBack, selected }: { onSelect: (value: string) => void; onBack: () => void; selected: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <ChevronRight size={16} className="rotate-180" /> Voltar
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Problema na Entrega</h2>
          <p className="text-sm text-slate-500 mb-4">Selecione o motivo:</p>

          <div className="grid grid-cols-2 gap-2">
            {PROBLEM_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isSelected = selected === opt.value;
              return (
                <button key={opt.value} onClick={() => onSelect(opt.value)}
                  className={cn(
                    'p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 cursor-pointer transition-all',
                    isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'
                  )}>
                  <Icon size={24} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className={cn('text-xs font-semibold', isSelected ? 'text-indigo-700' : 'text-slate-700')}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-2xl">
            <p className="text-xs text-amber-800 font-medium">O despachante será notificado automaticamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StopListScreen({ deliveries, onSelect, onBack }: { deliveries: any[]; onSelect: (id: string) => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <ChevronRight size={16} className="rotate-180" /> Voltar
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Paradas da Rota</h2>
          <p className="text-sm text-slate-500 mb-4">{deliveries.length} paradas</p>

          <div className="space-y-2">
            {deliveries.map((d: any, idx: number) => (
              <button key={d.id} onClick={() => onSelect(d.id)}
                className="w-full text-left flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{d.customer?.name || 'Cliente'}</p>
                  <p className="text-xs text-slate-400 truncate">{d.deliveryAddress || d.customer?.address}</p>
                </div>
                <span className={cn(
                  'text-[9px] font-bold px-2 py-1 rounded-lg',
                  d.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                  d.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                )}>
                  {d.status === 'DELIVERED' ? 'Feito' : d.status === 'IN_TRANSIT' ? 'Rota' : 'Pendente'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceNoteScreen({ deliveryId, onSave, onBack }: { deliveryId: string; onSave: (url: string, duration: number) => void; onBack: () => void }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');

  const startRecording = () => {
    setRecording(true);
    setDuration(0);
    const interval = setInterval(() => {
      setDuration(prev => {
        if (prev >= 120) { clearInterval(interval); setRecording(false); return prev; }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  const stopRecording = () => {
    setRecording(false);
    setAudioUrl('recorded_audio.m4a');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <ChevronRight size={16} className="rotate-180" /> Voltar
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
          <div className={cn(
            'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 transition-all',
            recording ? 'bg-rose-100 animate-pulse' : 'bg-slate-100'
          )}>
            <Mic size={36} className={recording ? 'text-rose-600' : 'text-slate-400'} />
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-1">Nota de Voz</h2>
          <p className="text-sm text-slate-500 mb-4">Grave um áudio de até 120 segundos</p>

          {recording && (
            <p className="text-3xl font-mono font-black text-rose-600 mb-4">
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </p>
          )}

          {!audioUrl ? (
            <button onClick={recording ? stopRecording : startRecording}
              className={cn(
                'px-8 py-4 rounded-2xl font-bold text-white text-sm cursor-pointer',
                recording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              )}>
              {recording ? 'Parar Gravação' : 'Gravar Nota de Voz'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-emerald-700 text-sm font-medium">
                Áudio gravado! ({duration}s)
              </div>
              <button onClick={() => onSave(audioUrl, duration)}
                className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-bold cursor-pointer">
                Salvar Nota de Voz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriverDashboard;
