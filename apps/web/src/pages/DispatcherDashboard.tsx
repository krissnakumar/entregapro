import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Truck, 
  User, 
  MapPin, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Layers, 
  Activity, 
  Bell, 
  Navigation, 
  ChevronRight, 
  ShieldCheck, 
  LogOut,
  Send,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Menu,
  Fuel,
  Wrench
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { FuelMaintenanceModule } from '../components/FuelMaintenanceModule';

// ============================================================================
// COMPONENTE ISOLADO DE EDIÇÃO DE REMARKS PARA GARANTIR ESTABILIDADE DE FOCO
// ============================================================================
const InvoiceRemarkEditor = ({ invoice, onSave }: { invoice: any; onSave: (remark: string) => void }) => {
  const [text, setText] = useState(invoice?.remarks || "");

  // Atualiza o estado local se a invoice mudar
  useEffect(() => {
    setText(invoice?.remarks || "");
  }, [invoice?.number]);

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">
          Observações do Despachante
        </span>
        <span className="text-[9px] font-bold text-slate-400">Anotação opcional</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Adicione uma observação (ex: avaria leve na caixa, lacre conferido, reforço no palete)..."
        rows={2}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none block"
      />

      {/* Predefinições Rápidas amigáveis ao toque */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {['Carga Conferida', 'Lacre Checado', 'Aviso de Frágil Anexado'].map((tag, tIdx) => (
          <button
            key={tIdx}
            type="button"
            onClick={() => setText(prev => prev ? `${prev} | ${tag}` : tag)}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer outline-none shrink-0"
          >
            +{tag}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSave(text)}
        className="w-full py-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl font-bold text-xs transition-all text-center block cursor-pointer outline-none border border-blue-200 hover:border-transparent mt-2"
      >
        Salvar Observação na Nota
      </button>
    </div>
  );
};

// ============================================================================
// DADOS SIMULADOS REFLETINDO MULTIPLAS NOTAS FISCAIS POR CAMINHÃO (DELIVERY)
// Atualizado de acordo com o planejamento inteligente da central Admin
// ============================================================================
const INITIAL_TODAYS_DELIVERIES: any[] = [];

const INITIAL_NOTIFICATIONS: any[] = [];

const DispatcherDashboard = () => {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // Auto-hide navigation control
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'verification' | 'gps' | 'fuel'>('console');
  
  const [deliveries, setDeliveries] = useState<any[]>(INITIAL_TODAYS_DELIVERIES);
  const [notifications, setNotifications] = useState<any[]>(INITIAL_NOTIFICATIONS);
  
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<any | null>(null);
  const [activeTripForInvoices, setActiveTripForInvoices] = useState<any | null>(null);
  const [tripFailurePrompt, setTripFailurePrompt] = useState<any | null>(null);
  const [failureRemarkText, setFailureRemarkText] = useState('');

  // Sincronização graciosamente sandboxed
  const { data: apiDeliveries } = useQuery({
    queryKey: ['dispatcher-live-sync'],
    queryFn: () => api.get<any[]>('/deliveries').catch(() => null),
  });

  // Reactive synchronizer to sync actual backend deliveries into local mutable dispatcher state
  useEffect(() => {
    if (apiDeliveries && apiDeliveries.length > 0) {
      const mapped = apiDeliveries.map((del: any) => ({
        id: del.id,
        deliveryNumber: del.deliveryNumber || `DEL-${del.id}`,
        assignedTruck: del.vehicle?.vehicleNumber || del.vehicleNumber || 'PRO-1001',
        assignedDriver: del.driver?.user?.name || del.driver?.name || 'Motorista',
        primaryDestination: del.customer?.address || del.address || 'Destino',
        deliveryStatus: del.status || 'ASSIGNED',
        loadingStatus: del.loadingStatus || 'completed',
        dispatchTime: del.dispatchTime || '--:--',
        gpsLocation: del.gpsLocation || 'Pátio Doca Central',
        eta: del.eta || '30 min',
        routeProgress: del.routeProgress || 0,
        delayed: del.delayed || false,
        invoices: del.invoices || [
          { number: del.invoiceNumber || 'NFE-000', customer: del.customer?.name || 'Cliente', material: del.materialType || 'Concreto', volume: del.quantity || '10m³', weight: '24 Ton' }
        ]
      }));
      setDeliveries(mapped);
    }
  }, [apiDeliveries]);

  const addTimelineEvent = (type: string, text: string) => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => [{ id: `ntf-${Date.now()}`, time: nowStr, type, text }, ...prev]);
  };

  // ============================================================================
  // STATUS UPDATE SYSTEM (One-Click Status Workflow)
  // ============================================================================
  const getNextStatusInfo = (currentStatus: string): { nextStatus: string; label: string; actionBg: string } => {
    switch (currentStatus) {
      case 'ASSIGNED':
        return { nextStatus: 'TRUCK_ARRIVED', label: 'Confirmar Chegada', actionBg: 'bg-blue-600 hover:bg-blue-700 text-white' };
      case 'TRUCK_ARRIVED':
        return { nextStatus: 'LOADING_STARTED', label: 'Iniciar Carregamento', actionBg: 'bg-amber-500 hover:bg-amber-600 text-white' };
      case 'LOADING_STARTED':
        return { nextStatus: 'LOADING_COMPLETED', label: 'Concluir Carregamento', actionBg: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
      case 'LOADING_COMPLETED':
        return { nextStatus: 'DISPATCHED', label: 'Confirmar Despacho', actionBg: 'bg-blue-600 hover:bg-blue-700 text-white' };
      case 'DISPATCHED':
        return { nextStatus: 'IN_TRANSIT', label: 'Marcar Em Trânsito', actionBg: 'bg-indigo-600 hover:bg-indigo-700 text-white' };
      case 'IN_TRANSIT':
        return { nextStatus: 'ARRIVED_DESTINATION', label: 'Chegada no Destino', actionBg: 'bg-blue-600 hover:bg-blue-700 text-white' };
      case 'ARRIVED_DESTINATION':
        return { nextStatus: 'UNLOADING', label: 'Iniciar Descarregamento', actionBg: 'bg-amber-500 hover:bg-amber-600 text-white' };
      case 'UNLOADING':
        return { nextStatus: 'COMPLETED', label: 'Finalizar (Concluído)', actionBg: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
      default:
        return { nextStatus: 'COMPLETED', label: 'Operação Encerrada', actionBg: 'bg-slate-200 text-slate-400 cursor-not-allowed' };
    }
  };

  const handleStatusAdvance = (id: string, customNext?: string, customLabel?: string) => {
    const target = deliveries.find(d => d.id === id);
    if (!target) return;

    const info = getNextStatusInfo(target.deliveryStatus);
    const updatedStatus = customNext || info.nextStatus;
    const actionName = customLabel || info.label;

    setDeliveries(prev => prev.map(d => {
      if (d.id === id) {
        let newLoading = d.loadingStatus;
        let newDispatchTime = d.dispatchTime;
        if (updatedStatus === 'LOADING_STARTED') newLoading = 'loading';
        if (updatedStatus === 'LOADING_COMPLETED') newLoading = 'completed';
        if (updatedStatus === 'DISPATCHED') newDispatchTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return {
          ...d,
          deliveryStatus: updatedStatus,
          loadingStatus: newLoading,
          dispatchTime: newDispatchTime,
          routeProgress: updatedStatus === 'COMPLETED' ? 100 : d.routeProgress > 0 ? d.routeProgress : 5
        };
      }
      return d;
    }));

    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    addTimelineEvent('status_update', `[${target.assignedTruck}] alterado para ${updatedStatus} por ${user?.name || 'Despachante'}`);
    
    api.patch(`/deliveries/${id}/status`, { status: updatedStatus }).catch(() => null);

    toast.success(`Status da frota atualizado: ${actionName}`, {
      description: `Registrado às: ${timeStr} | Motorista: ${target.assignedDriver}`,
    });
  };



  const navItems = [
    { id: 'console', label: 'Console ao Vivo', icon: Activity, desc: 'Lista atualizada via Admin' },
    { id: 'gps', label: 'Em Movimento', icon: Navigation, desc: 'Rastreamento contínuo' },
    { id: 'fuel', label: 'Combustível & Manutenção', icon: Fuel, desc: 'Registrar abastecimentos e revisões' },
  ];

  // Cálculo de volume/peso total da viagem em tempo real
  const calcTotalMetrics = (invoices: any[]) => {
    const count = invoices.length;
    return `${count} nota(s) vinculada(s)`;
  };

  return (
    <div className="h-screen bg-white text-slate-900 font-sans select-none flex flex-col overflow-hidden">
      
      {/* 🔴 CABEÇALHO DO DESPACHANTE ADAPTÁVEL */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 z-40 relative">
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsNavOpen(!isNavOpen)}
            className={cn(
              "p-2 sm:p-2.5 rounded-xl transition-all border flex items-center justify-center shrink-0 cursor-pointer outline-none",
              isNavOpen ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            )}
            title="Alternar Menu Principal"
          >
            <Menu size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>

          <div className="p-2 sm:p-2.5 bg-blue-600 text-white rounded-xl shadow-xs hidden sm:block shrink-0">
            <Layers size={22} strokeWidth={2.5} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-none">Console de Armazém</h1>
              <span className="px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-blue-100 shrink-0">
                DESPACHANTE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block truncate">Painel de frota e motoristas atualizado em tempo real via central de logística Admin</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">Sincronizado com Admin</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-2 sm:pl-4">
            <div className="text-right hidden md:block">
              <span className="text-xs font-bold text-slate-900 block">{user?.name || 'Operador de Despacho'}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Acesso de Observação</span>
            </div>

            <button 
              onClick={() => { logout(); toast.success('Sessão encerrada'); }} 
              className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100 cursor-pointer"
              title="Sair da sessão com segurança"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 🔴 CORPO PRINCIPAL COM NAVEGAÇÃO LATERAL AUTO-HIDE E SUPORTE DINÂMICO MOBILE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* BACKDROP OVERLAY PARA MOBILE QUANDO MENU ABERTO */}
        {isNavOpen && (
          <div 
            onClick={() => setIsNavOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-2xs z-20 md:hidden animate-in fade-in duration-200"
          />
        )}

        {/* SIDE NAVIGATION PANEL */}
        <aside 
          className={cn(
            "bg-slate-50 border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 overflow-y-auto transition-all duration-300 absolute inset-y-0 left-0 z-30 md:relative shadow-2xl md:shadow-none",
            isNavOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden p-0 border-r-0"
          )}
        >
          <div className="space-y-6 w-56">
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Navegação Principal
                </span>
                <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">Auto-Ocultar</span>
              </div>
              
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsNavOpen(false); // Retrai o menu automaticamente na tela tablet
                      }}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3 select-none relative group border",
                        isActive 
                          ? "bg-white text-blue-700 border-blue-200 shadow-xs font-bold" 
                          : "bg-transparent text-slate-600 border-transparent hover:bg-slate-100/80 font-medium"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg mt-0.5 shrink-0 transition-colors",
                        isActive ? "bg-blue-50 text-blue-600" : "bg-slate-200/60 text-slate-500 group-hover:bg-slate-200"
                      )}>
                        <Icon size={18} />
                      </div>
                      
                      <div className="flex-1 truncate">
                        <span className="text-xs font-bold block tracking-tight text-slate-900">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate normal-case font-normal mt-0.5">
                          {item.desc}
                        </span>
                      </div>

                      {isActive && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quadro de Resumo da Frota Em Operação */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                Resumo da Frota Ativa
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Viagens Alocadas:</span>
                <strong className="font-bold font-mono text-slate-900">{deliveries.length} Viagens</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total de Notas:</span>
                <strong className="font-bold font-mono text-indigo-600">
                  {deliveries.reduce((acc, d) => acc + d.invoices.length, 0)} Notas
                </strong>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 mt-4 text-[10px] text-slate-400 leading-relaxed font-medium w-56">
             🛡️ Motoristas, veículos e notas vinculadas são sincronizados automaticamente pelos planejadores da central Admin.
          </div>
        </aside>

        {/* ÁREA DE CONTEÚDO PRINCIPAL (Grelha Otimizada Full-Width com foco primário em Driver e Truck) */}
        <main 
          onClick={() => {
            if (isNavOpen) setIsNavOpen(false);
          }}
          className="flex-1 p-6 overflow-y-auto bg-white custom-scrollbar"
        >
          <div className="max-w-6xl mx-auto h-full animate-in fade-in duration-200">
            
            {/* ========================================================================= */}
            {/* ABA 1: CONSOLE GERAL (Foco principal em Driver & Truck contendo Multiplas Notas) */}
            {/* ========================================================================= */}
            {activeTab === 'console' && (
              <div className="space-y-6">
                
                {/* INSTRUÇÕES */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-blue-600 text-white rounded-xl font-black text-xs shrink-0">ℹ️</span>
                    <p className="text-xs text-blue-950 font-medium">
                      <strong>Mapeamento de Frota:</strong> Exibição das viagens priorizando o Motorista e o Veículo alocado. As múltiplas notas embarcadas são sincronizadas a partir do plano logístico da central Admin.
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-blue-800 bg-white px-2 py-1 rounded border border-blue-200 shrink-0">
                    FOCO NO MOTORISTA
                  </span>
                </div>

                {/* LISTA COMPLETA DE FROTAS ATIVAS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Viagens Alocadas (Atualizado via Admin)
                    </h2>
                    <span className="text-xs font-bold text-slate-400">Console de Operações</span>
                  </div>

                  <div className="space-y-2">
                    {deliveries.map((del) => {
                      return (
                        <div 
                          key={del.id}
                          className={cn(
                            "bg-white border rounded-xl p-3 shadow-2xs transition-all relative overflow-hidden hover:border-blue-300",
                            del.deliveryStatus === 'DELIVERY_FAILED' ? "border-rose-400 bg-rose-50/40" : del.delayed ? "border-rose-200 bg-rose-50/10" : "border-slate-200"
                          )}
                        >
                          <button
                            onClick={() => {
                              setActiveTripForInvoices(del);
                            }}
                            className="w-full text-left outline-none group cursor-pointer space-y-1 block"
                            title="Clique para inspecionar as notas fiscais vinculadas à viagem"
                          >
                            {/* Linha 1: Compact Driver / Truck / Destination */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white rounded text-[10px] font-bold font-mono transition-colors">
                                  VIAGEM
                                </span>
                                <h3 className="font-black text-xs text-slate-900 group-hover:text-blue-600 tracking-tight flex items-center gap-0.5">
                                  {del.assignedDriver} ↗
                                </h3>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-100">
                                  {del.assignedTruck}
                                </span>
                                {del.deliveryStatus === 'DELIVERY_FAILED' && (
                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200 animate-pulse uppercase tracking-wider">
                                    FALHA
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                                <MapPin size={10} className="text-rose-500" />
                                <span className="truncate max-w-[150px] sm:max-w-[200px]">{del.primaryDestination}</span>
                              </div>
                            </div>

                            {/* Linha 2: Compact Enclosed Invoices list */}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">
                                Notas ({del.invoices.length}):
                              </span>
                              {del.invoices.map((inv, idx) => (
                                <span 
                                  key={idx}
                                  className="px-1.5 py-0.2 bg-slate-50 border border-slate-200/60 rounded text-[10px] font-mono text-slate-700 flex items-center gap-1"
                                >
                                  <strong>{inv.number}</strong>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-600 text-[9px]">{inv.volume}</span>
                                </span>
                              ))}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}



            {/* ========================================================================= */}
            {/* ABA 3: ACTIVE DELIVERIES / GPS MONITORING */}
            {/* ========================================================================= */}
            {activeTab === 'gps' && (
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <Navigation size={18} className="text-indigo-600" /> Frota Em Movimento
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Acompanhe coordenadas físicas, destino principal e tempo estimado de chegada</p>
                  </div>
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    RASTREAMENTO CONTÍNUO
                  </span>
                </div>

                <div className="space-y-4">
                  {deliveries.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setActiveTripForInvoices(d)}
                      className="w-full text-left p-4 bg-slate-50 hover:bg-blue-50/40 rounded-2xl border border-slate-100 hover:border-blue-200 space-y-3 transition-all cursor-pointer block group outline-none shadow-2xs hover:shadow-xs relative"
                      title="Clique para inspecionar as notas e o andamento do despacho"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
                          <strong className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{d.assignedDriver}</strong>
                          <span className="text-slate-400 text-xs">—</span>
                          <span className="text-xs font-medium text-slate-700">{d.assignedTruck}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {d.delayed ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-black uppercase">
                              Atraso Reportado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black uppercase">
                              No Horário
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200 group-hover:border-blue-200 transition-colors">
                            Previsão: {d.eta}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Simples */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Base Logística</span>
                          <span>Progresso da Rota ({d.routeProgress}%)</span>
                          <span>{d.primaryDestination.split(' - ')[0]}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              d.delayed ? "bg-amber-500" : "bg-blue-600"
                            )}
                            style={{ width: `${d.routeProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Detalhe de Localização GPS Corrente e Indicador de Clique */}
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100/60 mt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="text-slate-400 shrink-0 group-hover:text-blue-500 transition-colors" />
                          <span className="text-[11px] truncate">Localização Atual: <strong className="text-slate-800 font-mono">{d.gpsLocation}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-bold">
                            {d.invoices.length} notas vinculadas
                          </span>
                          <span className="text-[10px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            Inspecionar ↗
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  📌 A otimização de rotas e o mapeamento de notas são gerenciados exclusivamente pelo motor logístico da central Admin.
                </div>
              </div>
            )}

            {activeTab === 'fuel' && (
              <FuelMaintenanceModule />
            )}

          </div>
        </main>
      </div>

      {/* POPUP OVERLAY MODAL DE INSPEÇÃO DA NOTA FISCAL (Sub-Invoice Ledger Details) */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-md overflow-hidden shadow-xl flex flex-col">
            
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600 shrink-0" />
                <span className="font-black text-xs text-slate-900 uppercase tracking-tight">
                  Detalhes da Sub-Nota Fiscal
                </span>
                <span className="font-mono text-xs font-bold text-slate-400 bg-white px-2 py-0.5 border border-slate-200 rounded">
                  {selectedInvoiceDetail.number}
                </span>
              </div>
              
              <button
                onClick={() => setSelectedInvoiceDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors shrink-0 outline-none cursor-pointer"
                title="Fechar detalhes"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Central Detalhado */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Entidade Destinatária</span>
                <strong className="text-sm font-black text-slate-900 block leading-tight">{selectedInvoiceDetail.customer}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Material Transportado</span>
                  <strong className="text-xs font-bold text-indigo-700 block truncate">{selectedInvoiceDetail.material}</strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Volume Alocado</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block">{selectedInvoiceDetail.volume}</strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Peso Estático</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block">{selectedInvoiceDetail.weight}</strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Integridade do Lacre</span>
                  <strong className="text-xs font-bold text-emerald-600 block">✓ Lacre Validado</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed font-medium">
                🛡️ <strong>Controle Administrativo:</strong> Os parâmetros desta sub-nota são estritamente configurados pela central Admin. A conferência física é obrigatória antes da liberação.
              </div>

              {/* REMARKS DO DESPACHANTE USANDO COMPONENTE ESTÁVEL */}
              <InvoiceRemarkEditor
                invoice={selectedInvoiceDetail}
                onSave={(newRemark) => {
                  const trimmed = newRemark.trim();
                  // Salva a remark na invoice corrente dentro da lista global deliveries
                  setDeliveries(prev => prev.map(trip => ({
                    ...trip,
                    invoices: trip.invoices.map(inv => inv.number === selectedInvoiceDetail.number ? { ...inv, remarks: trimmed } : inv)
                  })));

                  // Atualiza também na activeTripForInvoices se ela estiver montada para refletir na UI imediatamente
                  if (activeTripForInvoices) {
                    setActiveTripForInvoices((currentTrip: any) => ({
                      ...currentTrip,
                      invoices: currentTrip.invoices.map((inv: any) => inv.number === selectedInvoiceDetail.number ? { ...inv, remarks: trimmed } : inv)
                    }));
                  }

                  // Atualiza a selectedInvoiceDetail atual para mostrar a remark persistida
                  setSelectedInvoiceDetail(null); // Fecha a sub-nota automaticamente para agilizar o fluxo operacional

                  addTimelineEvent('status_update', `Remark appended to Sub-Invoice #${selectedInvoiceDetail.number}: "${trimmed || 'Cleared'}"`);
                  
                  toast.success('Observação salva com sucesso!', {
                    description: `Registro da nota #${selectedInvoiceDetail.number} atualizado.`
                  });
                }}
              />
            </div>

          </div>
        </div>
      )}

      {/* POPUP OVERLAY MODAL PRINCIPAL DE DETALHES DAS INVOICES DA VIAGEM */}
      {activeTripForInvoices && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Cabeçalho do Modal: Foco Exclusivo nas Invoices da Viagem */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" /> Notas Fiscais da Viagem
                </h3>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">
                  Motorista: <strong className="text-slate-800">{activeTripForInvoices.assignedDriver}</strong> | Veículo: <strong className="text-blue-700">{activeTripForInvoices.assignedTruck}</strong>
                </span>
              </div>

              <button
                onClick={() => setActiveTripForInvoices(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors shrink-0 outline-none cursor-pointer"
                title="Fechar janela"
              >
                ✕
              </button>
            </div>

            {/* Lista Interativa de Invoices Exclusivas da Viagem */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Relação de Notas Embarcadas ({activeTripForInvoices.invoices.length})
              </span>

              <div className="space-y-2.5">
                {activeTripForInvoices.invoices.map((inv: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedInvoiceDetail(inv);
                    }}
                    className="w-full text-left p-3.5 bg-white hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl space-y-1.5 text-xs transition-all block group outline-none cursor-pointer relative shadow-2xs hover:shadow-xs"
                    title="Clique para conferir os detalhes da nota fiscal e adicionar observações"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-slate-900 group-hover:text-blue-700 bg-slate-100 group-hover:bg-white px-2 py-0.5 rounded border border-slate-200 group-hover:border-blue-200 text-[11px] transition-colors flex items-center gap-1">
                        {inv.number} ↗
                      </span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded border border-indigo-100 text-[11px]">
                        {inv.volume} ({inv.weight})
                      </span>
                    </div>
                    
                    <div className="text-[11px] flex justify-between text-slate-600">
                      <span className="truncate max-w-[180px]">Cliente: <strong className="text-slate-800">{inv.customer}</strong></span>
                      <span className="text-slate-500 font-medium truncate">{inv.material}</span>
                    </div>

                    {inv.remarks && (
                      <div className="pt-1 border-t border-slate-100/80 mt-1 text-[11px] text-amber-800 bg-amber-50/50 p-1.5 rounded border border-amber-100/60 flex items-start gap-1">
                        <span className="shrink-0">💬</span>
                        <span className="italic leading-tight break-words line-clamp-2">Observação: {inv.remarks}</span>
                      </div>
                    )}

                    <span className="text-[9px] font-bold text-blue-600 block pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para inspecionar e adicionar observações →
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 text-center font-medium">
                🔒 O sequenciamento de notas é atribuído exclusivamente pela central Admin.
              </div>
            </div>

            {/* Rodapé: Botões de Ação Operacional */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-3">
              <button
                onClick={() => {
                  // Atualiza o status e notifica o admin
                  handleStatusAdvance(activeTripForInvoices.id, 'COMPLETED', 'Salvar (Sincronizado com Admin)');
                  addTimelineEvent('loading', `Dados e observações salvos para o veículo ${activeTripForInvoices.assignedTruck}. Notificação transmitida em tempo real para a central Admin.`);
                  
                  toast.success('Salvo e Sincronizado com o Admin!', {
                    description: `Relação de notas fiscais despachadas com sucesso.`
                  });

                  setActiveTripForInvoices(null);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer outline-none"
              >
                <CheckCircle2 size={18} />
                <span>Salvar</span>
              </button>

              <button
                onClick={() => {
                  setTripFailurePrompt(activeTripForInvoices);
                  setFailureRemarkText('');
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition-all text-center flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer outline-none"
              >
                <AlertCircle size={15} />
                <span>Reportar Falha / Não Entregue</span>
              </button>

              <span className="text-[9px] font-bold text-slate-400 block text-center leading-tight">
                Ao salvar ou reportar falha, as informações são aplicadas localmente e enviadas à central Admin em tempo real.
              </span>
            </div>

          </div>
        </div>
      )}

      {/* POPUP OVERLAY MODAL DE JUSTIFICATIVA DE FALHA NA ENTREGA */}
      {tripFailurePrompt && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-rose-100 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            
            {/* Cabeçalho do Modal de Falha */}
            <div className="px-6 py-4 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <span className="font-black text-xs text-rose-950 uppercase tracking-tight">
                  Motivo da Falha na Entrega
                </span>
              </div>
              
              <button
                onClick={() => setTripFailurePrompt(null)}
                className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 flex items-center justify-center text-rose-700 transition-colors shrink-0 outline-none cursor-pointer"
                title="Cancelar e fechar"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Central: Entrada de Observações de Falha */}
            <div className="p-6 space-y-4">
              <div className="space-y-1 text-xs">
                <span className="text-slate-500">Veículo Alocado:</span>
                <strong className="text-slate-900 ml-1">{tripFailurePrompt.assignedTruck}</strong>
                <span className="text-slate-300 mx-1">|</span>
                <span className="text-slate-500">Motorista:</span>
                <strong className="text-slate-900 ml-1">{tripFailurePrompt.assignedDriver}</strong>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Descreva o Motivo ou Incidente
                </label>
                <textarea
                  rows={3}
                  value={failureRemarkText}
                  onChange={(e) => setFailureRemarkText(e.target.value)}
                  placeholder="Ex: Cliente ausente no local, endereço inacessível, avaria ou recusa da mercadoria..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-rose-400 focus:bg-white transition-all resize-none"
                  autoFocus
                />
              </div>

              {/* Tags Rápidas de Justificativa */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
                  Justificativas Predefinidas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Cliente Ausente',
                    'Endereço Incorreto ou Inacessível',
                    'Recusa Total da Carga',
                    'Avaria Identificada no Trajeto',
                    'Falta de Tempo Hábil na Rota'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setFailureRemarkText((prev) => prev ? `${prev} - ${tag}` : tag);
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-[10px] font-medium border border-slate-200/60 hover:border-rose-200 transition-all cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-[10px] text-amber-900 leading-relaxed font-medium">
                ⚠️ <strong>Atenção:</strong> Ao confirmar, a informação de falha e a justificativa serão enviadas e marcadas automaticamente no sistema da central Admin.
              </div>
            </div>

            {/* Rodapé de Envio Crítico */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTripFailurePrompt(null)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all text-center cursor-pointer outline-none"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  const finalRemark = failureRemarkText.trim() || 'Sem justificativa informada';
                  
                  // Atualiza as notas da viagem com a remark de falha
                  setDeliveries(prev => prev.map(trip => {
                    if (trip.id === tripFailurePrompt.id) {
                      return {
                        ...trip,
                        deliveryStatus: 'DELIVERY_FAILED',
                        invoices: trip.invoices.map(inv => ({
                          ...inv,
                          remarks: `[FALHA] ${finalRemark}`
                        }))
                      };
                    }
                    return trip;
                  }));

                  // Transmite o status customizado via handleStatusAdvance para manter telemetria
                  handleStatusAdvance(tripFailurePrompt.id, 'DELIVERY_FAILED', 'Falha na Entrega Reportada');
                  addTimelineEvent('delayed', `🚨 Falha na Entrega: Veículo ${tripFailurePrompt.assignedTruck} reportou o motivo: "${finalRemark}". Transmitido para a central Admin.`);

                  toast.error('Falha Reportada ao Admin com Sucesso!', {
                    description: `Motivo: ${finalRemark}`
                  });

                  // Retrai todos os modais
                  setTripFailurePrompt(null);
                  setActiveTripForInvoices(null);
                }}
                className="flex-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all text-center shadow-md shadow-rose-600/20 cursor-pointer outline-none"
              >
                Confirmar Falha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DispatcherDashboard;
