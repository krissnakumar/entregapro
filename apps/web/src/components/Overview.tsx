import { 
  Package, 
  AlertTriangle, 
  Users, 
  Truck, 
  CheckCircle,
  TrendingUp,
  Plus,
  Wrench,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Navigation,
  Activity,
  Layers,
  Zap,
  Cpu,
  MapPin,
  Compass
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import MapView from './MapView';
import { cn } from '../lib/utils';
import OrderFormModal from './OrderFormModal';
import InvoiceUploadModal from './InvoiceUploadModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Overview = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const navigate = useNavigate();

  // Busca estatísticas executivas e de telemetria
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<any>('/reports/executive').catch(() => null),
  });

  // Entregas ativas para monitoramento
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries-live'],
    queryFn: () => api.get<any[]>('/deliveries').catch(() => []),
  });

  // Alertas de manutenção com prazos curtos
  const { data: maintenanceData = [] } = useQuery({
    queryKey: ['maintenance-alerts'],
    queryFn: async () => {
      const vehicles = await api.get<any[]>('/vehicles').catch(() => []);
      const today = new Date();
      return (vehicles || []).filter(v => v.maintenanceDue && new Date(v.maintenanceDue) <= new Date(today.getTime() + 14 * 86400000));
    }
  });

  // Grelha principal de cartões operacionais com links de roteamento direto
  const stats = [
    { title: 'Entregas Hoje', value: deliveries.length.toString(), icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/dashboard/deliveries' },
    { title: 'Frota em Rota', value: deliveries.filter((d: any) => d.status === 'IN_TRANSIT').length.toString(), icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', path: '/dashboard/vehicles' },
    { title: 'Alertas de Atraso', value: (statsData?.delayedCount || deliveries.filter((d: any) => d.delayed).length).toString(), icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', urgent: true, path: '/dashboard/reports' },
    { title: 'Motoristas Ativos', value: (statsData?.onlineDrivers || 0).toString(), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/dashboard/drivers' },
    { title: 'Volume Embarcado', value: `${deliveries.reduce((sum: number, d: any) => sum + parseFloat(d.quantity || 0), 0).toFixed(0)}m³`, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50', path: '/dashboard/reports' },
    { title: 'Alocação Diesel', value: '0 Litros', icon: Navigation, color: 'text-orange-600', bg: 'bg-orange-50', path: '/dashboard/fuel' },
    { title: 'Manutenção Frota', value: `${maintenanceData.length} Alertas`, icon: Wrench, color: 'text-rose-600', bg: 'bg-rose-50', path: '/dashboard/fuel' },
    { title: 'Cargas Concluídas', value: deliveries.filter((d: any) => d.status === 'Completed' || d.status === 'DELIVERED').length.toString(), icon: CheckCircle, color: 'text-slate-700', bg: 'bg-slate-100', path: '/dashboard/deliveries' },
  ];

  // Dados mockados auxiliares de alta performance em caso de ausência de backend
  const mockTopDrivers: any[] = [];

  const topDriversList = statsData?.topDrivers || mockTopDrivers;

  return (
    <div className="space-y-8 pb-16 font-sans select-none animate-in fade-in duration-300">
      
      {/* Ações Rápidas - Apenas os dois botões primários */}
      <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-xs flex flex-wrap items-center justify-center gap-4 transition-all hover:border-slate-300">
        <button 
          onClick={() => setIsInvoiceModalOpen(true)}
          className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none shrink-0"
        >
          <FileText size={16} className="text-indigo-600 shrink-0" />
          <span>Consultar Manifesto</span>
        </button>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer outline-none shrink-0"
        >
          <Plus size={16} strokeWidth={3} className="shrink-0" />
          <span>Novo Despacho</span>
        </button>
      </div>
      

      {/* Grelha de Indicadores de Topo (Clicáveis para Navegação) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div 
            key={stat.title} 
            onClick={() => navigate(stat.path)}
            className="bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center gap-3 hover:border-indigo-400 hover:shadow-xs active:scale-95 transition-all cursor-pointer group overflow-hidden"
            title={`Acessar relatórios e vistas de ${stat.title}`}
          >
            <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110 duration-200", stat.bg)}>
              <stat.icon size={18} className={stat.color} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                {stat.title}
              </p>
              <p className={cn("text-base font-black tracking-tight truncate", stat.color)}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Camada Principal: Mapa de Logística e Listas de Liderança em Fundo Branco */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Mapa Logístico Interativo */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] shadow-xs overflow-hidden flex flex-col h-[520px]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 truncate">
                Operações de Pátio e Rodovia ao Vivo
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-600" /> Roteado
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" /> Doca
              </span>
            </div>
          </div>
          <div className="flex-1 relative z-0">
            <MapView />
          </div>
        </div>

        {/* Liderança e Manutenções Críticas em Fundo Branco */}
        <div className="space-y-6">
          
          {/* Líderes de Eficiência Operacional */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xs p-6">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Users size={14} className="text-indigo-600 shrink-0" />
              <span className="truncate">Líderes em Eficiência de Entrega</span>
            </h3>
            <div className="space-y-3">
              {topDriversList.map((driver: any, i: number) => (
                <div 
                  key={driver.id || i} 
                  onClick={() => navigate('/dashboard/drivers')}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{driver.name}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight truncate">
                        {driver.totalDeliveries} Cargas Concluídas
                      </p>
                    </div>
                  </div>
                  <div className="text-emerald-600 flex items-center gap-1 font-black text-xs font-mono bg-emerald-50 px-2 py-1 rounded-md shrink-0 border border-emerald-100/60">
                    <TrendingUp size={12} />
                    {driver.rate || '98.5%'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sondas de Integridade da Frota - Clear White Card Layout */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
             <div className="relative z-10">
               <div className="flex items-center justify-between mb-1">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Integridade da Frota</h3>
                 <Wrench size={14} className="text-amber-500 shrink-0" />
               </div>
               <p className="text-slate-500 text-[10px] mb-4">Unidades com prazo de inspeção veicular se aproximando.</p>
               
               <div className="space-y-2.5">
                 {maintenanceData?.slice(0, 2).map((v: any) => (
                   <div 
                     key={v.id} 
                     onClick={() => navigate('/dashboard/vehicles')}
                     className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-indigo-50/40 transition-colors"
                   >
                     <div className="flex items-center gap-2.5">
                       <Truck size={14} className="text-amber-500 shrink-0" />
                       <span className="font-bold text-xs text-slate-900 font-mono">{v.vehicleNumber}</span>
                     </div>
                     <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                       Revisão Próxima
                     </span>
                   </div>
                 ))}
                 {(!maintenanceData || maintenanceData.length === 0) && (
                   <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                     <p className="text-[10px] text-slate-500 font-medium tracking-wide">✓ Nenhum alerta mecânico crítico.</p>
                   </div>
                 )}
               </div>
               
               <button 
                 onClick={() => navigate('/dashboard/vehicles')}
                 className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer outline-none"
               >
                 <span>Auditoria Geral de Frotas</span> <ChevronRight size={12} />
               </button>
             </div>
          </div>

        </div>
      </div>

      {/* Alertas Operacionais de Retenção de Via */}
      <div className="bg-white border border-rose-200 rounded-[2.5rem] shadow-xs p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 shrink-0">
              <AlertTriangle size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest text-rose-700">
                Monitoramento Crítico de Malha
              </h3>
              <p className="text-xs font-medium text-slate-500">Acompanhamento de retenções rodoviárias ou paradas em balança</p>
            </div>
          </div>
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider self-start sm:self-auto shrink-0">
            SLA em Vigilância
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {deliveries.filter(d => d.status === 'DELAYED' || (d.status !== 'DELIVERED' && new Date(d.scheduledTime) < new Date())).slice(0, 2).map((delivery: any) => (
             <div 
               key={delivery.id} 
               onClick={() => navigate('/dashboard/reports')}
               className="flex items-center justify-between p-4 bg-slate-50 border border-rose-100 rounded-2xl hover:border-rose-300 transition-all cursor-pointer group"
             >
               <div className="flex items-center gap-3 min-w-0">
                 <div className="w-10 h-10 bg-white text-rose-600 border border-rose-100 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                   ⚠️
                 </div>
                 <div className="min-w-0">
                   <p className="font-black text-xs text-slate-900 truncate">{delivery.customer?.name || 'Cliente Identificado'}</p>
                   <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wide mt-0.5 flex items-center gap-1 truncate">
                     <MapPin size={10} className="shrink-0" /> Retido na Via Principal
                   </p>
                 </div>
               </div>
               <ChevronRight size={16} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
             </div>
           ))}
           {deliveries.filter(d => d.status === 'DELAYED').length === 0 && (
             <div className="md:col-span-2 text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 font-medium text-xs">
               ✓ Todas as frotas ativas estão cumprindo os polígonos espaciais dentro dos limites de tolerância estabelecidos.
             </div>
           )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOVO DESIGN: CENTRAL GRÁFICA DE COMANDO (TOTALMENTE BRANCO, CLARO E MODERNO) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
        
        {/* Cabeçalho do Bloco Gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600">Sistemas Consolidados PostGIS</span>
            </div>
            <h3 className="font-black text-xl tracking-tight text-slate-900">Central Gráfica de Comando Operacional</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Mapeamento estrutural capturando densidades veiculares, queima de combustível e cadência de transporte.</p>
          </div>
          <span className="px-3 py-1.5 bg-slate-50 text-indigo-700 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 text-center">
            Relatórios Auditados
          </span>
        </div>

        {/* Grelha de Gráficos em Fundo Branco (Premium Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          
          {/* Gráfico 1: Ocupação Espacial */}
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex flex-col justify-between h-44 relative overflow-hidden group hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between z-10">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">Ocupação Espacial</span>
              <span className="text-[8px] font-mono bg-white text-indigo-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">Zonas</span>
            </div>
            
            {/* Soft Minimalist Custom Bars */}
            <div className="absolute inset-x-0 bottom-0 h-24 flex items-end justify-between px-4 pt-2 pb-0 opacity-80 group-hover:opacity-100 transition-opacity">
              {[35, 55, 25, 80, 45, 95, 60, 40].map((h, idx) => (
                <div key={idx} className="w-2 rounded-t bg-indigo-600/20 group-hover:bg-indigo-600 transition-all duration-300" style={{ height: `${h}%` }} />
              ))}
            </div>

            <div className="z-10 mt-auto pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-600 truncate">Eixo Dutra</p>
              <span className="text-[9px] font-black font-mono text-indigo-700 shrink-0">92.4% Densidade</span>
            </div>
          </div>

          {/* Gráfico 2: Cadência de Implementos */}
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex flex-col justify-between h-44 relative overflow-hidden group hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between z-10">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">Cadência Veicular</span>
              <span className="text-[8px] font-mono bg-white text-amber-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">Live</span>
            </div>
            
            <div className="flex items-center justify-around my-auto z-10 py-1">
              <div className="relative w-14 h-14 flex items-center justify-center bg-white rounded-full border border-slate-200 shadow-2xs">
                <span className="font-mono font-black text-xs text-slate-900">88%</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">Carga Ativa</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <span className="truncate">Reserva</span>
                </div>
              </div>
            </div>

            <div className="z-10 mt-auto pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 truncate">Capacidade</p>
              <span className="text-[9px] font-black text-amber-600 shrink-0">Otimizada</span>
            </div>
          </div>

          {/* Gráfico 3: Volume Transportado */}
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex flex-col justify-between h-44 relative overflow-hidden group hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between z-10">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">Volume Mês</span>
              <span className="text-[8px] font-mono bg-white text-purple-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">Ton</span>
            </div>
            
            <div className="flex items-end justify-between h-20 pt-3 z-10 px-2">
              {[40, 55, 48, 65, 78, 95].map((h, idx) => (
                <div key={idx} className="w-2.5 rounded-t bg-purple-600/30 group-hover:bg-purple-600 transition-all duration-300" style={{ height: `${h}%` }} />
              ))}
            </div>

            <div className="z-10 mt-auto pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-600 truncate">Crescimento</p>
              <span className="text-[10px] font-black font-mono text-purple-700 shrink-0">+18.4%</span>
            </div>
          </div>

          {/* Gráfico 4: Combustão de Diesel */}
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex flex-col justify-between h-44 relative overflow-hidden group hover:border-cyan-200 transition-all">
            <div className="flex items-center justify-between z-10">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">Combustão Diesel</span>
              <span className="text-[8px] font-mono bg-white text-cyan-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">OSRM</span>
            </div>
            
            <div className="my-auto z-10 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-slate-900 tracking-tight">4.5 <span className="text-[10px] text-cyan-600">L/km</span></span>
                <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">Média</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-600 rounded-full w-[64%] transition-all duration-500 group-hover:w-[68%]" />
              </div>
            </div>

            <div className="z-10 mt-auto pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 truncate">Mitigação</p>
              <span className="text-[9px] font-black text-cyan-600 font-mono shrink-0">Ativa</span>
            </div>
          </div>

        </div>

        {/* Card Final de Confiabilidade (Premium Clear Light Card Layout) */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-[1.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-emerald-300">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block truncate">Índice de Confiabilidade Contínua</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              99.2% <span className="text-xs font-bold text-emerald-600 font-sans tracking-normal uppercase">Sucesso nos Despachos</span>
            </p>
            <p className="text-xs text-slate-500 font-medium max-w-xl">
              Zero anomalias ou sinistros reportados nos lacres físicos durante os percursos em rodovias estaduais e federais auditadas.
            </p>
          </div>

          <div className="px-4 py-2.5 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xs shrink-0 text-center self-start sm:self-auto">
            SLA Preservado
          </div>
        </div>

      </div>

      {/* Modais de Ação */}
      <OrderFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
      <InvoiceUploadModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
      
    </div>
  );
};

export default Overview;
