import React, { useEffect, useState } from 'react';
import { X, Wrench, Calendar, Clock, Fuel, AlertCircle, Loader2, Gauge, DollarSign, Building2 } from 'lucide-react';
import { api } from '../api/client';
import { cn } from '../lib/utils';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: string;
}

interface MaintenanceLog {
  id: string;
  serviceType: string;
  serviceDate: string;
  cost: number;
  odometer: number;
  providerName?: string;
  notes?: string;
  nextDueDate?: string;
}

interface FuelLog {
  id: string;
  litersFilled: number;
  costPerLiter: number;
  totalCost: number;
  odometer: number;
  stationName?: string;
  fillDate: string;
  driver?: { user: { name: string } };
}

interface VehicleLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

type Tab = 'maintenance' | 'fuel';

const VehicleLogsModal: React.FC<VehicleLogsModalProps> = ({ isOpen, onClose, vehicle }) => {
  const [activeTab, setActiveTab] = useState<Tab>('maintenance');
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !vehicle) return;
    setLoading(true);
    setError('');
    setMaintenanceLogs([]);
    setFuelLogs([]);

    Promise.all([
      api.get<MaintenanceLog[]>(`/maintenance-logs?vehicleId=${vehicle.id}`).catch(() => [] as MaintenanceLog[]),
      api.get<FuelLog[]>(`/fuel-logs?vehicleId=${vehicle.id}`).catch(() => [] as FuelLog[]),
    ])
      .then(([maintenance, fuel]) => {
        setMaintenanceLogs(Array.isArray(maintenance) ? maintenance : []);
        setFuelLogs(Array.isArray(fuel) ? fuel : []);
      })
      .catch(() => setError('Erro ao carregar dados do veículo.'))
      .finally(() => setLoading(false));
  }, [isOpen, vehicle]);

  if (!isOpen) return null;

  const tabs: { key: Tab; label: string; icon: typeof Wrench; count: number }[] = [
    { key: 'maintenance', label: 'Manutenções', icon: Wrench, count: maintenanceLogs.length },
    { key: 'fuel', label: 'Abastecimentos', icon: Fuel, count: fuelLogs.length },
  ];

  const renderMaintenanceTab = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600 mb-3" size={28} />
          <p className="text-sm font-bold text-slate-600">Carregando ordens de serviço...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="text-red-400 mb-3" size={32} />
          <p className="text-sm font-bold text-slate-700">{error}</p>
          <p className="text-xs text-slate-400 mt-1">Tente novamente mais tarde.</p>
        </div>
      );
    }

    if (maintenanceLogs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wrench className="text-slate-300 mb-3" size={40} />
          <p className="text-sm font-black text-slate-900">Nenhuma ordem de serviço</p>
          <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
            Este veículo não possui manutenções registradas no sistema.
          </p>
        </div>
      );
    }

    return maintenanceLogs.map((log, idx) => {
      const isLast = idx === maintenanceLogs.length - 1;
      return (
        <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
          <div className="flex flex-col items-center pt-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Wrench size={14} />
            </div>
            {!isLast && <div className="w-px h-full bg-slate-100 my-1 min-h-[40px]"></div>}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-sm text-slate-900">{log.serviceType}</h4>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                R$ {log.cost.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <Calendar size={11} />
                {new Date(log.serviceDate).toLocaleDateString('pt-BR')}
              </span>
              {log.odometer > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <Gauge size={11} />
                  {log.odometer.toLocaleString('pt-BR')} km
                </span>
              )}
              {log.providerName && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <Building2 size={11} />
                  {log.providerName}
                </span>
              )}
            </div>
            {log.notes && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {log.notes}
              </p>
            )}
            {log.nextDueDate && (
              <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-600 font-bold">
                <Clock size={10} />
                Próxima vencimento: {new Date(log.nextDueDate).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const renderFuelTab = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600 mb-3" size={28} />
          <p className="text-sm font-bold text-slate-600">Carregando abastecimentos...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="text-red-400 mb-3" size={32} />
          <p className="text-sm font-bold text-slate-700">{error}</p>
          <p className="text-xs text-slate-400 mt-1">Tente novamente mais tarde.</p>
        </div>
      );
    }

    if (fuelLogs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Fuel className="text-slate-300 mb-3" size={40} />
          <p className="text-sm font-black text-slate-900">Nenhum abastecimento registrado</p>
          <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
            Este veículo não possui registros de combustível no sistema.
          </p>
        </div>
      );
    }

    return fuelLogs.map((log, idx) => {
      const isLast = idx === fuelLogs.length - 1;
      return (
        <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
          <div className="flex flex-col items-center pt-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Fuel size={14} />
            </div>
            {!isLast && <div className="w-px h-full bg-slate-100 my-1 min-h-[40px]"></div>}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-sm text-slate-900">
                {log.stationName || 'Posto não informado'}
              </h4>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                R$ {log.totalCost.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <Calendar size={11} />
                {new Date(log.fillDate).toLocaleDateString('pt-BR')}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <Fuel size={11} />
                {log.litersFilled.toFixed(1)} L
              </span>
              {log.odometer > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <Gauge size={11} />
                  {log.odometer.toLocaleString('pt-BR')} km
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <DollarSign size={11} />
                R$ {log.costPerLiter.toFixed(2)}/L
              </span>
              {log.driver?.user?.name && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <Building2 size={11} />
                  {log.driver.user.name}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">Registro Operacional</h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {vehicle ? `${vehicle.vehicleNumber} - ${vehicle.type}` : 'Carregando...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer outline-none">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/30 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all cursor-pointer outline-none",
                activeTab === tab.key
                  ? "text-indigo-600 bg-white border-b-2 border-indigo-600"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-black">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'maintenance' ? renderMaintenanceTab() : renderFuelTab()}
        </div>

        <div className="p-5 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer outline-none"
          >
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleLogsModal;
