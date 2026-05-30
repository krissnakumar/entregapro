import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Compass, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  Clock, 
  Package, 
  MapPin,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons with vibrant HTML overlays
const createDeliveryIcon = (bgClass: string, strokeColor: string, iconSvg: string) => L.divIcon({
  className: 'custom-delivery-div-icon',
  html: `<div class="${bgClass} w-9 h-9 rounded-2xl border-2 border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110 duration-200">
          ${iconSvg}
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Ícones SVG diretos
const truckSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v2.42M23 13v-2a2 2 0 0 0-2-2h-4.12l-1.5-3h-4.32l-1.5 3H7"/><path d="M14 18H9"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;
const clockSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const pendingSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;

const MapView = () => {
  const [zoom] = useState(13);
  const [center] = useState<[number, number]>([-23.5505, -46.6333]); // São Paulo default
  const [simulatedPositions, setSimulatedPositions] = useState<Record<string, [number, number]>>({});
  
  // Controles de Visibilidade das Camadas e Entregas (Inputs Solicitados pelo Usuário)
  const [showPolygons, setShowPolygons] = useState(true);
  const [showOSRMHeat, setShowOSRMHeat] = useState(true);
  
  // Inputs/Filtros de status operacional
  const [showLiveDelivery, setShowLiveDelivery] = useState(true);
  const [showUpcomingDelivery, setShowUpcomingDelivery] = useState(true);
  const [showPendingDelivery, setShowPendingDelivery] = useState(true);

  // Busca de entregas do backend para plotagem física no mapa
  const { data: rawDeliveries } = useQuery({
    queryKey: ['live-map-deliveries-telemetry'],
    queryFn: () => api.get<any[]>('/deliveries').catch(() => []),
    refetchInterval: 5000,
  });

  const deliveries = rawDeliveries || [];
  const zones: Array<{ id: string; name: string; color: string; coords: [number, number][] }> = [];

  // Micro-animação simulando telemetria contínua
  useEffect(() => {
    if (!deliveries) return;
    
    const interval = setInterval(() => {
      setSimulatedPositions(prev => {
        const next = { ...prev };
        deliveries.forEach((d: any) => {
          // Apenas simula leve desvio de GPS nas entregas ativas para sensação viva
          if (d.status === 'IN_TRANSIT' || d.status === 'ASSIGNED') {
            const current = next[d.id] || [d.latitude || center[0], d.longitude || center[1]];
            next[d.id] = [
              current[0] + (Math.random() - 0.5) * 0.0006,
              current[1] + (Math.random() - 0.5) * 0.0006
            ];
          }
        });
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [deliveries, center]);

  // Contadores dinâmicos para a interface
  const liveCount = deliveries.filter(d => d.status === 'IN_TRANSIT' || d.status === 'LOADING').length;
  const upcomingCount = deliveries.filter(d => d.status === 'ASSIGNED').length;
  const pendingCount = deliveries.filter(d => d.status === 'PENDING').length;

  // Filtra as entregas a serem renderizadas com base nas checkboxes/inputs do usuário
  const filteredDeliveries = deliveries.filter(d => {
    const isLive = d.status === 'IN_TRANSIT' || d.status === 'LOADING';
    const isUpcoming = d.status === 'ASSIGNED';
    const isPending = d.status === 'PENDING';

    if (isLive && !showLiveDelivery) return false;
    if (isUpcoming && !showUpcomingDelivery) return false;
    if (isPending && !showPendingDelivery) return false;
    
    // Ignora entregas já finalizadas nesta visualização focada em trânsito e pátio
    if (d.status === 'DELIVERED' || d.status === 'CANCELLED') return false;

    return true;
  });

  return (
    <div className="h-full w-full rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm relative flex flex-col min-h-[500px]">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', flexGrow: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Polygons Zone overlays */}
        {showPolygons && zones.map(zone => (
          <Polygon 
            key={zone.id}
            positions={zone.coords as [number, number][]}
            pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.12, weight: 2 }}
          />
        ))}
        
        {/* Marcadores de Entregas Operacionais Vivas */}
        {filteredDeliveries.map((delivery) => {
          const pos = simulatedPositions[delivery.id] || [delivery.latitude || center[0], delivery.longitude || center[1]];
          
          const isLive = delivery.status === 'IN_TRANSIT' || delivery.status === 'LOADING';
          const isUpcoming = delivery.status === 'ASSIGNED';
          
          // Customização baseada no status de dispatch
          let bgClass = 'bg-rose-500 animate-bounce';
          let strokeColor = '#F43F5E';
          let svgIcon = pendingSvg;
          let labelBadge = 'PENDING DISPATCH';
          let badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';

          if (isLive) {
            bgClass = 'bg-indigo-600 animate-pulse shadow-indigo-500/50';
            strokeColor = '#4F46E5';
            svgIcon = truckSvg;
            labelBadge = 'LIVE DELIVERY';
            badgeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          } else if (isUpcoming) {
            bgClass = 'bg-amber-500 shadow-amber-500/40';
            strokeColor = '#F59E0B';
            svgIcon = clockSvg;
            labelBadge = 'UPCOMING ASSIGNED';
            badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
          }
          
          return (
            <React.Fragment key={delivery.id}>
              <Marker position={pos} icon={createDeliveryIcon(bgClass, strokeColor, svgIcon)}>
                <Popup className="rounded-2xl">
                  <div className="p-2.5 space-y-2 min-w-[180px]">
                    <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                      <span className="text-[10px] font-mono font-black text-slate-800">{delivery.deliveryNumber}</span>
                      <span className={cn("px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border", badgeBg)}>
                        {labelBadge}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{delivery.customer?.name || 'Destinatário Mapeado'}</p>
                      <p className="text-[10px] font-medium text-slate-500 truncate max-w-[200px] mt-0.5">{delivery.deliveryAddress}</p>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-600">{delivery.materialType}</span>
                      <span className="font-black text-indigo-600 font-mono">{delivery.quantity}</span>
                    </div>

                    {delivery.driver && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 pt-0.5">
                        <Truck size={12} className="text-slate-400" />
                        <span>{delivery.driver.user?.name} ({delivery.vehicle?.vehicleNumber})</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
              
              {/* Rastro preditivo simulado OSRM para frotas em movimento */}
              {showOSRMHeat && isLive && (
                <Polyline 
                  positions={[
                    pos,
                    [pos[0] + 0.005, pos[1] + 0.005]
                  ]} 
                  color={strokeColor} 
                  dashArray="4, 6" 
                  weight={3} 
                  opacity={0.6} 
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Camada 1: Controles de Overlays Visuais (Esquerda) */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 space-y-2.5 w-56">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
            <Layers size={14} className="text-indigo-600" />
            <span className="text-[10px] font-black tracking-tight uppercase text-slate-800">Map Layers Overlay</span>
          </div>

          <div className="space-y-1.5">
            <button 
              onClick={() => setShowPolygons(!showPolygons)}
              className="w-full flex items-center justify-between py-1 px-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
            >
              <span className="text-[10px] font-bold text-slate-600">Geofence Sectors</span>
              {showPolygons ? <Eye size={12} className="text-emerald-600" /> : <EyeOff size={12} className="text-slate-400" />}
            </button>
            <button 
              onClick={() => setShowOSRMHeat(!showOSRMHeat)}
              className="w-full flex items-center justify-between py-1 px-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
            >
              <span className="text-[10px] font-bold text-slate-600">OSRM Prediction Line</span>
              {showOSRMHeat ? <Eye size={12} className="text-indigo-600" /> : <EyeOff size={12} className="text-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Camada 2: NOVO PAINEL COM INPUTS DE STATUS OPERACIONAIS (Direita - Pedido pelo Usuário) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-xl p-3.5 rounded-2xl shadow-xl border border-slate-100/80 w-64 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-indigo-600" />
              <span className="text-[10px] font-black tracking-tight uppercase text-slate-900">Filtro de Despacho</span>
            </div>
            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
              {filteredDeliveries.length} Vistos
            </span>
          </div>

          <div className="space-y-2">
            
            {/* Input de Live Delivery */}
            <label className={cn(
              "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
              showLiveDelivery ? "bg-indigo-50/50 border-indigo-200" : "bg-slate-50/50 border-transparent opacity-60 hover:opacity-100"
            )}>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={showLiveDelivery}
                  onChange={(e) => setShowLiveDelivery(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" /> Live Delivery
                </span>
              </div>
              <span className="text-[10px] font-mono font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                {liveCount}
              </span>
            </label>

            {/* Input de Upcoming Delivery */}
            <label className={cn(
              "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
              showUpcomingDelivery ? "bg-amber-50/50 border-amber-200" : "bg-slate-50/50 border-transparent opacity-60 hover:opacity-100"
            )}>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={showUpcomingDelivery}
                  onChange={(e) => setShowUpcomingDelivery(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                />
                <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Upcoming
                </span>
              </div>
              <span className="text-[10px] font-mono font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                {upcomingCount}
              </span>
            </label>

            {/* Input de Pending Delivery */}
            <label className={cn(
              "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
              showPendingDelivery ? "bg-rose-50/50 border-rose-200" : "bg-slate-50/50 border-transparent opacity-60 hover:opacity-100"
            )}>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={showPendingDelivery}
                  onChange={(e) => setShowPendingDelivery(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-rose-400 w-3.5 h-3.5"
                />
                <span className="text-[10px] font-black text-rose-950 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Pending
                </span>
              </div>
              <span className="text-[10px] font-mono font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md">
                {pendingCount}
              </span>
            </label>

          </div>

          <div className="pt-1 text-[9px] text-slate-400 text-center font-medium">
            Clique nos marcadores para conferir manifesto e canhotos.
          </div>
        </div>
      </div>

      {/* Rodapé de Fixação Espacial */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-[9px] font-mono flex items-center gap-2 pointer-events-none">
        <Compass size={12} className="text-emerald-400 animate-spin" />
        <span>Spatial Cluster Center Lock: [-23.5505, -46.6333]</span>
      </div>
    </div>
  );
};

export default MapView;
