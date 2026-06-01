import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Search, Plus, MapPin, Truck, Star, Phone, ShieldCheck, AlertTriangle, UserCheck, X, Award, CheckCircle2, Filter, FileCheck, Edit, Trash2, MoreVertical, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { DocumentVaultModal } from './DocumentVaultModal';
import { toast } from 'sonner';

interface Driver {
  id: string;
  name?: string;
  phone?: string;
  status?: 'disponível' | 'em_rota' | 'em_descanso';
  rating?: number;
  cnhNumber?: string;
  cnhCategory?: 'C' | 'D' | 'E';
  cnhExpiration?: string;
  tripsCount?: number;
  avatarUrl?: string;
  currentVehicle?: {
    id?: string;
    vehicleNumber: string;
    type: string;
  } | null;
}

const INITIAL_DRIVERS: Driver[] = [];

const DriversList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    cnhNumber: '',
    cnhCategory: 'E' as const,
    cnhExpiration: '',
    vehicleId: '',
    avatarUrl: '',
  });

  // Cofre de documentos ativo
  const [vaultConfig, setVaultConfig] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
  }>({ isOpen: false, entityId: '', entityName: '' });

  const [localDrivers, setLocalDrivers] = useState<Driver[]>(INITIAL_DRIVERS);

  const { data: remoteDrivers, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get<Driver[]>('/drivers');
      return res;
    },
    retry: false,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get<any[]>('/vehicles');
      return res;
    },
    retry: false,
  });

  const createDriverMutation = useMutation({
    mutationFn: (payload: any) => api.post('/drivers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.patch(`/drivers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/drivers/${id}`),
    onSuccess: () => {
      toast.success('Prontuário de condutor removido.');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao remover prontuário.');
    }
  });

  const handleDeleteDriver = (id: string) => {
    if (confirm('Deseja realmente remover este motorista do prontuário operacional?')) {
      deleteDriverMutation.mutate(id);
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setNewDriver({
      name: driver.name || '',
      phone: driver.phone || '',
      cnhNumber: driver.cnhNumber || '',
      cnhCategory: driver.cnhCategory || 'E',
      cnhExpiration: driver.cnhExpiration ? new Date(driver.cnhExpiration).toISOString().split('T')[0] : '',
      vehicleId: driver.currentVehicle?.id || '',
      avatarUrl: driver.avatarUrl || '',
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const getAvailableVehicles = (currentVehicleId?: string) => {
    if (!vehicles) return [];
    const assignedVehicleIds = baseDrivers
      .map(d => d.currentVehicle?.id)
      .filter((id): id is string => !!id && id !== currentVehicleId);
    
    return vehicles.filter(v => !assignedVehicleIds.includes(v.id));
  };

  const handleUpdateVehicle = (driverId: string, vehicleId: string | null) => {
    updateDriverMutation.mutate(
      { id: driverId, payload: { vehicleId } },
      {
        onSuccess: () => {
          toast.success('Alocação de veículo atualizada.');
        },
        onError: (err: any) => {
          toast.toast.error(`Erro ao alocar veículo: ${err.message}`);
        }
      }
    );
  };

  const handleUpdateStatus = (driverId: string, nextStatus: any) => {
    updateDriverMutation.mutate(
      { id: driverId, payload: { status: nextStatus } },
      {
        onSuccess: () => {
          toast.success(`Status operacional alterado para ${nextStatus.replace('_', ' ')}.`);
        },
        onError: () => {
          setLocalDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: nextStatus } : d));
          toast.success(`Status operacional alterado localmente.`);
        }
      }
    );
  };

  const baseDrivers = (remoteDrivers && remoteDrivers.length > 0)
    ? [...localDrivers.filter(ld => !remoteDrivers.some(rd => rd.id === ld.id)), ...remoteDrivers]
    : localDrivers;

  const filteredDrivers = baseDrivers.filter(driver => {
    const safeName = driver.name || '';
    const safeCnh = driver.cnhNumber || '';
    const safeVehicle = driver.currentVehicle?.vehicleNumber || '';
    
    const matchesSearch = safeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          safeCnh.includes(searchTerm) ||
                          safeVehicle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'Todas' || driver.cnhCategory === categoryFilter;
    const matchesStatus = statusFilter === 'Todos' || driver.status === statusFilter || (!driver.status && statusFilter === 'disponível');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const checkCnhStatus = (expirationDate?: string) => {
    if (!expirationDate) return { label: 'Sem Registro', color: 'text-slate-400 bg-slate-50' };
    const daysLeft = Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysLeft < 0) return { label: 'Vencida', color: 'text-red-700 bg-red-50' };
    if (daysLeft <= 45) return { label: `Validade: ${daysLeft} dias`, color: 'text-amber-700 bg-amber-50' };
    return { label: 'Regular', color: 'text-emerald-700 bg-emerald-50' };
  };

  const handleOpenVault = (driver: Driver) => {
    setVaultConfig({
      isOpen: true,
      entityId: driver.id,
      entityName: driver.name || 'Condutor Credenciado',
    });
    setActiveMenuId(null);
  };

  const handleSubmitDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.cnhNumber || !newDriver.cnhExpiration) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const payload = {
      name: newDriver.name,
      phone: newDriver.phone || '(11) 99999-0000',
      cnhNumber: newDriver.cnhNumber,
      cnhCategory: newDriver.cnhCategory,
      cnhExpiration: newDriver.cnhExpiration ? new Date(newDriver.cnhExpiration).toISOString() : null,
      vehicleId: newDriver.vehicleId || null,
      avatarUrl: newDriver.avatarUrl || null,
    };

    if (editingDriver) {
      updateDriverMutation.mutate(
        { id: editingDriver.id, payload },
        {
          onSuccess: () => {
            toast.success('Cadastro atualizado com sucesso.');
            setIsModalOpen(false);
            setEditingDriver(null);
            setNewDriver({ name: '', phone: '', cnhNumber: '', cnhCategory: 'E', cnhExpiration: '', vehicleId: '', avatarUrl: '' });
          },
          onError: (err: any) => {
            toast.error(err.message || 'Falha ao atualizar o condutor.');
          }
        }
      );
    } else {
      createDriverMutation.mutate(
        payload,
        {
          onSuccess: () => {
            toast.success('Motorista averbado com sucesso.');
            setIsModalOpen(false);
            setNewDriver({ name: '', phone: '', cnhNumber: '', cnhCategory: 'E', cnhExpiration: '', vehicleId: '', avatarUrl: '' });
          },
          onError: () => {
            toast.error('Falha ao averbar motorista.');
          },
        },
      );
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12 animate-in fade-in duration-200">
      
      {/* HEADER SIMPLIFICADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Motoristas</h1>
          <p className="text-slate-500 text-xs mt-0.5">Gerenciamento de prontuário, credenciais e alocações de ativos.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar motorista..."
              className="pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 w-full sm:w-56 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => {
              setEditingDriver(null);
              setNewDriver({ name: '', phone: '', cnhNumber: '', cnhCategory: 'E', cnhExpiration: '', vehicleId: '' });
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer outline-none shrink-0 shadow-sm"
          >
            <Plus size={14} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      {/* FILTROS MINIMALISTAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* Categoria CNH Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">CNH:</span>
            {(['Todas', 'C', 'D', 'E'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  categoryFilter === cat 
                    ? "bg-slate-900 text-white" 
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                {cat === 'Todas' ? 'Todas' : `Cat. ${cat}`}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />

          {/* Status Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
            {(['Todos', 'disponível', 'em_rota', 'em_descanso'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer",
                  statusFilter === st 
                    ? "bg-indigo-600 text-white" 
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                {st === 'Todos' ? 'Todos' : st === 'disponível' ? 'Livre' : st === 'em_rota' ? 'Em Rota' : 'Descanso'}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-semibold">
          Total: <span className="text-indigo-600">{filteredDrivers.length}</span>
        </div>
      </div>

      {/* CARDS MINIMALISTAS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-50 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3.5 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const cnhMeta = checkCnhStatus(driver.cnhExpiration);
            const safeName = driver.name || 'Condutor Autorizado';
            const initials = safeName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'MT';
            const currentStatus = driver.status || 'disponível';
            return (
              <div key={driver.id} className="relative bg-white hover:bg-slate-50/20 border border-slate-200 rounded-xl p-3 transition-all hover:shadow-xs group flex flex-col justify-between space-y-2.5">
                
                {/* TOPO DO CARD */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      {driver.avatarUrl ? (
                        <img src={driver.avatarUrl} alt={safeName} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200 text-slate-700 rounded-full flex items-center justify-center font-bold text-[10px]">
                          {initials}
                        </div>
                      )}
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                        currentStatus === 'disponível' ? "bg-emerald-500" :
                        currentStatus === 'em_rota' ? "bg-indigo-500" : "bg-amber-500"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate max-w-[130px] group-hover:text-indigo-600 transition-colors leading-tight">
                        {safeName}
                      </h4>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <span className="inline-flex items-center text-amber-500 font-bold mr-1">
                          <Star size={8} className="fill-current mr-0.5" />
                          {(driver.rating || 5.0).toFixed(1)}
                        </span>
                        <span>CNH {driver.cnhCategory || 'E'}</span>
                      </p>
                    </div>
                  </div>

                  {/* MENU DE AÇÕES TIPO DOTS */}
                  <div className="relative shrink-0">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === driver.id ? null : driver.id)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-md transition-all outline-none"
                    >
                      <MoreVertical size={13} />
                    </button>
                    {activeMenuId === driver.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-md py-1 w-32 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                          <button 
                            onClick={() => handleEditDriver(driver)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1.5"
                          >
                            <Edit size={11} className="text-slate-400" />
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => handleOpenVault(driver)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1.5"
                          >
                            <FileCheck size={11} className="text-slate-400" />
                            <span>Documentos</span>
                          </button>
                          <hr className="my-1 border-slate-100" />
                          <button 
                            onClick={() => handleDeleteDriver(driver.id)}
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

                {/* INFO MEIO (VEÍCULO E VALIDADE) */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                  <div className="flex flex-col min-w-0">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-bold">Veículo</span>
                    <select
                      value={driver.currentVehicle?.id || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateVehicle(driver.id, val === '' ? null : val);
                      }}
                      disabled={updateDriverMutation.isPending}
                      className="bg-transparent border-0 hover:text-indigo-600 focus:text-indigo-600 focus:ring-0 text-slate-800 text-[11px] font-bold outline-none cursor-pointer p-0 w-28 truncate"
                    >
                      <option value="">Nenhum</option>
                      {getAvailableVehicles(driver.currentVehicle?.id).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicleNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-bold mb-0.5">CNH</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase", cnhMeta.color)}>
                      {cnhMeta.label.replace('Validade: ', '')}
                    </span>
                  </div>
                </div>

                {/* STATUS OPERATION SELECTOR */}
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 w-full justify-between">
                    {(['disponível', 'em_rota', 'em_descanso'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(driver.id, st)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-transparent flex-1 text-center",
                          currentStatus === st 
                            ? "bg-white text-slate-900 border-slate-200 shadow-2xs font-extrabold" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {st === 'disponível' ? 'Livre' : st === 'em_rota' ? 'Rota' : 'Pausa'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl">
          <UserCheck className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-sm font-bold text-slate-800">Nenhum motorista encontrado</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Tente ajustar seus filtros ou faça uma nova averbação.</p>
        </div>
      )}

      {/* Modal de Cadastro Rápido de Condutor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">
                    {editingDriver ? 'Editar Motorista' : 'Averbar Motorista'}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {editingDriver ? 'Modificação do prontuário operacional do condutor' : 'Credenciamento e CNH corporativa'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer outline-none">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDriver} className="p-6 space-y-4 bg-white flex-1 overflow-y-auto">
              
              <div className="space-y-1.5 mb-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Foto de Perfil do Condutor</label>
                <div className="flex items-center gap-3">
                  {newDriver.avatarUrl ? (
                    <img src={newDriver.avatarUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-slate-200 animate-in fade-in" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase">
                      Foto
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewDriver(prev => ({ ...prev, avatarUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="driver-avatar-upload"
                    />
                    <label
                      htmlFor="driver-avatar-upload"
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-block outline-none"
                    >
                      Selecionar Foto
                    </label>
                    {newDriver.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setNewDriver(prev => ({ ...prev, avatarUrl: '' }))}
                        className="ml-2 text-xs font-bold text-rose-600 hover:text-rose-700 outline-none"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Nome Completo do Condutor *</label>
                <input
                  required
                  type="text"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="Ex: Pedro Henrique Assunção"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Número de Registro CNH *</label>
                <input
                  required
                  type="text"
                  maxLength={11}
                  value={newDriver.cnhNumber}
                  onChange={(e) => setNewDriver({ ...newDriver, cnhNumber: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="Apenas números (11 dígitos)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Categoria *</label>
                  <select
                    value={newDriver.cnhCategory}
                    onChange={(e) => setNewDriver({ ...newDriver, cnhCategory: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="E">Cat. E (Articulados)</option>
                    <option value="D">Cat. D (Pesados/Ônibus)</option>
                    <option value="C">Cat. C (Caminhões)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Validade CNH *</label>
                  <input
                    required
                    type="date"
                    value={newDriver.cnhExpiration}
                    onChange={(e) => setNewDriver({ ...newDriver, cnhExpiration: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Telefone Celular / WhatsApp</label>
                <input
                  type="tel"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="(11) 97777-6666"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Veículo Alocado</label>
                <select
                  value={newDriver.vehicleId}
                  onChange={(e) => setNewDriver({ ...newDriver, vehicleId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="">Nenhum Veículo Alocado</option>
                  {getAvailableVehicles(editingDriver?.currentVehicle?.id).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.type} ({v.vehicleNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer outline-none"
                >
                  <CheckCircle2 size={14} />
                  <span>{editingDriver ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DocumentVaultModal
        isOpen={vaultConfig.isOpen}
        onClose={() => setVaultConfig(prev => ({ ...prev, isOpen: false }))}
        entityType="driver"
        entityId={vaultConfig.entityId}
        entityName={vaultConfig.entityName}
      />
    </div>
  );
};

export default DriversList;
