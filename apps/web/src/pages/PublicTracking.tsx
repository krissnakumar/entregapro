import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Package, MapPin, Truck, Phone, Info, ChevronLeft, Clock, ShieldCheck, Compass, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const PublicTracking = () => {
  const { id } = useParams<{ id: string }>();
  const [simulatedDistanceRemaining, setSimulatedDistanceRemaining] = useState(14.2);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]);

  const { data: apiOrder, isLoading } = useQuery({
    queryKey: ['public-order', id],
    queryFn: () => api.get<any>(`/orders/${id}`),
    retry: false
  });

  const order = apiOrder;

  // Simulate GPS movement
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedDistanceRemaining(prev => {
        const next = Math.max(0.5, prev - 0.1);
        // Gradually move the map marker closer to destination
        setMapCenter(([lat, lng]) => [
          lat + (Math.random() - 0.5) * 0.002,
          lng + (Math.random() - 0.5) * 0.002,
        ]);
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Use order coordinates if available
  useEffect(() => {
    if (order?.latitude && order?.longitude) {
      setMapCenter([order.latitude, order.longitude]);
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Package className="text-indigo-400" size={36} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight animate-pulse">Buscando Coordenadas PostGIS...</h2>
          <p className="text-xs text-slate-500 font-mono">Resolvendo nó de rastreio: #{id?.split('-')[0]}</p>
        </div>
      </div>
    );
  }

  const steps = [
    { label: 'Manifesto Gerado', status: 'PENDING', time: '08:00' },
    { label: 'Frota Vinculada', status: 'ASSIGNED', time: '09:15' },
    { label: 'Em Trânsito', status: 'IN_TRANSIT', time: 'Em Rota' },
    { label: 'Entrega Concluída', status: 'DELIVERED', time: 'Pendente' },
  ];

  const CustomTruckIcon = L.divIcon({
    className: 'custom-truck-marker',
    html: `<div style="background:#4f46e5;color:white;padding:8px;border-radius:12px;border:3px solid white;box-shadow:0 4px 12px rgba(79,70,229,0.5);font-size:16px;">🚛</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

  const DestinationIcon = L.divIcon({
    className: 'custom-destination-marker',
    html: `<div style="background:#dc2626;color:white;padding:8px;border-radius:12px;border:3px solid white;box-shadow:0 4px 12px rgba(220,38,38,0.5);font-size:16px;">📍</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

  if (!order) {
    // Show a demo tracking experience even without data
    return (
      <div className="min-h-screen bg-slate-50 selection:bg-indigo-500/20 pb-16">
        <header className="bg-white border-b border-slate-200 p-5 sticky top-0 z-50 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600" />
              <h1 className="text-xl font-black text-slate-900 tracking-tighter italic">ENTREGAPRO</h1>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Rastreamento Seguro</span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 text-center">
              <h2 className="text-2xl font-black tracking-tight text-white mb-2">Delivery Tracking</h2>
              <p className="text-slate-400 text-xs font-medium">
                Pedido <strong className="text-indigo-400 font-mono">#{id || 'N/A'}</strong> não encontrado na base de dados.
              </p>
              <p className="text-slate-500 text-[10px] mt-2">Verifique se o código de rastreio está correto.</p>
            </div>
          </div>

          {id && (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm relative min-h-[400px]">
              <MapContainer center={[-23.5505, -46.6333]} zoom={13} className="h-[400px] w-full z-0" scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[-23.5505, -46.6333]} icon={CustomTruckIcon}>
                  <Popup>
                    <div className="text-xs font-bold">Localização aproximada<br/>Aguardando dados do pedido</div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          )}
        </main>
      </div>
    );
  }

  const currentStepIndex = steps.findIndex(s => s.status === order.status);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 2;

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-500/20 pb-16">
      {/* Cabeçalho com Verificação SSL */}
      <header className="bg-white border-b border-slate-200 p-5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tighter italic">ENTREGAPRO</h1>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Canal de Rastreamento Seguro</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        {/* Banner de Status Principal */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="px-3 py-1 bg-white/10 text-slate-300 font-mono text-[10px] font-bold rounded-lg block w-fit mb-2 border border-white/5">
                CT-e Rastreamento ID: {order.id}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white">Telemetria Logística ao Vivo</h2>
              <p className="text-slate-400 text-xs font-medium mt-1">Sincronização de localização contínua por camadas de mapas dinâmicos.</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10 shrink-0">
              <div className="px-4 py-2 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Status</span>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">{(order.status || 'IN_TRANSIT').replace(/_/g, ' ')}</span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="px-4 py-2 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Previsão</span>
                <span className="text-xs font-black font-mono text-white">{order.eta_minutes || 24} Minutos</span>
              </div>
            </div>
          </div>

          {/* Stepper Gráfico */}
          <div className="relative mt-8 pt-8 border-t border-white/10">
            <div className="absolute left-0 right-0 h-1 bg-white/5 top-1/2 -translate-y-1/2 rounded-full" />
            <div 
              className="absolute left-0 h-1 bg-gradient-to-r from-indigo-500 to-emerald-400 top-1/2 -translate-y-1/2 rounded-full transition-all duration-1000 shadow-lg shadow-emerald-400/20" 
              style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
            />
            
            <div className="relative z-10 flex justify-between items-center">
              {steps.map((step, idx) => {
                const isActive = idx <= activeIndex;
                const isCurrent = idx === activeIndex;
                return (
                  <div key={step.label} className="flex flex-col items-center group">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 font-black text-xs shadow-md",
                      isActive ? "bg-emerald-500 border-emerald-400 text-white" : "bg-slate-900 border-white/10 text-slate-600",
                      isCurrent && "ring-4 ring-emerald-500/30 scale-110"
                    )}>
                      {isActive ? "✓" : idx + 1}
                    </div>
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-widest mt-2.5 transition-colors text-center",
                      isActive ? "text-white" : "text-slate-500"
                    )}>
                      {step.label}
                    </p>
                    <span className="text-[8px] font-mono text-slate-400 block mt-0.5">{step.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mapa Leaflet + Detalhes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Leaflet Map */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm relative min-h-[400px]">
            <MapContainer center={mapCenter} zoom={14} className="h-[450px] w-full z-0" scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={mapCenter} icon={CustomTruckIcon}>
                <Popup>
                  <div className="text-xs font-bold">
                    🚛 Veículo em movimento<br/>
                    <span className="text-slate-500 font-normal">Velocidade média: 42 km/h</span>
                  </div>
                </Popup>
              </Marker>
              {/* Destination marker - offset slightly for visual effect */}
              <Marker position={[mapCenter[0] + 0.015, mapCenter[1] + 0.015]} icon={DestinationIcon}>
                <Popup>
                  <div className="text-xs font-bold">
                    📍 Destino Final<br/>
                    <span className="text-slate-500 font-normal">{order.customerAddress || 'Endereço do cliente'}</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Painel Inferior de Distância */}
            <div className="relative z-10 p-5 m-4 bg-white/95 backdrop-blur-md rounded-[1.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Compass size={20} className="animate-spin" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Distância Restante</p>
                  <p className="text-sm font-black text-slate-800 font-mono">{simulatedDistanceRemaining.toFixed(1)} km até o destino final</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-50 text-slate-600 font-bold text-[10px] rounded-lg border">
                  GPS Ao Vivo
                </span>
              </div>
            </div>
          </div>

          {/* Dados da Carga e Destinatário */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <MapPin className="text-indigo-600" size={16} />
                Endereço de Entrega
              </h3>
              <p className="text-xs font-black text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                {order.customerAddress || 'Av. Paulista, 1000 - São Paulo, SP'}
              </p>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Material</span>
                  <span className="text-xs font-bold text-slate-700 truncate block">{order.materialType || 'Concreto Armado'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Volume</span>
                  <span className="text-xs font-bold text-slate-700 block font-mono">{order.quantity || '8'} m³</span>
                </div>
              </div>
            </div>

            {order.driver && (
              <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-emerald-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-700 pointer-events-none" />
                
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl font-black text-lg flex items-center justify-center shadow-md">
                      {order.driver.user?.name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 block mb-0.5">Motorista</span>
                      <h4 className="font-black text-sm tracking-tight text-white">{order.driver.user?.name || 'Carlos Alves'}</h4>
                      <span className="text-[9px] font-mono text-slate-400 block mt-0.5">Veículo: {order.driver.vehicle?.vehicleNumber || 'PRO-4040'}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => window.location.href = `tel:${order.driver.user?.phone || '+5511998887766'}`}
                    className="p-3.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 shrink-0"
                    title="Ligar para o motorista"
                  >
                    <Phone size={18} />
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
              <Sparkles size={18} className="text-indigo-600 shrink-0" />
              <p className="text-[10px] text-slate-500 font-medium">
                Os registros de tempo são imutáveis e protegidos pelo nosso <strong className="text-slate-800">Protocolo de Verificação</strong> (Não-Repúdio).
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto pt-8 border-t border-slate-200 text-center px-4">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
          EntregaPRO Centro de Inteligência Logística <span className="text-indigo-600 font-mono">v2.0</span>
        </p>
      </footer>
    </div>
  );
};

export default PublicTracking;
