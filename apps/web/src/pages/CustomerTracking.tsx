import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  Truck, MapPin, Clock, Phone, ShieldCheck,
  CheckCircle2, Loader2, Navigation, Package,
  MessageCircle, ThumbsUp, ThumbsDown, Building,
  DoorOpen, User, FileText, ChevronRight, Send,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const statusSteps = ['PENDING', 'ASSIGNED', 'LOADING', 'IN_TRANSIT', 'DELIVERED'];

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PENDING: { label: 'Pedido Recebido', icon: Package, color: 'text-slate-600', bg: 'bg-slate-100' },
  ASSIGNED: { label: 'Motorista Atribuído', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' },
  LOADED: { label: 'Carregado', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  IN_TRANSIT: { label: 'Saiu para Entrega', icon: Navigation, color: 'text-amber-600', bg: 'bg-amber-100' },
  DELIVERED: { label: 'Entregue', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
};

export default function CustomerTracking() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [instructions, setInstructions] = useState({
    gateCode: '', buildingAccess: '', apartmentNumber: '',
    contactPerson: '', loadingNotes: '', preferredEntrance: '', notes: '',
  });
  const [savingInstructions, setSavingInstructions] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/track/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Link inválido ou expirado');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAvailability = async (isAvailable: boolean) => {
    try {
      const res = await fetch(`${BASE_URL}/track/${token}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      if (!res.ok) throw new Error('Erro ao confirmar');
      toast.success(isAvailable ? 'Disponibilidade confirmada!' : 'Notificação enviada ao motorista');
      setShowAvailability(false);
      setData((prev: any) => ({
        ...prev,
        availabilityResponse: { isAvailable },
      }));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      const res = await fetch(`${BASE_URL}/track/${token}/instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instructions),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      toast.success('Instruções salvas!');
      setShowInstructions(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleCallback = async () => {
    try {
      const res = await fetch(`${BASE_URL}/track/${token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Erro ao solicitar');
      toast.success('Solicitação de retorno enviada!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReschedule = async () => {
    const suggestedDate = prompt('Qual data você prefere? (DD/MM/AAAA)');
    if (!suggestedDate) return;
    try {
      const res = await fetch(`${BASE_URL}/track/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedDate }),
      });
      if (!res.ok) throw new Error('Erro ao solicitar');
      toast.success('Solicitação de reagendamento enviada!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Buscando informações da entrega...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Link não encontrado</h2>
          <p className="text-sm text-slate-500">Este link de rastreamento é inválido ou expirou.</p>
        </div>
      </div>
    );
  }

  const currentStatus = data.status;
  const currentStepIndex = statusSteps.indexOf(currentStatus);
  const isDelivered = currentStatus === 'DELIVERED';
  const isCancelled = currentStatus === 'CANCELLED';
  const statusInfo = statusConfig[currentStatus] || statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" />
              <span className="text-sm font-bold text-slate-900">ENTREGAPRO</span>
            </div>
            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg uppercase">
              Canal Seguro
            </span>
          </div>

          <div className={cn('p-4 rounded-2xl', statusInfo.bg)}>
            <div className="flex items-center gap-3">
              <div className={cn('p-3 rounded-xl', statusInfo.bg)}>
                <StatusIcon size={28} className={statusInfo.color} />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">{statusInfo.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">#{data.deliveryNumber}</p>
              </div>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, idx) => {
                const isComplete = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const StepIcon = statusConfig[step]?.icon || Package;
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      isComplete ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300',
                      isCurrent && 'ring-2 ring-indigo-200',
                    )}>
                      <StepIcon size={14} />
                    </div>
                    <p className={cn('text-[8px] mt-1 font-medium text-center', isComplete ? 'text-indigo-600' : 'text-slate-400')}>
                      {statusConfig[step]?.label?.split(' ')[0]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Driver & ETA Info */}
        {!isDelivered && !isCancelled && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Informações da Entrega</h3>
            <div className="space-y-3">
              {data.driverName && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl"><User size={16} className="text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Motorista</p>
                    <p className="text-sm font-semibold text-slate-900">{data.driverName}</p>
                  </div>
                </div>
              )}
              {data.vehicleNumber && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl"><Truck size={16} className="text-slate-600" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Veículo</p>
                    <p className="text-sm font-semibold text-slate-900">{data.vehicleNumber}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-xl"><Clock size={16} className="text-amber-600" /></div>
                <div>
                  <p className="text-xs text-slate-400">Previsão de Chegada</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {data.etaMinutes
                      ? `~${data.etaMinutes} minutos`
                      : data.estimatedArrival
                        ? new Date(data.estimatedArrival).toLocaleString('pt-BR')
                        : 'Em breve'}
                  </p>
                </div>
              </div>
              {data.driverLocation && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-xl"><MapPin size={16} className="text-emerald-600" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Motorista está próximo</p>
                    <p className="text-sm font-semibold text-slate-900">Localização aproximada disponível</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Actions */}
        {!isDelivered && !isCancelled && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</h3>

            <button
              onClick={() => setShowAvailability(!showAvailability)}
              className="w-full p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between cursor-pointer"
            >
              <span className="text-sm font-semibold text-indigo-700">Confirmar Disponibilidade</span>
              <ThumbsUp size={18} className="text-indigo-500" />
            </button>

            {showAvailability && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAvailability(true)}
                  className="flex-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center gap-2 text-emerald-700 font-semibold cursor-pointer"
                >
                  <ThumbsUp size={18} /> Sim
                </button>
                <button
                  onClick={() => handleAvailability(false)}
                  className="flex-1 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center gap-2 text-rose-700 font-semibold cursor-pointer"
                >
                  <ThumbsDown size={18} /> Não
                </button>
              </div>
            )}

            {data.availabilityResponse && (
              <div className={cn(
                'p-3 rounded-xl text-sm font-medium',
                data.availabilityResponse.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
              )}>
                {data.availabilityResponse.isAvailable ? 'Disponibilidade confirmada ✓' : 'Indisponível - Aviso enviado'}
              </div>
            )}

            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer"
            >
              <span className="text-sm font-semibold text-slate-700">Instruções de Entrega</span>
              <DoorOpen size={18} className="text-slate-500" />
            </button>

            {showInstructions && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-2xl">
                {[
                  { key: 'gateCode', label: 'Código do portão', icon: Building },
                  { key: 'buildingAccess', label: 'Acesso ao prédio', icon: DoorOpen },
                  { key: 'apartmentNumber', label: 'Nº apartamento', icon: User },
                  { key: 'contactPerson', label: 'Pessoa de contato', icon: User },
                  { key: 'loadingNotes', label: 'Instruções de carga/descarga', icon: FileText },
                  { key: 'preferredEntrance', label: 'Entrada preferencial', icon: DoorOpen },
                  { key: 'notes', label: 'Observações', icon: FileText },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={(instructions as any)[field.key]}
                      onChange={(e) => setInstructions(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm"
                      placeholder={field.label}
                    />
                  </div>
                ))}
                <button
                  onClick={handleSaveInstructions}
                  disabled={savingInstructions}
                  className="w-full p-3 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingInstructions ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Salvar Instruções
                </button>
              </div>
            )}

            <button
              onClick={handleCallback}
              className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer"
            >
              <span className="text-sm font-semibold text-slate-700">Solicitar Retorno</span>
              <Phone size={18} className="text-slate-500" />
            </button>

            <button
              onClick={handleReschedule}
              className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer"
            >
              <span className="text-sm font-semibold text-slate-700">Reagendar Entrega</span>
              <Clock size={18} className="text-slate-500" />
            </button>
          </div>
        )}

        {/* Events Timeline */}
        {data.events && data.events.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Atualizações</h3>
            <div className="space-y-3">
              {data.events.map((event: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-900">{event.description || event.type}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(event.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivered State */}
        {isDelivered && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
            <h2 className="text-lg font-bold text-slate-900">Entrega Realizada</h2>
            <p className="text-sm text-slate-500 mt-1">Obrigado por utilizar a EntregaPRO!</p>
          </div>
        )}
      </div>
    </div>
  );
}
