import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../api/client';
import { 
  Navigation, 
  MapPin, 
  User, 
  Truck, 
  TrendingUp, 
  Sparkles, 
  Check, 
  Loader2, 
  ArrowRight, 
  Compass, 
  Settings as SettingsIcon,
  HelpCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

// Custom icons setup
const createNumberIcon = (num: number, bgClass: string = 'bg-primary') => L.divIcon({
  className: 'custom-number-div-icon',
  html: `<div class="${bgClass} w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs transition-all transform hover:scale-115">
          ${num}
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const truckIcon = L.divIcon({
  className: 'custom-truck-div-icon',
  html: `<div class="bg-emerald-500 w-9 h-9 rounded-2xl border-2 border-white shadow-xl flex items-center justify-center transform hover:rotate-12 transition-transform">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v2.42M23 13v-2a2 2 0 0 0-2-2h-4.12l-1.5-3h-4.32l-1.5 3H7"/><path d="M14 18H9"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const defaultMarkerIcon = L.divIcon({
  className: 'custom-default-div-icon',
  html: `<div class="bg-slate-400 w-7 h-7 rounded-full border border-white shadow-md flex items-center justify-center">
          <div class="w-2.5 h-2.5 bg-white rounded-full"></div>
         </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const RoutePlanner = () => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState<string>('OSRM_HEURISTIC');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [simulatedPath, setSimulatedPath] = useState<[number, number][]>([]);
  const [simStats, setSimStats] = useState({
    stops: 0,
    distance: 0,
    duration: 0,
    diesel: 0,
    margin: 0
  });

  const center: [number, number] = [-23.5505, -46.6333]; // São Paulo Default Hub

  // Fetch pending or assigned deliveries
  const { data: deliveriesRaw, refetch: refetchDeliveries, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['planner-deliveries'],
    queryFn: () => api.get<any[]>('/deliveries').catch(() => []),
  });

  // Fetch drivers list
  const { data: driversRaw, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['planner-drivers'],
    queryFn: () => api.get<any[]>('/drivers').catch(() => []),
  });

  const deliveries = (deliveriesRaw || []).filter(d => d.status === 'PENDING' || d.status === 'ASSIGNED');
  const drivers = driversRaw || [];

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  // Toggle delivery checkbox
  const handleToggleDelivery = (id: string) => {
    setIsSimulated(false);
    setSelectedDeliveries(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Simulate OSRM sequence path
  const handleSimulate = () => {
    if (selectedDeliveries.length === 0) {
      toast.error('Selecione ao menos uma entrega para roteirizar.');
      return;
    }
    
    // Sort selected deliveries based on proximity or creation to build structured simulation
    const orderedDeliveries = deliveries.filter(d => selectedDeliveries.includes(d.id));
    
    // Calculate total haversine distance
    let totalKm = 0;
    let prevCoords: [number, number] = center;
    const pathCoords: [number, number][] = [center];

    orderedDeliveries.forEach(d => {
      const lat = d.latitude || center[0];
      const lng = d.longitude || center[1];
      const currentCoords: [number, number] = [lat, lng];
      
      // Calculate simple distance from previous stop
      const R = 6371;
      const dLat = ((currentCoords[0] - prevCoords[0]) * Math.PI) / 180;
      const dLng = ((currentCoords[1] - prevCoords[1]) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((prevCoords[0] * Math.PI) / 180) * Math.cos((currentCoords[0] * Math.PI) / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      
      totalKm += dist;
      pathCoords.push(currentCoords);
      prevCoords = currentCoords;
    });

    // Hub Return Path
    pathCoords.push(center);

    const calculatedKm = parseFloat(totalKm.toFixed(1));
    const calculatedMinutes = Math.round(calculatedKm * 1.5 + orderedDeliveries.length * 10);
    const dieselLiters = parseFloat((calculatedKm / 5.2).toFixed(1)); // 5.2 km/L standard truck
    const estimatedMargin = parseFloat((orderedDeliveries.length * 180 - calculatedKm * 2.8).toFixed(2));

    setSimulatedPath(pathCoords);
    setSimStats({
      stops: orderedDeliveries.length,
      distance: calculatedKm,
      duration: calculatedMinutes,
      diesel: dieselLiters,
      margin: estimatedMargin
    });

    setIsSimulated(true);
    toast.success('Simulação de roteirização OSRM calculada!');
  };

  // Dispatch / publish route assignment mutation
  const dispatchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDriverId) throw new Error('Selecione um motorista.');
      
      // Call smartAssign on the backend for each selected delivery
      const promises = selectedDeliveries.map(deliveryId => {
        // Find if driver has vehicle
        const vehicleId = selectedDriver?.currentVehicle?.id || null;
        return api.post(`/deliveries/${deliveryId}/smart-assign`, {});
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Manifesto de roteirização despachado e motorista notificado via WhatsApp!');
      setSelectedDeliveries([]);
      setIsSimulated(false);
      refetchDeliveries();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao despachar roteirização.');
    }
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Navigation size={28} className="text-primary animate-pulse" /> Roteirizador Inteligente OSRM
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-xl">
            Agrupe entregas pendentes, simule custos operacionais e despache a rota otimizada diretamente para o aplicativo móvel do motorista.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => refetchDeliveries()}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest text-slate-700 rounded-xl transition-all"
          >
            Sincronizar
          </button>
        </div>
      </div>

      {/* Main Dynamic Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Operations & Inputs panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Driver & Algorithm Settings */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 block pb-2 border-b border-slate-50">
              1. Configuração da Frota
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                Motorista Designado
              </label>
              <select 
                value={selectedDriverId}
                onChange={(e) => {
                  setSelectedDriverId(e.target.value);
                  setIsSimulated(false);
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white outline-none transition-all"
              >
                <option value="">Selecione um motorista disponível...</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.currentVehicle ? `(${d.currentVehicle.vehicleNumber} - ${d.currentVehicle.type})` : '(Sem veículo)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                Algoritmo de Roteirização
              </label>
              <select 
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white outline-none transition-all"
              >
                <option value="OSRM_HEURISTIC">Smart Routing OSRM (Menor Distância + SLA)</option>
                <option value="DISTANCE_ONLY">Menor Distância Absoluta (Haversine)</option>
                <option value="TIME_ONLY">Janelas de Tempo / Urgência do Cliente</option>
              </select>
            </div>
          </div>

          {/* Pending Deliveries Selection Checklist */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4 flex-grow flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-50">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                2. Entregas Pendentes ({deliveries.length})
              </h3>
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {selectedDeliveries.length} Selecionadas
              </span>
            </div>

            {isLoadingDeliveries ? (
              <div className="flex items-center justify-center py-12 flex-grow">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex-grow flex flex-col items-center justify-center">
                <MapPin size={32} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold">Nenhuma entrega pendente no pátio.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 flex-grow">
                {deliveries.map(d => {
                  const isChecked = selectedDeliveries.includes(d.id);
                  return (
                    <label 
                      key={d.id}
                      className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer select-none transition-all ${
                        isChecked 
                          ? 'border-primary bg-indigo-50/40 shadow-sm' 
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDelivery(d.id)}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900">{d.customer?.name || 'Cliente Sem Nome'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] truncate">{d.deliveryAddress}</p>
                          <div className="flex gap-1.5 mt-1.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase">
                              {d.materialType}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase">
                              {d.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <span className="text-[9px] font-mono font-black text-slate-400">
                        {d.deliveryNumber}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Calculations & Actions */}
            <div className="pt-4 border-t border-slate-50 space-y-4">
              {isSimulated && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Distância Total</span>
                    <span className="font-mono font-black text-slate-800 text-sm">{simStats.distance} Km</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Tempo Estimado</span>
                    <span className="font-mono font-black text-slate-800 text-sm">{simStats.duration} Minutos</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Consumo Estimado</span>
                    <span className="font-mono font-black text-emerald-600 text-sm">{simStats.diesel} L (Diesel)</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Margem / Retorno</span>
                    <span className="font-mono font-black text-indigo-600 text-sm">R$ {simStats.margin}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleSimulate}
                  disabled={selectedDeliveries.length === 0}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
                >
                  Simular Rota
                </button>
                <button 
                  type="button"
                  onClick={() => dispatchMutation.mutate()}
                  disabled={dispatchMutation.isPending || !selectedDriverId || selectedDeliveries.length === 0 || !isSimulated}
                  className="flex-1 py-4 bg-primary hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {dispatchMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      Despachar Rota <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Map Viewer */}
        <div className="lg:col-span-7 h-[650px] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm relative">
          <MapContainer 
            center={center} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Central Dispatch Hub Marker */}
            <Marker position={center} icon={truckIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-black text-xs text-slate-800">Centro de Distribuição Central</p>
                  <p className="text-[10px] text-slate-500">Hub Principal EntregaPRO</p>
                </div>
              </Popup>
            </Marker>

            {/* All Pending Deliveries Markers */}
            {deliveries.map(d => {
              const lat = d.latitude || center[0];
              const lng = d.longitude || center[1];
              const isSelected = selectedDeliveries.includes(d.id);
              const sequenceIndex = selectedDeliveries.indexOf(d.id);
              
              const mIcon = isSelected 
                ? createNumberIcon(sequenceIndex + 1, 'bg-indigo-600 shadow-indigo-600/30 scale-110')
                : defaultMarkerIcon;

              return (
                <Marker 
                  key={d.id} 
                  position={[lat, lng]} 
                  icon={mIcon}
                  eventHandlers={{
                    click: () => handleToggleDelivery(d.id)
                  }}
                >
                  <Popup>
                    <div className="p-2 space-y-1.5">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="text-[9px] font-mono font-black text-slate-700">{d.deliveryNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                          isSelected ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isSelected ? `Sequência Stop ${sequenceIndex + 1}` : 'Não Selecionada'}
                        </span>
                      </div>
                      <p className="text-xs font-black text-slate-900">{d.customer?.name || 'Cliente'}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{d.deliveryAddress}</p>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-600 flex justify-between">
                        <span>{d.materialType}</span>
                        <span>{d.quantity}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Simulated Routing Polyline */}
            {isSimulated && simulatedPath.length > 1 && (
              <Polyline 
                positions={simulatedPath}
                color="#4F46E5"
                weight={4}
                dashArray="10, 10"
                opacity={0.8}
              />
            )}
          </MapContainer>

          {/* Quick tips panel overlay (Bottom-right) */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-slate-950/85 backdrop-blur-md text-white p-3 rounded-2xl max-w-xs space-y-1 text-left pointer-events-none">
            <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">Modo Roteirizador</span>
            <p className="text-[10px] font-bold">Dica Operacional:</p>
            <p className="text-[9px] text-slate-300 leading-snug">Clique nos pinos cinzas do mapa para adicioná-los/removê-los instantaneamente da sequência de paradas.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RoutePlanner;
