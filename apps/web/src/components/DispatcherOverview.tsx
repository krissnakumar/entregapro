import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  ClipboardList, 
  Truck, 
  Users, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  UserCheck,
  PackageCheck,
  GitMerge,
  Split,
  MapPin,
  PhoneCall,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { OrderStatus } from '@entregapro/shared-types';
import { toast } from 'sonner';

const DispatcherOverview = () => {
  const { data: orders } = useQuery({
    queryKey: ['active-dispatch'],
    queryFn: () => api.get<any[]>('/dispatch'),
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers-performance'],
    queryFn: () => api.get<any[]>('/reports/drivers'),
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-status'],
    queryFn: () => api.get<any[]>('/reports/vehicles'),
  });

  const [isFrozen, setIsFrozen] = useState(false);
  const [activeSimulationAction, setActiveSimulationAction] = useState<string | null>(null);

  const rawDeliveries = orders?.flatMap(o => o.deliveries) || [];
  const deliveries = rawDeliveries;
  
  const stats = [
    { 
      title: 'Atribuição Pendente', 
      value: deliveries.filter(d => d.status === OrderStatus.PENDING).length, 
      icon: ClipboardList, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50' 
    },
    { 
      title: 'Carregamento nas Docas', 
      value: deliveries.filter(d => d.status === OrderStatus.LOADING).length, 
      icon: PackageCheck, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      title: 'SLA em Atraso', 
      value: deliveries.filter(d => d.status !== OrderStatus.DELIVERED && d.status !== OrderStatus.CANCELLED && new Date(d.scheduledTime) < new Date()).length, 
      icon: AlertTriangle, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50' 
    },
    { 
      title: 'Motoristas Disponíveis', 
      value: drivers?.filter(d => d.availabilityStatus !== false).length || 0, 
      icon: UserCheck, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      title: 'Frota de Reserva', 
      value: vehicles?.filter(v => v.activeStatus !== false).length || 0, 
      icon: Truck, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
  ];

  const handleActionTrigger = (actionName: string, successMessage: string) => {
    setActiveSimulationAction(actionName);
    setTimeout(() => {
      setActiveSimulationAction(null);
      toast.success(`Ação Concluída: ${actionName}`, {
        description: successMessage,
      });
    }, 400);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Pilha Dinâmica de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-default relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={stat.color} size={20} />
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.title}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            <div className="absolute bottom-0 right-0 left-0 h-1 bg-slate-50 group-hover:bg-primary/10 transition-colors" />
          </div>
        ))}
      </div>

      {/* Faixa de Intervenção de Múltiplos Fatores do Despachante */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
              Matriz de Controle Operacional
            </span>
            <h3 className="text-base font-black tracking-tight mt-1">Intervenções e Substituições ao Vivo</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsFrozen(!isFrozen);
                toast(isFrozen ? "Sistema destravado. Filas de despacho operando normalmente." : "CRÍTICO: Bloqueio global de entregas ativado na frota.", {
                  style: { backgroundColor: isFrozen ? '#10B981' : '#EF4444', color: '#fff' }
                });
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                isFrozen ? "bg-rose-500 text-white animate-pulse" : "bg-white/10 hover:bg-white/20 text-slate-300"
              )}
            >
              {isFrozen ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              {isFrozen ? "Retomar Frota" : "Pausar Entregas"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <button
            onClick={() => handleActionTrigger("Reatribuir Cargas", "Rebalanceado 3 cargas órfãs para cronogramas de transporte ativos.")}
            disabled={activeSimulationAction !== null}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-white mb-2">
              <RefreshCw size={16} className="text-primary" />
              <span className="text-[9px] font-mono">OPT-1</span>
            </div>
            <p className="font-bold text-xs text-slate-200">Reatribuir Cargas</p>
            <p className="text-[10px] text-slate-500 truncate">Executar balanceamento</p>
          </button>

          <button
            onClick={() => handleActionTrigger("Cancelar Rota", "Abortada 1 rota exibindo violação de SLA crítica nas docas de carregamento.")}
            disabled={activeSimulationAction !== null}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-white mb-2">
              <XCircle size={16} className="text-rose-500" />
              <span className="text-[9px] font-mono">OPT-2</span>
            </div>
            <p className="font-bold text-xs text-slate-200">Cancelar Rota</p>
            <p className="text-[10px] text-slate-500 truncate">Remover do manifesto</p>
          </button>

          <button
            onClick={() => handleActionTrigger("Mesclar Rotas", "Mesclado 2 trajetos distintos compartilhando coordenadas de destino.")}
            disabled={activeSimulationAction !== null}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-white mb-2">
              <GitMerge size={16} className="text-emerald-400" />
              <span className="text-[9px] font-mono">OPT-3</span>
            </div>
            <p className="font-bold text-xs text-slate-200">Mesclar Rotas</p>
            <p className="text-[10px] text-slate-500 truncate">Unificar docas sobrepostas</p>
          </button>

          <button
            onClick={() => handleActionTrigger("Dividir Carga", "Separado fluxo de carga volumétrica excedendo limites de hardware.")}
            disabled={activeSimulationAction !== null}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-white mb-2">
              <Split size={16} className="text-amber-400" />
              <span className="text-[9px] font-mono">OPT-4</span>
            </div>
            <p className="font-bold text-xs text-slate-200">Dividir Rotas</p>
            <p className="text-[10px] text-slate-500 truncate">Fracionar excesso de peso</p>
          </button>

          <button
            onClick={() => handleActionTrigger("Modificar Destino", "Mapeado novos vetores de polígono utilizando travas de GPS ativas.")}
            disabled={activeSimulationAction !== null}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-white mb-2">
              <MapPin size={16} className="text-blue-400" />
              <span className="text-[9px] font-mono">OPT-5</span>
            </div>
            <p className="font-bold text-xs text-slate-200">Alterar Destino</p>
            <p className="text-[10px] text-slate-500 truncate">Redirecionar caminhão</p>
          </button>

          <button
            onClick={() => handleActionTrigger("Protocolo VoIP", "Iniciada chamada SIP de cabine isolada conectando console operacional.")}
            disabled={activeSimulationAction !== null}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-white mb-2">
              <PhoneCall size={16} className="text-indigo-400" />
              <span className="text-[9px] font-mono">OPT-6</span>
            </div>
            <p className="font-bold text-xs text-slate-200">Contatar Motorista</p>
            <p className="text-[10px] text-slate-500 truncate">Roteamento SIP direto</p>
          </button>

          <button
            onClick={() => handleActionTrigger("Verificação de Lacre", "Checado e assinado protocolo de fixadores de contêiner não-repudiado.")}
            disabled={activeSimulationAction !== null}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-white mb-2">
              <Lock size={16} className="text-teal-400" />
              <span className="text-[9px] font-mono">OPT-7</span>
            </div>
            <p className="font-bold text-xs text-slate-200">Verificar Carga</p>
            <p className="text-[10px] text-slate-500 truncate">Checar lacres físicos</p>
          </button>

          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-primary tracking-widest">Proteção de SLA</span>
            <p className="text-xs font-black text-slate-100">Matriz de Risco Zero</p>
            <p className="text-[9px] text-primary/80">Loops contínuos de roteamento</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatcherOverview;
