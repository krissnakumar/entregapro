import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  Wrench, Settings, AlertTriangle, TrendingUp, CheckCircle2, 
  Clock, Sliders, ShieldAlert, Search, FileText, Sparkles, 
  Plus, Check, X, Activity, Eye, Compass
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  serviceType: string;
  cost: number;
  odometer: number;
  serviceDate: string;
  nextDueDate: string;
  status?: string;
  downtimeHours?: number;
  replacedParts?: string[];
  notes?: string;
}

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'preventive' | 'tires' | 'approval' | 'history'>('preventive');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

  // Fetch Vehicles
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['vehicles-list'],
    queryFn: () => api.get<any[]>('/vehicles').catch(() => []),
  });

  // Fetch Maintenance Logs
  const { data: maintenanceRaw = [], refetch } = useQuery<any[]>({
    queryKey: ['maintenance-logs'],
    queryFn: () => api.get<any[]>('/maintenance-logs').catch(() => []),
  });

  // Mocked Approval Queue (Dispatcher request submissions)
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([
    {
      id: 'OS-8092',
      vehicle: 'PRO-1002',
      vehicleId: vehicles[0]?.id || '',
      serviceType: 'Inspeção Anual de Tacógrafo',
      requestDate: '30/05/2026',
      downtimeHours: 4,
      priority: 'MÉDIA',
      dispatcher: 'Carlos Lima (Despacho Sul)'
    },
    {
      id: 'OS-8093',
      vehicle: 'PRO-1004',
      vehicleId: vehicles[1]?.id || '',
      serviceType: 'Troca de Discos de Freio Dianteiro',
      requestDate: '01/06/2026',
      downtimeHours: 8,
      priority: 'ALTA',
      dispatcher: 'Mário Silva (Despacho Central)'
    }
  ]);

  // Mocked Tire Rotation & Calibration Status
  const tireStatus = useMemo(() => {
    return [
      { id: '1', vehicle: 'PRO-1001', configuration: '4x2 (6 Rodas)', status: 'OK', avgSulco: '5.2mm', nextRotation: 'Em 4.500 km' },
      { id: '2', vehicle: 'PRO-1002', configuration: '6x2 (10 Rodas)', status: 'ALERTA', avgSulco: '2.4mm', nextRotation: 'Imediato (Sulco Crítico Eixo Traseiro)' },
      { id: '3', vehicle: 'PRO-1003', configuration: '8x2 (12 Rodas)', status: 'OK', avgSulco: '6.0mm', nextRotation: 'Em 12.000 km' },
      { id: '4', vehicle: 'PRO-1004', configuration: '6x4 (10 Rodas Betoneira)', status: 'CRÍTICO', avgSulco: '1.8mm', nextRotation: 'Necessita Substituição Eixo 2 esquerdo' },
    ];
  }, []);

  // Map Maintenance Log items to list models
  const maintenanceItems = useMemo(() => {
    const vehicleById = new Map((vehicles || []).map((v: any) => [v.id, v]));
    return maintenanceRaw.map((item: any) => {
      const v = vehicleById.get(item.vehicleId) || item.vehicle;
      const nextDue = item.nextDueDate ? new Date(item.nextDueDate) : null;
      
      const status = nextDue && nextDue < new Date()
        ? 'CRÍTICO'
        : nextDue && (nextDue.getTime() - Date.now()) < 1000 * 60 * 60 * 24 * 7
          ? 'ALERTA'
          : 'OK';
          
      // Operational metrics
      const downtimeHours = item.downtimeHours || Math.floor(Math.random() * 12) + 2;
      const replacedParts = item.replacedParts || ['Filtros', 'Fluidos'];
      
      return {
        id: item.id,
        vehicle: v?.vehicleNumber || 'PRO-100' + (Math.floor(Math.random() * 5) + 1),
        vehicleId: item.vehicleId,
        type: item.serviceType,
        serviceDate: new Date(item.serviceDate || item.createdAt).toLocaleDateString('pt-BR'),
        nextDue: nextDue ? nextDue.toLocaleDateString('pt-BR') : '-',
        status,
        downtimeHours,
        replacedParts,
      };
    });
  }, [maintenanceRaw, vehicles]);

  // Handle approving a dispatcher maintenance request
  const approveMutation = useMutation({
    mutationFn: (payload: any) => api.post('/maintenance-logs', payload),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      toast.success('Ordem de serviço aprovada e incluída no prontuário global.');
    },
    onError: () => toast.error('Erro ao aprovar ordem de serviço.'),
  });

  const handleApprove = (id: string) => {
    const request = pendingApprovals.find(p => p.id === id);
    if (!request) return;

    approveMutation.mutate({
      vehicleId: request.vehicleId || vehicles[0]?.id || 'mock-id',
      serviceType: request.serviceType,
      cost: 0, // Logistics focus
      odometer: 120000,
      serviceDate: new Date().toISOString(),
      nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days from now
    });

    setPendingApprovals(pendingApprovals.filter(p => p.id !== id));
  };

  const handleReject = (id: string) => {
    setPendingApprovals(pendingApprovals.filter(p => p.id !== id));
    toast.error('Ordem de serviço cancelada/devolvida ao despachante.');
  };

  // Milestones (Odometer Check preventive planning)
  const preventiveMilestones = useMemo(() => {
    return [
      { vehicle: 'PRO-1001', service: 'Troca de Óleo Motor & Filtro', currentOdo: '84.230 KM', targetOdo: '90.000 KM', progress: 85, daysRemaining: 15 },
      { vehicle: 'PRO-1002', service: 'Revisão Hidráulica de Betoneira', currentOdo: '128.450 KM', targetOdo: '130.000 KM', progress: 92, daysRemaining: 6 },
      { vehicle: 'PRO-1003', service: 'Calibração dos Eixos & Suspensão', currentOdo: '54.100 KM', targetOdo: '60.000 KM', progress: 65, daysRemaining: 34 },
      { vehicle: 'PRO-1004', service: 'Alinhamento Direcional das Rodas', currentOdo: '143.900 KM', targetOdo: '145.000 KM', progress: 95, daysRemaining: 3 },
    ];
  }, []);

  return (
    <div className="space-y-8 font-sans pb-16 animate-in fade-in duration-300 select-none">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={16} className="text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Controle de Ativos e Disponibilidade</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Central de Manutenção Preventiva</h1>
            <p className="text-slate-400 font-medium text-xs mt-1 max-w-xl">
              Monitore a inatividade de frota, configure cronogramas de calibração, aprove requisições de despachantes e gerencie o ciclo preventivo de rodagem.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-4 border-r border-white/10">
              <p className="text-2xl font-black text-emerald-400 font-mono">92.8%</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Disponibilidade</p>
            </div>
            <div className="text-center px-4 border-r border-white/10">
              <p className="text-2xl font-black text-rose-400 font-mono">{pendingApprovals.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pendentes OS</p>
            </div>
            <div className="text-center px-4">
              <p className="text-2xl font-black text-indigo-400 font-mono">
                {maintenanceItems.reduce((acc, curr) => acc + (curr.downtimeHours || 0), 0)}h
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Inatividade total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-4">
        <div className="flex items-center bg-slate-100 border border-slate-200/60 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('preventive')}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
              activeTab === 'preventive' ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Compass size={14} />
            <span>Cronograma Preventivo</span>
          </button>
          <button
            onClick={() => setActiveTab('tires')}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
              activeTab === 'tires' ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Activity size={14} />
            <span>Gestão de Rodagem (Pneus)</span>
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer relative outline-none",
              activeTab === 'approval' ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Sliders size={14} />
            <span>Aprovações OS</span>
            {pendingApprovals.length > 0 && (
              <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[8px] font-black leading-none animate-bounce">
                {pendingApprovals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
              activeTab === 'history' ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/60" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <FileText size={14} />
            <span>Histórico da Oficina</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'history' && (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar veículo..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 w-48"
                />
              </div>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">Todos Veículos</option>
                {vehicles.map((v: any) => (
                  <option key={v.id} value={v.vehicleNumber}>{v.vehicleNumber}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      
      {/* 1. Cronograma Preventivo */}
      {activeTab === 'preventive' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card de Informações e Métricas */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-2xs space-y-4">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
                <Sliders size={16} className="text-indigo-600" /> Parâmetros Preventivos de Inspeção
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Calibração de Betoneiras</span>
                  <span className="font-mono text-slate-500 font-black">A cada 15.000 KM</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Substituição Lubrificante Motor</span>
                  <span className="font-mono text-slate-500 font-black">A cada 10.000 KM</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Inspeção de Suspensão Pesada</span>
                  <span className="font-mono text-slate-500 font-black">A cada 40.000 KM</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Substituição de Lonas de Freio</span>
                  <span className="font-mono text-slate-500 font-black">A cada 25.000 KM</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-2xl text-[11px] font-medium leading-relaxed">
                📢 <strong>Aviso Operacional:</strong> Veículos com milhas excedentes de 95% do limite preventivo geram alertas automatizados em tempo real no console de despacho.
              </div>
            </div>

            {/* Alertas Críticos de Próxima Parada */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-2xs space-y-4">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
                <AlertTriangle size={16} className="text-amber-500" /> Próximas Intervenções Programadas
              </h3>

              <div className="space-y-3">
                {preventiveMilestones.map((m, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-black font-mono">
                          {m.vehicle}
                        </span>
                        <strong className="text-slate-800 font-bold">{m.service}</strong>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border",
                        m.progress > 90 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {m.daysRemaining} dias restantes
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold font-mono">
                        <span>Odo: {m.currentOdo}</span>
                        <span>Alvo: {m.targetOdo}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            m.progress > 90 ? "bg-rose-500" : "bg-amber-500"
                          )} 
                          style={{ width: `${m.progress}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Gestão de Rodagem (Pneus) */}
      {activeTab === 'tires' && (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">
                Auditoria de Sulcos e Desgaste (Pneus)
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">Controle de eixos rodantes e rodízios preventivos para evitar inatividade</p>
            </div>
            <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md text-[9px] font-black uppercase tracking-widest">
              Garantia de SLA
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuração Eixos</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sulco Médio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Próxima Ação Rodízio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tireStatus.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black font-mono text-slate-900">{t.vehicle}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{t.configuration}</td>
                    <td className="px-6 py-4 font-mono font-bold">{t.avgSulco}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{t.nextRotation}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                        t.status === 'OK' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        t.status === 'ALERTA' ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toast.success(`Ordem de calibração/rodízio gerada para o veículo ${t.vehicle}`)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg text-[9px] text-indigo-700 font-black uppercase tracking-wider transition-all cursor-pointer outline-none"
                      >
                        Agendar Calibração
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Fila de Aprovações OS */}
      {activeTab === 'approval' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">
                Ordens de Serviço Pendentes de Autorização
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Autorize entradas na oficina enviadas pelos despachantes de garagem.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingApprovals.map(req => (
                <div key={req.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-md font-mono font-black text-[10px]">
                        {req.priority}
                      </span>
                      <strong className="text-slate-900 font-black text-xs">{req.serviceType}</strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                      <span>Veículo: <strong className="font-bold text-slate-700 font-mono">{req.vehicle}</strong></span>
                      <span>Downtime Previsto: <strong className="font-bold text-slate-700">{req.downtimeHours} horas</strong></span>
                      <span>Despachante: <strong className="font-bold text-slate-700">{req.dispatcher}</strong></span>
                      <span>Enviado: <strong className="font-bold text-slate-700 font-mono">{req.requestDate}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <X size={14} />
                      <span>Rejeitar</span>
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>Autorizar OS</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingApprovals.length === 0 && (
                <div className="text-center py-16 text-slate-400 font-medium text-xs">
                  🎉 Nenhuma ordem de serviço aguardando aprovação administrativa.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Histórico da Oficina */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xs flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">
                Histórico Completo de Intervenções Preventivas & Corretivas
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-bold">Logística Consolidada</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">OS ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Veículo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviço Realizado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inatividade (Downtime)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peças Trocadas</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Conclusão</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Próxima Revisão</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {maintenanceItems
                  .filter(item => {
                    const matchesSearch = item.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesVehicle = selectedVehicleId === 'all' || item.vehicle === selectedVehicleId;
                    return matchesSearch && matchesVehicle;
                  })
                  .map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">#{log.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 font-black font-mono text-slate-900">{log.vehicle}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{log.type}</td>
                      <td className="px-6 py-4 font-mono text-rose-600 font-bold">{log.downtimeHours} horas</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {log.replacedParts?.map((part, pIdx) => (
                            <span key={pIdx} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[9px] font-semibold text-slate-600">
                              {part}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-500">{log.serviceDate}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-500">{log.nextDue}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                          log.status === 'OK' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          log.status === 'ALERTA' ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-rose-50 text-rose-700 border-rose-100"
                        )}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                {maintenanceItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 font-medium text-xs">
                      Nenhum registro de oficina encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
