import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Search, Plus, Truck, Calendar, Gauge, Settings, Layers, Activity, AlertCircle, Wrench, FileText, CheckCircle2, FileCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import VehicleFormModal from './VehicleFormModal';
import VehicleLogsModal from './VehicleLogsModal';
import { DocumentVaultModal } from './DocumentVaultModal';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
  fuelType?: string;
  status: 'active' | 'maintenance' | 'out_of_service';
  lastMaintenance: string;
}

// Conjunto inicial predefinido para evitar telas vazias ou dependência estrita de API mock
const INITIAL_VEHICLES: Vehicle[] = [];

const VehiclesList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Cofre de documentos ativo
  const [vaultConfig, setVaultConfig] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
  }>({ isOpen: false, entityId: '', entityName: '' });

  // Lista local reativa
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);

  const { data: remoteVehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get<Vehicle[]>('/vehicles');
      return res;
    },
    retry: false,
  });

  // Interpolação inteligente que preza pela estabilidade
  const baseVehicles = (remoteVehicles && remoteVehicles.length > 0)
    ? [...localVehicles.filter(lv => !remoteVehicles.some(rv => rv.id === lv.id)), ...remoteVehicles]
    : localVehicles;

  const filteredVehicles = baseVehicles.filter(v => {
    const safeNumber = v.vehicleNumber || '';
    const safeType = v.type || '';
    
    const matchesSearch = safeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          safeType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'Todos' || safeType.includes(typeFilter) || (typeFilter === 'Betoneira' && safeType.includes('Betoneira'));
    const matchesStatus = statusFilter === 'Todos' || v.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleViewLogs = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsLogsModalOpen(true);
  };

  const handleOpenVault = (vehicle: Vehicle) => {
    setVaultConfig({
      isOpen: true,
      entityId: vehicle.id,
      entityName: `${vehicle.vehicleNumber} (${vehicle.type})`,
    });
  };

  const handleStatusToggle = (vehicleId: string, nextStatus: Vehicle['status']) => {
    setLocalVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status: nextStatus } : v));
    toast.success(`Situação operacional atualizada para: ${
      nextStatus === 'active' ? 'Em Operação' : 
      nextStatus === 'maintenance' ? 'Em Manutenção' : 'Inoperante'
    }`);
  };

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setLocalVehicles(prev => [newVehicle, ...prev]);
  };

  return (
    <div className="space-y-8 font-sans select-none pb-12 animate-in fade-in duration-300">
      
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              Gestão de Ativos
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Frota Ativa & Maquinário
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Controle de Frota & Telemetria
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Monitoramento de betoneiras, basculantes, cronograma de manutenções e auditoria de pátio.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text" 
              placeholder="Buscar por placa ou modelo..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 w-full sm:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer outline-none shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            <span>Averbar Veículo</span>
          </button>
        </div>
      </div>

      {/* Faixa de Filtros Avançados */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-white border border-slate-200 p-4 rounded-2xl">
        {/* Filtro de Categoria */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Layers size={12} /> Categoria:
          </span>
          {(['Todos', 'Betoneira', 'Basculante', 'Carregadeira'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setTypeFilter(cat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none",
                typeFilter === cat 
                  ? "bg-slate-900 text-white shadow-2xs" 
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filtro de Status Operacional */}
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-6 pt-2 sm:pt-0 w-full sm:w-auto">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Activity size={12} /> Situação:
          </span>
          {(['Todos', 'active', 'maintenance', 'out_of_service'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none",
                statusFilter === st 
                  ? "bg-indigo-600 text-white shadow-2xs" 
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              {st === 'Todos' ? 'Todos' :
               st === 'active' ? 'Ativo' :
               st === 'maintenance' ? 'Oficina' : 'Baixado'}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs font-bold text-slate-400 hidden lg:block">
          Unidades visíveis: <span className="text-indigo-600">{filteredVehicles.length}</span>
        </div>
      </div>

      {/* Tabela de Frota e Maquinário */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Veículo / Placa</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Equipamento</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Situação Operacional</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Capacidade</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Combustível</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Última O.S.</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                        <div className="h-3.5 bg-slate-100 rounded w-24" />
                      </div>
                    </td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-28" /></td>
                    <td className="p-5"><div className="h-5 bg-slate-50 rounded-md w-16" /></td>
                    <td className="p-5 text-center"><div className="h-5 bg-slate-50 rounded w-12 mx-auto" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-20" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-24" /></td>
                    <td className="p-5 text-right"><div className="h-8 bg-slate-100 rounded-lg w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => {
                  const safeType = vehicle.type || 'Ativo Pesado';
                  const safeNum = vehicle.vehicleNumber || 'S/N';
                  const safeStatus = vehicle.status || 'active';
                  const safeDate = vehicle.lastMaintenance ? new Date(vehicle.lastMaintenance).toLocaleDateString('pt-BR') : 'Sem registro';

                  return (
                    <tr key={vehicle.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="p-5 whitespace-nowrap">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                            <Truck size={18} className="text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-xs tracking-tight">
                              {safeNum}
                            </h4>
                            <span className="font-mono text-[9px] text-slate-400 font-bold block mt-0.5">
                              ID: {vehicle.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 whitespace-nowrap text-xs font-bold text-slate-700">
                        {safeType}
                      </td>
                      <td className="p-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border inline-block whitespace-nowrap",
                            safeStatus === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            safeStatus === 'maintenance' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"
                          )}>
                            {safeStatus === 'active' ? 'Operacional' :
                             safeStatus === 'maintenance' ? 'Revisão' : 'Inoperante'}
                          </span>
                          <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                            {(['active', 'maintenance', 'out_of_service'] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => handleStatusToggle(vehicle.id, st)}
                                className={cn(
                                  "p-1 rounded transition-colors cursor-pointer outline-none",
                                  safeStatus === st && "bg-white shadow-2xs text-slate-900"
                                )}
                                title={st === 'active' ? 'Marcar Ativo' : st === 'maintenance' ? 'Marcar Oficina' : 'Marcar Inoperante'}
                              >
                                {st === 'active' ? <CheckCircle2 size={11} className={safeStatus === st ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"} /> :
                                 st === 'maintenance' ? <Wrench size={11} className={safeStatus === st ? "text-amber-600" : "text-slate-400 hover:text-slate-600"} /> :
                                 <AlertCircle size={11} className={safeStatus === st ? "text-red-600" : "text-slate-400 hover:text-slate-600"} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-center whitespace-nowrap">
                        <span className="text-xs font-mono font-black text-slate-800 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <Gauge size={11} className="text-indigo-500" />
                          {vehicle.capacity || 12} T/m³
                        </span>
                      </td>
                      <td className="p-5 whitespace-nowrap text-xs font-bold text-slate-600">
                        {vehicle.fuelType || 'Diesel S10'}
                      </td>
                      <td className="p-5 whitespace-nowrap text-xs font-mono font-bold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {safeDate}
                        </div>
                      </td>
                      <td className="p-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenVault(vehicle)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer outline-none shrink-0"
                            title="Auditoria de CRLV, Seguros e Certidões"
                          >
                            <FileCheck size={12} className="text-indigo-600" />
                            <span>Documentos</span>
                          </button>
                          <button 
                            onClick={() => handleViewLogs(vehicle)}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer outline-none shrink-0"
                          >
                            <FileText size={12} />
                            <span>O.S.</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center bg-white">
                    <Truck className="mx-auto text-slate-300 mb-3" size={40} />
                    <p className="text-sm font-black text-slate-900">Nenhum ativo frotista cadastrado na matriz</p>
                    <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto mt-1">
                      Verifique os filtros selecionados ou clique em "Averbar Veículo" para inserir uma nova betoneira ou basculante.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VehicleFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onVehicleCreated={handleVehicleCreated}
      />

      <VehicleLogsModal 
        isOpen={isLogsModalOpen} 
        onClose={() => setIsLogsModalOpen(false)} 
        vehicle={selectedVehicle}
      />

      <DocumentVaultModal
        isOpen={vaultConfig.isOpen}
        onClose={() => setVaultConfig(prev => ({ ...prev, isOpen: false }))}
        entityType="truck"
        entityId={vaultConfig.entityId}
        entityName={vaultConfig.entityName}
      />
    </div>
  );
};

export default VehiclesList;
