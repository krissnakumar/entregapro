import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  Truck, Scale, AlertTriangle, CheckCircle2, RefreshCw, BarChart3, ShieldCheck, Info,
  LayoutGrid, List, Search
} from 'lucide-react';

interface FleetCapacityItem {
  id: string;
  plateNumber: string;
  driverName: string;
  vehicleType: 'BETONEIRA_3EIXOS' | 'BETONEIRA_4EIXOS' | 'BASCULANTE_TOCO' | 'BASCULANTE_TRUCK';
  volumetricCapacityM3: number;
  allocatedVolumeM3: number;
  tareWeightKg: number; // Empty weight
  cargoWeightKg: number; // Weight of concrete/materials loaded
  maxGvwKg: number; // Maximum Gross Vehicle Weight (PBT)
  frontAxleWeightKg: number; // Current weight on directional front axle
  rearAxleWeightKg: number; // Current weight on rear axles tandem
}

export function LoadCapacityPage() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'columns' | 'list'>('columns');
  
  // Local Fleet Capacity Database with high-fidelity telemetry metrics
  const [fleet, setFleet] = useState<FleetCapacityItem[]>([
    {
      id: 'truck-1',
      plateNumber: 'EUT-8921',
      driverName: 'Carlos Mendonça',
      vehicleType: 'BETONEIRA_3EIXOS',
      volumetricCapacityM3: 8.0,
      allocatedVolumeM3: 8.0,
      tareWeightKg: 11000,
      cargoWeightKg: 19200, // 8 m³ concrete * ~2400kg/m³ = 19,200 kg
      maxGvwKg: 29000, // 29 tons legal limit for 3-axis truck in SP
      frontAxleWeightKg: 5800, // legal limit 6.0 tons
      rearAxleWeightKg: 24400 // legal limit 23.0 tons (PBT excess check)
    },
    {
      id: 'truck-2',
      plateNumber: 'DFG-4501',
      driverName: 'Junior Ferreira',
      vehicleType: 'BETONEIRA_4EIXOS',
      volumetricCapacityM3: 10.0,
      allocatedVolumeM3: 7.0, // light load
      tareWeightKg: 13500,
      cargoWeightKg: 16800,
      maxGvwKg: 34000, // 34 tons limit for 4-axis
      frontAxleWeightKg: 5200,
      rearAxleWeightKg: 25100
    },
    {
      id: 'truck-3',
      plateNumber: 'KLS-9033',
      driverName: 'Marcos Almeida',
      vehicleType: 'BETONEIRA_3EIXOS',
      volumetricCapacityM3: 8.0,
      allocatedVolumeM3: 8.0,
      tareWeightKg: 11000,
      cargoWeightKg: 21600, // Overloaded! 9 m³ of heavy concrete mix loaded
      maxGvwKg: 29000,
      frontAxleWeightKg: 6400, // Over limit! (Max 6.0t)
      rearAxleWeightKg: 26200 // Over limit!
    }
  ]);

  // Selected Truck for Live Axle Load Simulator (Lei da Balança ANTT)
  const [selectedTruckId, setSelectedTruckId] = useState<string>('truck-1');

  const selectedTruck = useMemo(() => {
    return fleet.find(t => t.id === selectedTruckId) || fleet[0];
  }, [fleet, selectedTruckId]);

  const handleSimulateAdjustLoad = (weightReduction: number) => {
    setFleet(prev => prev.map(t => {
      if (t.id === selectedTruckId) {
        const newCargoWeight = Math.max(0, t.cargoWeightKg - weightReduction);
        const ratio = newCargoWeight / t.cargoWeightKg;
        return {
          ...t,
          cargoWeightKg: newCargoWeight,
          allocatedVolumeM3: Math.max(0, parseFloat((t.allocatedVolumeM3 * ratio).toFixed(1))),
          frontAxleWeightKg: Math.max(0, Math.round(t.frontAxleWeightKg * ratio)),
          rearAxleWeightKg: Math.max(0, Math.round(t.rearAxleWeightKg * ratio))
        };
      }
      return t;
    }));
    toast.success('Distribuição de eixos recalculada com redução de carga.');
  };

  const filteredFleet = useMemo(() => {
    return fleet.filter(t => 
      t.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.driverName.toLowerCase().includes(search.toLowerCase())
    );
  }, [fleet, search]);

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500">
      
      {/* Header Panel (Compact) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
        <div className="pl-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase tracking-wider rounded border border-emerald-100/60">
              Lei da Balança
            </span>
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            Capacidade de Carga & Eixos
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Cálculo de distribuição por eixos, cubagem e prevenção de multas ANTT / DER-SP.
          </p>
        </div>

        {/* View Mode Toggle inside header */}
        <div className="flex items-center bg-slate-100 border p-1 rounded-xl w-fit self-start sm:self-center">
          <button
            onClick={() => setViewMode('columns')}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer outline-none",
              viewMode === 'columns' ? "bg-white text-emerald-600 shadow-3xs border border-slate-200/50" : "text-slate-500 hover:text-slate-900"
            )}
            title="Exibir como Colunas / Cards"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer outline-none",
              viewMode === 'list' ? "bg-white text-emerald-600 shadow-3xs border border-slate-200/50" : "text-slate-500 hover:text-slate-900"
            )}
            title="Exibir como Lista / Tabela"
          >
            <List size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Fleet List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar placa ou motorista..."
              className="w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" 
            />
          </div>

          {viewMode === 'columns' ? (
            <div className="space-y-3">
              {filteredFleet.map((truck) => {
                const currentTotalWeight = truck.tareWeightKg + truck.cargoWeightKg;
                const isOverloaded = currentTotalWeight > truck.maxGvwKg || truck.frontAxleWeightKg > 6000;
                const isSelected = selectedTruckId === truck.id;

                return (
                  <div 
                    key={truck.id}
                    onClick={() => setSelectedTruckId(truck.id)}
                    className={cn(
                      "bg-white rounded-3xl border p-5 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4",
                      isSelected ? "border-emerald-500 ring-2 ring-emerald-500/10" : "border-slate-100",
                      isOverloaded && !isSelected && "border-l-rose-500"
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] font-black rounded">
                          {truck.plateNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">{truck.driverName}</span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm">
                        {truck.vehicleType === 'BETONEIRA_3EIXOS' ? 'Betoneira Scania 3 Eixos' : 'Betoneira Mercedes 4 Eixos'}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>Volume: <strong>{truck.allocatedVolumeM3}m³ / {truck.volumetricCapacityM3}m³</strong></span>
                        <span>PBT Real: <strong>{(currentTotalWeight / 1000).toFixed(1)}t</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isOverloaded ? (
                        <span className="px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                          <AlertTriangle size={12} /> Excesso de Carga
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                          <CheckCircle2 size={12} /> Peso Conforme
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/70 border-b border-slate-100">
                      <th className="py-3.5 px-6">Placa / Modelo</th>
                      <th className="py-3.5 px-4">Motorista</th>
                      <th className="py-3.5 px-4 text-center">Volume</th>
                      <th className="py-3.5 px-4 text-center">PBT Real</th>
                      <th className="py-3.5 px-4 text-center">Limite</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFleet.map((truck) => {
                      const currentTotalWeight = truck.tareWeightKg + truck.cargoWeightKg;
                      const isOverloaded = currentTotalWeight > truck.maxGvwKg || truck.frontAxleWeightKg > 6000;
                      const isSelected = selectedTruckId === truck.id;

                      return (
                        <tr 
                          key={truck.id} 
                          onClick={() => setSelectedTruckId(truck.id)}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-slate-50/40"
                          )}
                        >
                          <td className="py-3.5 px-6 font-bold">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-900 text-white font-mono text-[9px] font-black rounded">
                                {truck.plateNumber}
                              </span>
                              <span className="text-[11px] text-slate-700">
                                {truck.vehicleType === 'BETONEIRA_3EIXOS' ? 'Scania 3 Eixos' : 'Mercedes 4 Eixos'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-500 text-[11px]">{truck.driverName}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">{truck.allocatedVolumeM3} / {truck.volumetricCapacityM3} m³</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">{(currentTotalWeight / 1000).toFixed(1)} t</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">{(truck.maxGvwKg / 1000).toFixed(0)} t</td>
                          <td className="py-3.5 px-4">
                            {isOverloaded ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-black uppercase rounded border border-rose-100/60">
                                Excesso
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded border border-emerald-100/60">
                                Liberado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Axle Calculator Detail */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-2 border-b border-white/10 pb-4">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400">Auditor Técnico de Eixos</span>
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <Scale size={20} className="text-emerald-400" /> Balança: {selectedTruck.plateNumber}
              </h3>
            </div>

            {/* Visual Weight Distribution */}
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Eixo Direcional (Frente)</span>
                  <span className={cn(
                    "font-bold",
                    selectedTruck.frontAxleWeightKg > 6000 ? "text-rose-400 font-black animate-pulse" : "text-white"
                  )}>
                    {selectedTruck.frontAxleWeightKg} kg
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      selectedTruck.frontAxleWeightKg > 6000 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, (selectedTruck.frontAxleWeightKg / 6000) * 100)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Limite Legal: 6.000 kg</span>
                  <span>{((selectedTruck.frontAxleWeightKg / 6000) * 100).toFixed(0)}% ocupado</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Eixo Traseiro (Tandem)</span>
                  <span className={cn(
                    "font-bold",
                    selectedTruck.rearAxleWeightKg > 24000 ? "text-rose-400 font-black animate-pulse" : "text-white"
                  )}>
                    {selectedTruck.rearAxleWeightKg} kg
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      selectedTruck.rearAxleWeightKg > 24000 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                    )} 
                    style={{ width: `${Math.min(100, (selectedTruck.rearAxleWeightKg / 24000) * 100)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Limite Legal: 24.000 kg</span>
                  <span>{((selectedTruck.rearAxleWeightKg / 24000) * 100).toFixed(0)}% ocupado</span>
                </div>
              </div>
            </div>

            {/* Overload Alert Warnings */}
            {(selectedTruck.frontAxleWeightKg > 6000 || selectedTruck.rearAxleWeightKg > 24000) ? (
              <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-4 rounded-2xl text-xs space-y-2 font-sans">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={14} className="text-rose-400" /> Alerta de Multa SEFAZ-SP
                </div>
                <p className="text-[11px] leading-relaxed text-rose-300">
                  O veículo excede os limites de eixos regulamentados pela ANTT e portaria do DER-SP. Risco de retenção imediata em balanças rodoviárias municipais.
                </p>
                <button 
                  onClick={() => handleSimulateAdjustLoad(1500)}
                  className="w-full mt-2 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Drenar Excesso (1.5t)
                </button>
              </div>
            ) : (
              <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-200 p-4 rounded-2xl text-xs space-y-1 font-sans">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck size={14} /> Veículo Liberado
                </div>
                <p className="text-[10px] text-emerald-300">
                  Distribuição de peso nos eixos está dentro do limite de tolerância de 5% da balança.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
