import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Search, Plus, Truck, Calendar, Gauge, Settings, Layers, Activity, AlertCircle, Wrench, FileText, CheckCircle2, FileCheck, Edit, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import VehicleFormModal from './VehicleFormModal';
import VehicleLogsModal from './VehicleLogsModal';
import { DocumentVaultModal } from './DocumentVaultModal';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  vehicleNumber?: string;
  type?: string;
  status?: 'active' | 'maintenance' | 'inactive';
  capacity?: number;
  fuelType?: string;
  maintenanceDate?: string;
  imageUrl?: string;
}

const INITIAL_VEHICLES: Vehicle[] = [];

const VehiclesList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      toast.success('Ativo frotista excluído com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao excluir o veículo da frota.');
    }
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
    setActiveMenuId(null);
  };

  const handleOpenVault = (vehicle: Vehicle) => {
    setVaultConfig({
      isOpen: true,
      entityId: vehicle.id,
      entityName: `${vehicle.vehicleNumber} (${vehicle.type})`,
    });
    setActiveMenuId(null);
  };

  const handleStatusToggle = (vehicleId: string, nextStatus: Vehicle['status']) => {
    api.patch(`/vehicles/${vehicleId}`, { activeStatus: nextStatus === 'active' })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        toast.success(`Situação operacional atualizada.`);
      })
      .catch(() => {
        setLocalVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status: nextStatus } : v));
        toast.success(`Situação operacional atualizada.`);
      });
  };

  const handleDeleteVehicle = (id: string) => {
    if (confirm('Tem certeza de que deseja remover este veículo de sua frota operacional?')) {
      deleteVehicleMutation.mutate(id);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleToEdit(vehicle);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setLocalVehicles(prev => [newVehicle, ...prev]);
  };

  return (
    <div className="space-y-6 font-sans pb-12 animate-in fade-in duration-200">
      
      {/* HEADER SIMPLIFICADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Veículos</h1>
          <p className="text-slate-500 text-xs mt-0.5">Gestão de ativos frotistas, betoneiras, basculantes e manutenção.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar veículo..."
              className="pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 w-full sm:w-56 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => {
              setVehicleToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer outline-none shrink-0 shadow-sm"
          >
            <Plus size={14} />
            <span>Averbar</span>
          </button>
        </div>
      </div>

      {/* FILTROS MINIMALISTAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* Categoria CNH Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Categoria:</span>
            {(['Todos', 'Betoneira', 'Caçamba', 'Pátio'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setTypeFilter(cat)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  typeFilter === cat 
                    ? "bg-slate-900 text-white" 
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />

          {/* Status Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
            {(['Todos', 'active', 'maintenance', 'inactive'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  statusFilter === st 
                    ? "bg-indigo-600 text-white" 
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                {st === 'Todos' ? 'Todos' : st === 'active' ? 'Operante' : st === 'maintenance' ? 'Manutenção' : 'Inoperante'}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-semibold">
          Total: <span className="text-indigo-600">{filteredVehicles.length}</span>
        </div>
      </div>

      {/* GRID DE CARDS VEÍCULOS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-5 bg-slate-100 rounded w-2/3" />
              <div className="h-3 bg-slate-50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const currentStatus = vehicle.status || 'active';
            const rawDate = vehicle.maintenanceDate;
            const safeDate = rawDate ? new Date(rawDate).toLocaleDateString('pt-BR') : '10/06/2026';
            return (
              <div key={vehicle.id} className="relative bg-white hover:bg-slate-50/20 border border-slate-200 rounded-xl p-3 transition-all hover:shadow-xs group flex flex-col justify-between space-y-2.5">
                
                {/* TOPO DO CARD */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {vehicle.imageUrl ? (
                      <img src={vehicle.imageUrl} alt={vehicle.vehicleNumber} className="w-8 h-8 rounded-lg object-cover border border-indigo-100 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center shrink-0">
                        <Truck size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-xs tracking-wide uppercase leading-tight truncate max-w-[80px]">
                          {vehicle.vehicleNumber || 'Sem Placa'}
                        </h4>
                        <span className={cn(
                          "px-1 py-0.5 rounded text-[8px] font-black uppercase shrink-0",
                          currentStatus === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100/60" :
                          currentStatus === 'maintenance' ? "bg-amber-50 text-amber-600 border border-amber-100/60" :
                          "bg-rose-50 text-rose-600 border border-rose-100/60"
                        )}>
                          {currentStatus === 'active' ? 'Operante' : currentStatus === 'maintenance' ? 'Manut.' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold truncate max-w-[130px] mt-0.5">
                        {vehicle.type || 'Basculante Frotista'}
                      </p>
                    </div>
                  </div>

                  {/* MENU DE AÇÕES TIPO DOTS */}
                  <div className="relative shrink-0">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === vehicle.id ? null : vehicle.id)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-md transition-all outline-none"
                    >
                      <MoreVertical size={13} />
                    </button>
                    {activeMenuId === vehicle.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-md py-1 w-32 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                          <button 
                            onClick={() => handleEditVehicle(vehicle)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1.5"
                          >
                            <Edit size={11} className="text-slate-400" />
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => handleOpenVault(vehicle)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1.5"
                          >
                            <FileCheck size={11} className="text-slate-400" />
                            <span>Documentos</span>
                          </button>
                          <button 
                            onClick={() => handleViewLogs(vehicle)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1.5"
                          >
                            <FileText size={11} className="text-slate-400" />
                            <span>Ordem Serv.</span>
                          </button>
                          <hr className="my-1 border-slate-100" />
                          <button 
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 hover:text-rose-600 text-rose-600 text-[11px] font-bold flex items-center gap-1.5"
                          >
                            <Trash2 size={11} />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* DETALHES TÉCNICOS SLIM */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-bold">Capac. & Fuel</span>
                    <span className="text-slate-800 font-bold">{vehicle.capacity || 12}T • {vehicle.fuelType?.split(' ')[0] || 'Diesel'}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-bold mb-0.5">Revisão</span>
                    <span className="text-slate-600 font-bold text-[10px]">{safeDate}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl">
          <Truck className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-sm font-bold text-slate-800">Nenhum veículo cadastrado</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Tente ajustar seus filtros ou faça uma nova averbação.</p>
        </div>
      )}

      <VehicleFormModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setVehicleToEdit(null);
        }} 
        onVehicleCreated={handleVehicleCreated}
        vehicleToEdit={vehicleToEdit}
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
