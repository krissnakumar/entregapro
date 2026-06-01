import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../lib/utils';
import {
  Truck, MapPin, Clock, Phone, FileText, ShieldCheck,
  CheckCircle2, Loader2, Navigation, Calendar, Package,
} from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TrackingData {
  id: string;
  deliveryNumber: string;
  status: string;
  materialType: string;
  quantity: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  scheduledTime: string;
  completedAt: string | null;
  etaMinutes: number | null;
  proofImageUrl: string | null;
  signatureUrl: string | null;
  customer: { name: string; phone: string; address: string } | null;
  driver: { name: string; phone: string; vehicleNumber: string; vehicleType: string } | null;
  invoices: { nfeNumber: string; accessKey: string; totalAmount: number }[];
  timeline: { status: string; timestamp: string; notes: string | null }[];
}

const statusSteps = ['PENDING', 'ASSIGNED', 'LOADING', 'IN_TRANSIT', 'DELIVERED'];

const statusLabels: Record<string, string> = {
  PENDING: 'Pedido Recebido',
  ASSIGNED: 'Motorista Atribuído',
  LOADING: 'Carregando',
  IN_TRANSIT: 'Em Rota',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const statusIcons: Record<string, any> = {
  PENDING: Package,
  ASSIGNED: Truck,
  LOADING: Package,
  IN_TRANSIT: Navigation,
  DELIVERED: CheckCircle2,
};

export default function PublicTracking() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE_URL}/tracking/public/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Entrega não encontrada');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Buscando informações da entrega...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Entrega não encontrada</h2>
          <p className="text-sm text-slate-500 mb-4">Verifique o código de rastreamento e tente novamente.</p>
          <div className="bg-slate-50 rounded-2xl h-48 overflow-hidden">
            <img src="https://api.mapbox.com/styles/v1/mapbox/light-v10/static/-46.6333,-23.5505,10,0/400x200@2x?access_token=pk.placeholder" alt="Mapa" className="w-full h-full object-cover opacity-50" />
          </div>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(data.status);
  const isDelivered = data.status === 'DELIVERED';
  const isCancelled = data.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-indigo-600" />
              <span className="text-sm font-bold text-slate-900">ENTREGAPRO</span>
            </div>
            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg uppercase tracking-wider">
              Canal Seguro
            </span>
          </div>

          <div className={cn(
            "p-4 rounded-2xl",
            isDelivered ? "bg-emerald-50" : isCancelled ? "bg-rose-50" : "bg-indigo-50"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl",
                isDelivered ? "bg-emerald-100" : isCancelled ? "bg-rose-100" : "bg-indigo-100"
              )}>
                {isDelivered ? <CheckCircle2 size={24} className="text-emerald-600" /> :
                 isCancelled ? <Clock size={24} className="text-rose-600" /> :
                 <Navigation size={24} className="text-indigo-600 animate-pulse" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {isDelivered ? 'Entrega Realizada' :
                   isCancelled ? 'Entrega Cancelada' :
                   'Entrega em Andamento'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.deliveryNumber} • {statusLabels[data.status] || data.status}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, i) => {
                const Icon = statusIcons[step] || Package;
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step} className="flex flex-col items-center flex-1 last:flex-none">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      isCurrent ? "bg-indigo-600 text-white shadow-lg scale-110" :
                      isActive ? "bg-emerald-100 text-emerald-600" :
                      "bg-slate-100 text-slate-300"
                    )}>
                      <Icon size={18} />
                    </div>
                    <p className={cn(
                      "text-[8px] font-bold uppercase tracking-wider mt-1.5 text-center",
                      isActive ? "text-slate-700" : "text-slate-300"
                    )}>
                      {step === 'IN_TRANSIT' ? 'Em Rota' :
                       step === 'DELIVERED' ? 'Entregue' :
                       step === 'ASSIGNED' ? 'Atribuído' :
                       step === 'LOADING' ? 'Carregando' :
                       'Pedido'}
                    </p>
                    {i < statusSteps.length - 1 && (
                      <div className={cn(
                        "h-0.5 w-full mt-[-1.25rem]",
                        i < currentStepIndex ? "bg-emerald-400" : "bg-slate-100"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {data.etaMinutes && !isDelivered && !isCancelled && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <p className="text-xs text-slate-600">
                Previsão de chegada: <span className="font-bold text-slate-800">{data.etaMinutes} minutos</span>
              </p>
            </div>
          )}
        </div>

        {/* Map */}
        {data.latitude && data.longitude && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 h-64">
            <MapContainer center={[data.latitude, data.longitude]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[data.latitude, data.longitude]}>
                <Popup>
                  <p className="text-xs font-bold">{data.deliveryAddress}</p>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Delivery Info */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Detalhes da Entrega</h3>
            <div className="space-y-2.5">
              <InfoRow icon={MapPin} label="Endereço" value={data.deliveryAddress} />
              <InfoRow icon={Package} label="Material" value={`${data.materialType} • ${data.quantity}`} />
              <InfoRow icon={Calendar} label="Agendado" value={new Date(data.scheduledTime).toLocaleString('pt-BR')} />
              {data.completedAt && (
                <InfoRow icon={CheckCircle2} label="Realizada em" value={new Date(data.completedAt).toLocaleString('pt-BR')} />
              )}
            </div>
          </div>

          {/* Customer / Driver */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {data.driver ? 'Motorista' : 'Cliente'}
            </h3>
            {data.driver ? (
              <div className="space-y-2.5">
                <InfoRow icon={Truck} label="Motorista" value={data.driver.name || '—'} />
                {data.driver.phone && (
                  <a href={`tel:${data.driver.phone}`}
                    className="flex items-center gap-2 p-2.5 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                    <Phone size={14} className="text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">{data.driver.phone}</span>
                  </a>
                )}
                <InfoRow icon={MapPin} label="Veículo" value={`${data.driver.vehicleNumber} (${data.driver.vehicleType})`} />
              </div>
            ) : data.customer ? (
              <div className="space-y-2.5">
                <InfoRow icon={MapPin} label="Cliente" value={data.customer.name} />
                {data.customer.phone && <InfoRow icon={Phone} label="Contato" value={data.customer.phone} />}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Informações não disponíveis</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        {data.timeline.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Histórico</h3>
            <div className="space-y-3">
              {data.timeline.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full mt-1.5",
                      event.status === 'DELIVERED' ? "bg-emerald-500" :
                      event.status === 'CANCELLED' ? "bg-rose-500" :
                      "bg-indigo-500"
                    )} />
                    {i < data.timeline.length - 1 && <div className="w-px flex-1 bg-slate-100" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-medium text-slate-800">
                      {statusLabels[event.status] || event.status}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(event.timestamp).toLocaleString('pt-BR')}
                    </p>
                    {event.notes && (
                      <p className="text-xs text-slate-500 mt-0.5">{event.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POD */}
        {isDelivered && (data.proofImageUrl || data.signatureUrl) && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Comprovante de Entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.proofImageUrl && (
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Foto</p>
                  <img src={data.proofImageUrl} alt="Comprovante" className="rounded-xl border border-slate-100 w-full h-32 object-cover" />
                </div>
              )}
              {data.signatureUrl && (
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Assinatura</p>
                  <img src={data.signatureUrl} alt="Assinatura" className="rounded-xl border border-slate-100 w-full h-32 object-cover bg-white" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoices */}
        {data.invoices.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Notas Fiscais</h3>
            <div className="space-y-2">
              {data.invoices.map((inv, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">NF-e {inv.nfeNumber}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{inv.accessKey}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {inv.totalAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[9px] text-slate-400 pb-6">
          EntregaPRO • Plataforma de Logística • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-slate-300 mt-0.5 shrink-0" />
      <div>
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">{label}</p>
        <p className="text-sm text-slate-700">{value || '—'}</p>
      </div>
    </div>
  );
}
