import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Search, Plus, MapPin, Truck, Star, Phone, ShieldCheck, AlertTriangle, UserCheck, X, Award, CheckCircle2, Filter, FileCheck, Edit, Trash2 } from 'lucide-react';
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
  currentVehicle?: {
    id?: string;
    vehicleNumber: string;
    type: string;
  } | null;
}

// Conjunto inicial de motoristas de concreto/agregados com dados profissionais
const INITIAL_DRIVERS: Driver[] = [];

const DriversList = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  
  // Controle do modal interno de cadastro rápido
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    cnhNumber: '',
    cnhCategory: 'E' as const,
    cnhExpiration: '',
    vehicleId: '',
  });

  // Cofre de documentos ativo
  const [vaultConfig, setVaultConfig] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
  }>({ isOpen: false, entityId: '', entityName: '' });

  // Mantém estado local unificado para garantia de interface 100% funcional sem latência
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
      toast.success('Prontuário de condutor removido com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao remover prontuário do condutor.');
    }
  });

  const handleDeleteDriver = (id: string) => {
    if (confirm('Deseja realmente revogar o credenciamento e excluir este motorista do prontuário operacional?')) {
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
    });
    setIsModalOpen(true);
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
          toast.success('Alocação de veículo atualizada com sucesso.');
        },
        onError: (err: any) => {
          toast.error(`Erro ao alocar veículo: ${err.message || 'Erro desconhecido'}`);
        }
      }
    );
  };

  // Junta o remoto com o local evitando duplicações
  const baseDrivers = (remoteDrivers && remoteDrivers.length > 0)
    ? [...localDrivers.filter(ld => !remoteDrivers.some(rd => rd.id === ld.id)), ...remoteDrivers]
    : localDrivers;

  // Aplicação de filtros combinados com checagem segura
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

  // Validador visual de CNH vencida ou a vencer
  const checkCnhStatus = (expirationDate?: string) => {
    if (!expirationDate) return { label: 'Sem Registro', color: 'text-slate-400 bg-slate-50 border-slate-200' };
    const daysLeft = Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysLeft < 0) return { label: 'CNH Vencida', color: 'text-red-700 bg-red-50 border-red-200 animate-pulse' };
    if (daysLeft <= 45) return { label: `Atenção: Vence em ${daysLeft}d`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'CNH Regular', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
  };

  const handleOpenVault = (driver: Driver) => {
    setVaultConfig({
      isOpen: true,
      entityId: driver.id,
      entityName: driver.name || 'Condutor Credenciado',
    });
  };

  const handleSubmitDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.cnhNumber || !newDriver.cnhExpiration) {
      toast.error('Preencha os campos obrigatórios de qualificação do condutor.');
      return;
    }

    const payload = {
      name: newDriver.name,
      phone: newDriver.phone || '(11) 99999-0000',
      cnhNumber: newDriver.cnhNumber,
      cnhCategory: newDriver.cnhCategory,
      cnhExpiration: newDriver.cnhExpiration ? new Date(newDriver.cnhExpiration).toISOString() : null,
      vehicleId: newDriver.vehicleId || null,
    };

    if (editingDriver) {
      updateDriverMutation.mutate(
        { id: editingDriver.id, payload },
        {
          onSuccess: () => {
            toast.success(`Motorista ${newDriver.name} atualizado com sucesso no prontuário.`);
            setIsModalOpen(false);
            setEditingDriver(null);
            setNewDriver({ name: '', phone: '', cnhNumber: '', cnhCategory: 'E', cnhExpiration: '', vehicleId: '' });
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
            toast.success(`Condutor ${newDriver.name} averbado com sucesso no prontuário de frota.`);
            setIsModalOpen(false);
            setNewDriver({ name: '', phone: '', cnhNumber: '', cnhCategory: 'E', cnhExpiration: '', vehicleId: '' });
          },
          onError: () => {
            toast.error('Falha ao averbar condutor no backend.');
          },
        },
      );
    }
  };

  const handleUpdateStatus = (driverId: string, nextStatus: any) => {
    setLocalDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: nextStatus } : d));
    toast.success(`Status operacional alterado com sucesso.`);
  };

  return (
    <div className="space-y-8 font-sans pb-12 animate-in fade-in duration-300">
      
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-widest border border-indigo-100">
              Escala de Pessoal
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Motoristas Ativos
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quadro de Motoristas & Credenciais
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Monitoramento de CNH, categorias autorizadas, pontuação operacional e designação de ativos.
          </p>
        </div>

        {/* Botão de Averbação */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CNH ou placa..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 w-full sm:w-64 transition-all"
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer outline-none shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            <span>Averbar Motorista</span>
          </button>
        </div>
      </div>

      {/* Faixa de Filtros Avançados */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-white border border-slate-200 p-4 rounded-2xl">
        {/* Categoria CNH */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Award size={12} /> CNH:
          </span>
          {(['Todas', 'C', 'D', 'E'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none",
                categoryFilter === cat 
                  ? "bg-slate-900 text-white shadow-2xs" 
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              {cat === 'Todas' ? cat : `Cat. ${cat}`}
            </button>
          ))}
        </div>

        {/* Status Operacional */}
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-6 pt-2 sm:pt-0 w-full sm:w-auto">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Filter size={12} /> Escala:
          </span>
          {(['Todos', 'disponível', 'em_rota', 'em_descanso'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer outline-none",
                statusFilter === st 
                  ? "bg-indigo-600 text-white shadow-2xs" 
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs font-bold text-slate-400 hidden lg:block">
          Condutores visíveis: <span className="text-indigo-600">{filteredDrivers.length}</span>
        </div>
      </div>

      {/* Tabela de Motoristas */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Motorista</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status Operacional</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Habilitação (CNH)</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Contato</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Veículo Alocado</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Viagens</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                        <div className="space-y-1">
                          <div className="h-3.5 bg-slate-100 rounded w-28" />
                          <div className="h-2.5 bg-slate-50 rounded w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="p-5"><div className="h-5 bg-slate-50 rounded-md w-16" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-36" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-24" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-36" /></td>
                    <td className="p-5 text-center"><div className="h-5 bg-slate-50 rounded w-8 mx-auto" /></td>
                    <td className="p-5 text-right"><div className="h-8 bg-slate-100 rounded-lg w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => {
                  const cnhMeta = checkCnhStatus(driver.cnhExpiration);
                  const safeName = driver.name || 'Condutor Autorizado';
                  const initials = safeName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'MT';
                  const currentStatus = driver.status || 'disponível';
                  const safeCnhNumber = driver.cnhNumber || 'Não informada';
                  const formattedCnh = safeCnhNumber.length >= 10 
                    ? safeCnhNumber.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4')
                    : safeCnhNumber;

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-3.5">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                              {initials}
                            </div>
                            <span className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                              currentStatus === 'disponível' ? "bg-emerald-500" :
                              currentStatus === 'em_rota' ? "bg-indigo-500" : "bg-amber-500"
                            )} title={`Status: ${currentStatus}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs leading-tight truncate">
                              {safeName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[9px] text-slate-400 font-bold">
                                {driver.id}
                              </span>
                              <span className="text-slate-300 text-[10px]">•</span>
                              <span className="inline-flex items-center text-amber-500 text-[10px] font-bold">
                                <Star size={10} className="fill-current mr-0.5" />
                                {(driver.rating || 5.0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {(['disponível', 'em_rota', 'em_descanso'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(driver.id, st)}
                              className={cn(
                                "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer outline-none border",
                                currentStatus === st 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs" 
                                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
                              )}
                            >
                              {st === 'disponível' ? 'Livre' : st === 'em_rota' ? 'Rota' : 'Pausa'}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-[9px] rounded" title="Categoria da CNH">
                              {driver.cnhCategory || 'E'}
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-700">
                              {formattedCnh}
                            </span>
                          </div>
                          <span className={cn("px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider inline-block", cnhMeta.color)}>
                            {cnhMeta.label}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 whitespace-nowrap text-xs text-slate-600 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-indigo-500" />
                          {driver.phone || '(Sem contato)'}
                        </div>
                      </td>
                      <td className="p-5 max-w-xs">
                        <div className="flex items-center gap-1.5 w-full">
                          <Truck size={13} className={cn("shrink-0", driver.currentVehicle ? "text-indigo-500" : "text-slate-300")} />
                          <select
                            value={driver.currentVehicle?.id || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateVehicle(driver.id, val === '' ? null : val);
                            }}
                            disabled={updateDriverMutation.isPending}
                            className="w-full px-2 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer disabled:opacity-50"
                          >
                            <option value="">Nenhum Veículo</option>
                            {getAvailableVehicles(driver.currentVehicle?.id).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.type} ({v.vehicleNumber})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-5 text-center whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                          {driver.tripsCount || 0}
                        </span>
                      </td>
                      <td className="p-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenVault(driver)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer outline-none shrink-0"
                            title="Dossiê de CNH, ASO e Gerenciamento de Risco"
                          >
                            <FileCheck size={12} className="text-indigo-600" />
                            <span>Certidões</span>
                          </button>
                          <button
                            onClick={() => handleEditDriver(driver)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-600 rounded-lg hover:scale-105 transition-all outline-none"
                            title="Editar Motorista"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(driver.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg hover:scale-105 transition-all outline-none"
                            title="Excluir Motorista"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center bg-white">
                    <UserCheck className="mx-auto text-slate-300 mb-3" size={40} />
                    <p className="text-sm font-bold text-slate-900">Nenhum condutor qualificado atende aos critérios</p>
                    <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto mt-1">
                      Verifique os filtros selecionados ou cadastre um novo condutor com sua respectiva categoria de CNH.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
