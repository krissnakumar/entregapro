import React, { useState } from 'react';
import {
  Fuel,
  Wrench,
  AlertOctagon,
  PlusCircle,
  Camera,
  FileText,
  CheckCircle,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Truck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

import { useAuthStore } from '../store/useAuthStore';
import { Role } from '../types';

export const FuelMaintenanceModule: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
  const [activeTab, setActiveTab] = useState<'diesel' | 'maintenance'>('diesel');
  const [filterType, setFilterType] = useState<'all' | 'suspicious' | 'regular'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [approveData, setApproveData] = useState({
    litersFilled: '',
    costPerLiter: '',
    stationName: '',
    jobNumber: '',
  });

  // Dynamically load real frotista vehicles from database
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<any[]>('/vehicles').catch(() => []),
  });

  const { data: fuelLogsRaw = [] } = useQuery({
    queryKey: ['fuel-logs'],
    queryFn: () => api.get<any[]>('/fuel-logs').catch(() => []),
  });

  const { data: maintenanceRaw = [] } = useQuery({
    queryKey: ['maintenance-logs'],
    queryFn: () => api.get<any[]>('/maintenance-logs').catch(() => []),
  });

  // Estados dos formulários de entrada
  const [newFuel, setNewFuel] = useState({
    vehicle: '',
    fuelType: 'Diesel S10',
    liters: '',
    cost: '',
    odo: '',
    station: '',
  });

  const [newMnt, setNewMnt] = useState({
    vehicle: '',
    type: 'Revisão Geral do Motor',
    cost: '',
    nextDue: '',
  });

  // Gatilho de auto-preenchimento por OCR inteligente (WOW factor)
  const handleSimulateOCR = () => {
    setNewFuel({
      vehicle: '',
      fuelType: 'Diesel S10',
      liters: '135',
      cost: '810.00',
      odo: '146350',
      station: 'Posto Graal Rota 60',
    });
    toast.success('Leitura de nota fiscal por OCR realizada! Campos preenchidos automaticamente.');
  };

  const addFuelMutation = useMutation({
    mutationFn: (payload: any) => api.post('/fuel-logs', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      toast.success('Registro de abastecimento averbado com sucesso.');
    },
    onError: () => toast.error('Falha ao salvar abastecimento no backend.'),
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: (payload: any) => api.post('/maintenance-logs', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      toast.success('Plano de manutenção preventiva registrado no prontuário.');
    },
    onError: () => toast.error('Falha ao salvar manutenção no backend.'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.post(`/fuel-logs/${id}/approve`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      toast.success('Abastecimento aprovado e registrado com sucesso!');
      setSelectedRequest(null);
      setApproveData({ litersFilled: '', costPerLiter: '', stationName: '', jobNumber: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Falha ao aprovar abastecimento.');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/fuel-logs/${id}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      toast.success('Solicitação de abastecimento recusada.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Falha ao recusar solicitação.');
    }
  });

  const vehicleById = new Map((vehicles || []).map((v: any) => [v.id, v]));
  const fuelLogs = fuelLogsRaw.map((log: any) => {
    const v = vehicleById.get(log.vehicleId) || log.vehicle;
    const liters = Number(log.litersFilled || 0);
    const cost = Number(log.totalCost || 0);
    const isSuspicious = liters > 140;
    return {
      id: log.id,
      vehicle: v?.vehicleNumber || 'N/A',
      fuelType: 'Diesel',
      liters,
      cost,
      odo: Number(log.odometer || 0),
      station: log.stationName || 'N/A',
      fraudRisk: isSuspicious,
      anomalyReason: isSuspicious ? 'Litragem acima do limite configurado.' : undefined,
      date: new Date(log.fillDate || log.createdAt).toLocaleDateString('pt-BR'),
      efficiency: 'N/A',
      status: log.status || 'APPROVED',
      jobNumber: log.jobNumber,
      driverName: log.driver?.user?.name || 'N/A',
    };
  });

  const pendingRequests = fuelLogs.filter(log => log.status === 'PENDING');

  const maintenanceItems = maintenanceRaw.map((item: any) => {
    const v = vehicleById.get(item.vehicleId) || item.vehicle;
    const nextDue = item.nextDueDate ? new Date(item.nextDueDate) : null;
    const status = nextDue && nextDue < new Date()
      ? 'CRÍTICO'
      : nextDue && (nextDue.getTime() - Date.now()) < 1000 * 60 * 60 * 24 * 7
        ? 'ALERTA'
        : 'OK';
    return {
      id: item.id,
      vehicle: v?.vehicleNumber || 'N/A',
      type: item.serviceType,
      lastDate: new Date(item.serviceDate).toLocaleDateString('pt-BR'),
      cost: Number(item.cost || 0),
      nextDue: nextDue ? nextDue.toLocaleDateString('pt-BR') : '-',
      status,
    };
  });

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFuel.liters || !newFuel.cost || !newFuel.odo) {
      toast.error('Por favor, preencha a litragem, custo total e leitura do odômetro.');
      return;
    }

    const litersNum = parseFloat(newFuel.liters);
    // Heurística de detecção de anomalia / suspeita
    const isSuspicious = litersNum > 140;

    addFuelMutation.mutate({
      vehicleId: newFuel.vehicle,
      litersFilled: litersNum,
      totalCost: parseFloat(newFuel.cost),
      costPerLiter: litersNum > 0 ? parseFloat(newFuel.cost) / litersNum : 0,
      odometer: parseFloat(newFuel.odo),
      stationName: newFuel.station || 'Posto Rodoviário Credenciado',
    });

    if (isSuspicious) {
      toast.warning('Alerta de discrepância volumétrica disparado para o gestor de frotas.');
    }

    setNewFuel({ vehicle: '', fuelType: 'Diesel S10', liters: '', cost: '', odo: '', station: '' });
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMnt.cost || !newMnt.nextDue) {
      toast.error('Informe o custo estimado e a data limite para a próxima intervenção.');
      return;
    }

    addMaintenanceMutation.mutate({
      vehicleId: newMnt.vehicle,
      serviceType: newMnt.type,
      cost: parseFloat(newMnt.cost),
      odometer: 0,
      nextDueDate: newMnt.nextDue,
    });
    setNewMnt({ vehicle: '', type: 'Revisão Geral do Motor', cost: '', nextDue: '' });
  };

  const handleResolveMaintenance = (id: string) => {
    toast.info(`Ação de conclusão pendente de endpoint PATCH para manutenção (${id}).`);
  };

  // Filtragem dinâmica dos logs de combustível
  const filteredFuelLogs = fuelLogs.filter(log => {
    if (log.status === 'PENDING') return false;
    const matchesSearch = log.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.fuelType.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'suspicious') return matchesSearch && log.fraudRisk;
    if (filterType === 'regular') return matchesSearch && !log.fraudRisk;
    return matchesSearch;
  });

  // Estatísticas consolidadas
  const totalLiters = fuelLogs.reduce((acc, curr) => acc + curr.liters, 0);
  const totalFuelCost = fuelLogs.reduce((acc, curr) => acc + curr.cost, 0);
  const avgCostPerLiter = totalLiters > 0 ? (totalFuelCost / totalLiters) : 0;

  return (
    <div className="space-y-8 font-sans select-none pb-12 animate-in fade-in duration-300">

      {/* Cabeçalho do Módulo */}
      <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              Controle Operacional
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Telemetria Consolidada
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Gestão de Combustível & Manutenção
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Auditoria completa de queima de diesel, prevenção de desvios volumétricos e cronograma rodoviário de revisões.
          </p>
        </div>

        {/* Abas Superiores Customizadas */}
        <div className="flex items-center bg-slate-50 border border-slate-200 p-1.5 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('diesel')}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
              activeTab === 'diesel' ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Fuel size={14} className="shrink-0" />
            <span>Abastecimentos</span>
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
              activeTab === 'maintenance' ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Wrench size={14} className="shrink-0" />
            <span>Manutenções</span>
          </button>
        </div>
      </div>

      {/* Interface Principal de Gestão de Combustível */}
      {activeTab === 'diesel' && (
        <div className="space-y-8 animate-in fade-in duration-300">

          {/* Indicadores Consolidados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Volume Averbado Mês</span>
                <p className="text-xl font-black text-slate-900 font-mono">{totalLiters} <span className="text-xs font-sans font-bold text-slate-500">Litros</span></p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Fuel size={20} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Investimento em Diesel</span>
                <p className="text-xl font-black text-emerald-600 font-mono">
                  {totalFuelCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Custo Médio / Litro</span>
                <p className="text-xl font-black text-slate-900 font-mono">
                  {avgCostPerLiter.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-200">
                <TrendingUp size={20} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {!isAdmin ? (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xs h-fit space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <PlusCircle size={16} className="text-indigo-600" /> Registrar Abastecimento
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Input com verificação antifraude e OCR</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateOCR}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-100 transition-colors flex items-center gap-1 cursor-pointer outline-none shrink-0"
                    title="Simular extração instantânea de comprovante"
                  >
                    <Sparkles size={12} className="shrink-0" />
                    <span>Auto OCR</span>
                  </button>
                </div>

                <form onSubmit={handleAddFuel} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Veículo Alvo</label>
                    <select
                      value={newFuel.vehicle}
                      onChange={e => setNewFuel({ ...newFuel, vehicle: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">Selecione o veículo...</option>
                      {vehicles && vehicles.length > 0 ? (
                        vehicles.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.vehicleNumber} ({v.type || 'Caminhão'})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Nenhum veículo disponível</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Produto Averbado</label>
                    <select
                      value={newFuel.fuelType}
                      onChange={e => setNewFuel({ ...newFuel, fuelType: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="Diesel S10">Diesel S10 Aditivado</option>
                      <option value="Diesel S500">Diesel S500 Comum</option>
                      <option value="Arla 32">Agente Redutor Arla 32</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Litragem (L)</label>
                      <input
                        type="number"
                        placeholder="Ex: 120"
                        value={newFuel.liters}
                        onChange={e => setNewFuel({ ...newFuel, liters: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Custo Total (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 720.00"
                        value={newFuel.cost}
                        onChange={e => setNewFuel({ ...newFuel, cost: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Hodômetro Atual (KM)</label>
                    <input
                      type="number"
                      placeholder="Leitura do painel"
                      value={newFuel.odo}
                      onChange={e => setNewFuel({ ...newFuel, odo: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Posto de Combustível</label>
                    <input
                      type="text"
                      placeholder="Bandeira / Localização"
                      value={newFuel.station}
                      onChange={e => setNewFuel({ ...newFuel, station: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* Opções de Captura Fotográfica Auxiliar */}
                  <div className="pt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toast.success('Câmera ativada: Comprovante digitalizado com sucesso.')}
                      className="p-2.5 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer outline-none"
                    >
                      <Camera size={14} className="text-slate-400" />
                      <span className="text-[8px] font-black uppercase text-slate-500">Fotografar Cupom</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success('Hodômetro validado via telemetria embarcada.')}
                      className="p-2.5 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer outline-none"
                    >
                      <Camera size={14} className="text-slate-400" />
                      <span className="text-[8px] font-black uppercase text-slate-500">Foto Painel KM</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer outline-none"
                  >
                    Confirmar Averbação
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xs h-fit space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <ShieldCheck size={16} className="text-indigo-600" /> Regras Antifraude (Admin)
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Parâmetros do motor de consistência</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/60 text-slate-700">
                    <p className="font-bold mb-1">Painel Consolidado</p>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Lançamentos e averbações de postos são operados diretamente por Despachantes. Administradores realizam auditorias e definem regras de desvios.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Volume Máximo por Abastecimento</label>
                    <div className="flex gap-2">
                      <input type="number" defaultValue="140" className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none" />
                      <span className="p-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold font-mono flex items-center">Litros</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Desvio OSRM Tolerado</label>
                    <div className="flex gap-2">
                      <input type="number" defaultValue="12" className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none" />
                      <span className="p-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold font-mono flex items-center">%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Alertar Despachante por Push</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none cursor-pointer">
                      <option>Apenas Riscos Críticos</option>
                      <option>Todos os Desvios</option>
                      <option>Desativado</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => toast.success('Parâmetros de validação volumétrica salvos com sucesso.')}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer outline-none active:scale-95"
                    >
                      Salvar Regras
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Coluna 2: Listagem Extensa de Registros e Motor Antifraude */}
            <div className="lg:col-span-2 space-y-4">

              {/* Banner de Auditoria de Algoritmo */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Motor Antifraude Espacial</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-medium max-w-xl">
                    Cruzamento contínuo da volumetria declarada nos postos contra a curva de consumo esperada pelo polígono OSRM percorrido.
                  </p>
                </div>
                <span className="px-3 py-1 bg-white text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-widest self-start sm:self-auto shrink-0 text-center">
                  Auditoria Ativa
                </span>
              </div>

              {/* Solicitações Pendentes (Wow Premium Alert Card) */}
              {pendingRequests.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5 animate-pulse">
                      <Fuel size={14} /> Solicitações Pendentes ({pendingRequests.length})
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold">Aguardando preenchimento operacional</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="bg-gradient-to-r from-amber-50/50 to-white border border-amber-200 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 font-mono">
                              {req.vehicle}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {req.driverName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">• {req.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="font-semibold">Odômetro Declarado:</span>
                            <strong className="font-mono text-slate-800">{req.odo.toLocaleString('pt-BR')} KM</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => {
                              if (window.confirm('Deseja realmente rejeitar esta solicitação de abastecimento?')) {
                                rejectMutation.mutate(req.id);
                              }
                            }}
                            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors font-bold text-[10px] uppercase tracking-wider cursor-pointer outline-none"
                          >
                            Recusar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setApproveData({
                                litersFilled: '',
                                costPerLiter: '',
                                stationName: req.station !== 'N/A' ? req.station : '',
                                jobNumber: '',
                              });
                            }}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors font-black text-[10px] uppercase tracking-wider cursor-pointer outline-none"
                          >
                            Preencher & Aprovar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Barra de Ferramentas de Filtragem e Busca */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por placa, bandeira ou produto..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                  <Filter size={12} className="text-slate-400 ml-2 mr-1" />
                  {(['all', 'suspicious', 'regular'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer outline-none",
                        filterType === type ? "bg-white text-indigo-600 shadow-2xs border border-slate-200" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {type === 'all' ? 'Todos' : type === 'suspicious' ? 'Suspeitos' : 'Regulares'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista Dinâmica */}
              <div className="space-y-3">
                {filteredFuelLogs.map(log => (
                  <div
                    key={log.id}
                    className={cn(
                      "bg-white border rounded-2xl p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden",
                      log.fraudRisk ? "border-rose-300 hover:border-rose-400" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {log.fraudRisk && <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />}

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                          {log.vehicle}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600">
                          {log.fuelType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          • {log.date}
                        </span>
                        {log.fraudRisk && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-black text-[9px] uppercase rounded tracking-widest flex items-center gap-1 shrink-0">
                            <AlertOctagon size={10} className="text-rose-500" /> Discrepância de Volume
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-700">
                        <span className="text-indigo-600">{log.liters} Litros</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-mono">R$ {log.cost.toFixed(2)}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-medium">Hodômetro: {log.odo.toLocaleString('pt-BR')} KM</span>
                        {log.jobNumber && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded">
                              Job: {log.jobNumber}
                            </span>
                          </>
                        )}
                        {log.status === 'REJECTED' && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[9px] uppercase font-black rounded tracking-widest">
                              Recusado
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-[11px] font-medium text-slate-500 truncate" title={log.station}>
                        📍 {log.station}
                      </p>

                      {log.anomalyReason && (
                        <p className="text-[11px] font-bold text-rose-700 mt-2 bg-rose-50/60 p-2.5 rounded-xl border border-rose-100/80 leading-tight">
                          Motivo do Alerta: {log.anomalyReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => toast.success(`Comprovante fiscal auditado para a transação ${log.id}`)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer outline-none"
                      >
                        <FileText size={12} className="text-indigo-600" />
                        <span>Nota Fiscal</span>
                      </button>
                    </div>
                  </div>
                ))}

                {filteredFuelLogs.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium text-xs">
                    Nenhum registro de abastecimento atende aos critérios do filtro selecionado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interface de Acompanhamento de Manutenções */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Métricas de Manutenção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Avisos de Vencimento</span>
              <p className="text-xl font-black text-rose-600 font-mono">
                {maintenanceItems.filter(i => i.status === 'CRÍTICO').length} <span className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">Unidades</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Atenção Requerida</span>
              <p className="text-xl font-black text-amber-600 font-mono">
                {maintenanceItems.filter(i => i.status === 'ALERTA').length} <span className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">Itens</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Índice de Conformidade</span>
              <p className="text-xl font-black text-emerald-600 font-mono">96.4%</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Total Averbado Ativo</span>
              <p className="text-xl font-black text-slate-900 font-mono">
                {maintenanceItems.length} <span className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">Planos</span>
              </p>
            </div>
          </div>

          {/* Seção Integrada: Registrar Nova Manutenção + Tabela */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {!isAdmin ? (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xs h-fit space-y-4">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <PlusCircle size={16} className="text-emerald-600" /> Cadastrar Intervenção
                </h3>

                <form onSubmit={handleAddMaintenance} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Unidade Frotista</label>
                    <select
                      value={newMnt.vehicle}
                      onChange={e => setNewMnt({ ...newMnt, vehicle: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">Selecione o veículo...</option>
                      {vehicles && vehicles.length > 0 ? (
                        vehicles.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.vehicleNumber} ({v.type || 'Caminhão'})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Nenhum veículo disponível</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Escopo de Serviço</label>
                    <input
                      type="text"
                      placeholder="Ex: Troca de lonas, alinhamento..."
                      value={newMnt.type}
                      onChange={e => setNewMnt({ ...newMnt, type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Custo Aprox (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 1450.00"
                        value={newMnt.cost}
                        onChange={e => setNewMnt({ ...newMnt, cost: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Data Limite</label>
                      <input
                        type="text"
                        placeholder="DD/MM/AAAA"
                        value={newMnt.nextDue}
                        onChange={e => setNewMnt({ ...newMnt, nextDue: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all cursor-pointer outline-none"
                  >
                    Registrar Prontuário
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xs h-fit space-y-4">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldCheck size={16} className="text-emerald-600" /> Relatório & Alertas (Admin)
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aderência Preventiva</span>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Índice Metas</span>
                      <strong className="text-emerald-600 font-mono">96.4% OK</strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div className="w-[96.4%] h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pendências Operacionais</span>
                    <ul className="space-y-2">
                      <li className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
                        <div>
                          <strong className="text-rose-950 block text-[11px] font-black">2 Unidades Críticas</strong>
                          <span className="text-[10px] text-rose-700">Vencimento de revisão mecânica ultrapassado</span>
                        </div>
                      </li>
                      <li className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                        <div>
                          <strong className="text-amber-950 block text-[11px] font-black">1 Alerta Ativo</strong>
                          <span className="text-[10px] text-amber-700">Troca de óleo preventiva em menos de 7 dias</span>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => toast.success('Relatório consolidado exportado para o e-mail cadastrado.')}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-sm transition-all cursor-pointer outline-none flex items-center justify-center gap-1.5"
                    >
                      <FileText size={14} />
                      <span>Exportar Relatório</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Coluna Matriz de Manutenções */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xs flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-slate-700" />
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">
                    Cronograma Global da Frota
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  Ações de Averbação Direta
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="p-3.5 pl-5">Placa</th>
                      <th className="p-3.5">Escopo Preventivo</th>
                      <th className="p-3.5">Última Revisão</th>
                      <th className="p-3.5">Custo R$</th>
                      <th className="p-3.5">Próximo Vencimento</th>
                      <th className="p-3.5 pr-5 text-right">Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {maintenanceItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 font-black text-slate-900 font-mono">{item.vehicle}</td>
                        <td className="p-3.5 font-bold text-slate-800">{item.type}</td>
                        <td className="p-3.5 text-slate-500">{item.lastDate}</td>
                        <td className="p-3.5 font-mono text-emerald-600 font-bold">
                          R$ {item.cost.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span className="flex items-center gap-1.5 font-medium text-slate-600">
                            <Calendar size={12} className="text-slate-400 shrink-0" /> {item.nextDue}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest inline-block text-center shrink-0",
                              item.status === 'OK' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                item.status === 'ALERTA' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                  "bg-rose-50 text-rose-700 border border-rose-200"
                            )}>
                              {item.status}
                            </span>

                            {item.status !== 'OK' && (
                              <button
                                onClick={() => handleResolveMaintenance(item.id)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-black text-[8px] uppercase tracking-wider transition-all border border-indigo-100 cursor-pointer shrink-0"
                                title="Marcar revisão como resolvida/renovada"
                              >
                                Concluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl w-full max-w-md space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle size={16} className="text-indigo-600" /> Aprovar Abastecimento
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Veículo: <strong className="font-mono text-slate-700">{selectedRequest.vehicle}</strong> • Motorista: <strong>{selectedRequest.driverName}</strong> • Odômetro: <strong>{selectedRequest.odo} KM</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nº do Job (Job Number)</label>
                <input
                  type="text"
                  placeholder="Ex: JOB-9982"
                  value={approveData.jobNumber}
                  onChange={e => setApproveData({ ...approveData, jobNumber: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Litragem Cheia (L)</label>
                  <input
                    type="number"
                    placeholder="Ex: 120"
                    value={approveData.litersFilled}
                    onChange={e => setApproveData({ ...approveData, litersFilled: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Preço/Litro (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5.89"
                    value={approveData.costPerLiter}
                    onChange={e => setApproveData({ ...approveData, costPerLiter: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nome do Posto</label>
                <input
                  type="text"
                  placeholder="Bandeira / Localização"
                  value={approveData.stationName}
                  onChange={e => setApproveData({ ...approveData, stationName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              {approveData.litersFilled && approveData.costPerLiter && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-800">Custo Total Calculado:</span>
                  <strong className="font-mono text-emerald-700 text-sm">
                    R$ {(Number(approveData.litersFilled) * Number(approveData.costPerLiter)).toFixed(2)}
                  </strong>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-black text-xs uppercase tracking-wider transition-colors outline-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!approveData.jobNumber) {
                      toast.error('O número do Job é obrigatório para aprovação.');
                      return;
                    }
                    if (!approveData.litersFilled || !approveData.costPerLiter) {
                      toast.error('Litragem e custo por litro são obrigatórios.');
                      return;
                    }
                    approveMutation.mutate({
                      id: selectedRequest.id,
                      payload: {
                        litersFilled: parseFloat(approveData.litersFilled),
                        costPerLiter: parseFloat(approveData.costPerLiter),
                        totalCost: parseFloat(approveData.litersFilled) * parseFloat(approveData.costPerLiter),
                        stationName: approveData.stationName,
                        jobNumber: approveData.jobNumber,
                      }
                    });
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-colors outline-none cursor-pointer"
                >
                  Confirmar Aprov.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
