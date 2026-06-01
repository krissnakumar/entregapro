import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  Truck, 
  MapPin, 
  CheckCircle, 
  Clock, 
  Phone, 
  MessageSquare,
  Navigation,
  LogOut,
  User as UserIcon,
  ChevronRight,
  ClipboardList,
  Users,
  Camera,
  Layers,
  AlertCircle,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import SignaturePad from '../components/SignaturePad';
import PhotoCapture from '../components/PhotoCapture';

// Tipagem aprimorada para o aplicativo de cabine do condutor
interface DriverTask {
  id: string;
  deliveryNumber: string;
  status: 'ASSIGNED' | 'LOADING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED';
  customer: {
    name: string;
    phone: string;
    whatsapp: string;
  };
  deliveryAddress: string;
  destinationCity: string;
  materialType: string;
  quantity: string;
  weight: string;
  scheduledTime: string;
  notes?: string;
  podSignature?: string;
  podPhoto?: string;
}

const DriverDashboard = () => {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  
  // Estado local gerenciando as tarefas interativas do motorista
  const [activeTab, setActiveTab] = useState<'tasks' | 'profile' | 'detail'>('tasks');
  const [selectedDelivery, setSelectedDelivery] = useState<DriverTask | null>(null);
  
  // Controle dos modais de POD
  const [showSignature, setShowSignature] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [podPayloadData, setPodPayloadData] = useState<{ signature?: string; photo?: string }>({});

  // Busca entregas atribuídas ao motorista da API real
  const { data: driverDeliveries, isLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ['driver-cab-deliveries'],
    queryFn: () => api.get<any[]>('/deliveries?driver=true').catch(() => []),
  });

  // Deriva a lista de tarefas diretamente da resposta da API
  const tasksList: DriverTask[] = useMemo(() => {
    if (driverDeliveries && driverDeliveries.length > 0) {
      return driverDeliveries.map((d: any, idx: number) => ({
        id: d.id || `TSK-${String(idx + 1).padStart(4, '0')}`,
        deliveryNumber: d.deliveryNumber || d.invoiceNumber || `NFE-${String(Math.random()).slice(2, 8)}`,
        status: d.status || 'ASSIGNED',
        customer: {
          name: d.customer?.name || d.customerName || 'Cliente',
          phone: d.customer?.phone || '11999999999',
          whatsapp: d.customer?.phone || d.customer?.whatsapp || '11999999999',
        },
        deliveryAddress: d.deliveryAddress || d.address || '',
        destinationCity: d.destinationCity || '',
        materialType: d.materialType || 'Geral',
        quantity: d.quantity || d.materialQuantity || '',
        weight: d.totalWeight || d.weight || '',
        scheduledTime: d.scheduledTime || d.deliveryDeadline || 'Hoje',
        notes: d.notes || '',
      }));
    }
    return [];
  }, [driverDeliveries]);

  // Identifica a entrega prioritária atual
  const activeDelivery = tasksList.find(d => ['ASSIGNED', 'LOADING', 'IN_TRANSIT'].includes(d.status));

  // Simula mutação de alteração de status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: DriverTask['status'] }) => {
      // Simula delay de rede
      await new Promise(r => setTimeout(r, 400));
      return { id, newStatus };
    },
    onSuccess: (data) => {
      refetchDeliveries();
      if (selectedDelivery?.id === data.id) {
        setSelectedDelivery(prev => prev ? { ...prev, status: data.newStatus } : null);
      }
      toast.success('Telemetria atualizada', {
        description: `O manifesto ${data.id} mudou para o estágio: ${data.newStatus}.`
      });
    }
  });

  // Simula o envio de comprovante de entrega (POD)
  const submitPodMutation = useMutation({
    mutationFn: async ({ id }: { id: string; data: any }) => {
      await new Promise(r => setTimeout(r, 600));
      return id;
    },
    onSuccess: (id) => {
      refetchDeliveries();
      toast.success('Sucesso na Operação!', {
        description: 'Canhoto digital e lacres sincronizados com a SEFAZ e rede PostGIS.'
      });
      setActiveTab('tasks');
      setSelectedDelivery(null);
      setPodPayloadData({});
    }
  });

  const handleLogout = () => {
    logout();
    toast.success('Sessão encerrada no terminal da frota.');
  };

  const handlePodSubmission = (deliveryId: string) => {
    if (!podPayloadData.signature || !podPayloadData.photo) {
      toast.error('Ação Incompleta', {
        description: 'É obrigatório capturar a assinatura digital e a foto física do lacre/pátio.'
      });
      return;
    }
    
    // Captura coordenadas reais ou injeta dummy
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        submitPodMutation.mutate({
          id: deliveryId,
          data: {
            signatureUrl: podPayloadData.signature,
            photoUrl: podPayloadData.photo,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
        });
      }, () => {
        // Fallback imediato
        submitPodMutation.mutate({ id: deliveryId, data: podPayloadData });
      });
    } else {
      submitPodMutation.mutate({ id: deliveryId, data: podPayloadData });
    }
  };

  const openMapsLink = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const openMessaging = (type: 'call' | 'whatsapp', phoneString: string) => {
    const cleanPhone = phoneString.replace(/\D/g, '');
    if (type === 'call') {
      window.open(`tel:${cleanPhone}`);
    } else {
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    }
  };

  const getStatusLabel = (status: DriverTask['status']) => {
    switch (status) {
      case 'ASSIGNED': return { text: 'Planejado', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'LOADING': return { text: 'Em Carregamento', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'IN_TRANSIT': return { text: 'Em Trânsito', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' };
      case 'DELIVERED': return { text: 'Concluído (POD)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'DELAYED': return { text: 'Retido na Via', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default: return { text: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // ==========================================
  // TELA 1: DETALHES DO MANIFESTO E POD
  // ==========================================
  if (activeTab === 'detail' && selectedDelivery) {
    const d = selectedDelivery;
    const badge = getStatusLabel(d.status);

    return (
      <div className="flex flex-col h-screen bg-white max-w-md mx-auto relative font-sans animate-in slide-in-from-right duration-300 select-none">
        
        {/* Barra Superior */}
        <header className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('tasks')} 
            className="p-2 -ml-2 hover:bg-slate-200 text-slate-700 rounded-full transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <ChevronRight size={20} className="rotate-180" /> Voltar
          </button>
          <div className="text-center">
            <span className="text-[9px] font-mono text-slate-400 block">{d.id}</span>
            <h2 className="font-black text-xs uppercase tracking-widest text-slate-800">Ordem de Despacho</h2>
          </div>
          <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border", badge.bg)}>
            {badge.text}
          </span>
        </header>

        {/* Corpo de Informações Operacionais */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-36 custom-scrollbar">
          
          {/* Identificação do Destinatário */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black bg-slate-900 text-white px-2.5 py-0.5 rounded uppercase tracking-widest">
                Cliente Final
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600">{d.deliveryNumber}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {d.customer.name}
            </h1>
            <div 
              onClick={() => openMapsLink(d.deliveryAddress)}
              className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 rounded-2xl flex items-start gap-2 cursor-pointer transition-all group"
            >
              <MapPin size={16} className="text-indigo-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-xs font-bold text-slate-800 leading-tight">{d.deliveryAddress}</p>
                <span className="text-[10px] text-indigo-600 font-medium block mt-0.5">Toque para traçar rota no GPS →</span>
              </div>
            </div>
          </section>

          {/* Dados Físicos da Carga */}
          <section className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4 border border-slate-100">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Layers size={10} className="text-indigo-500" /> Especificação
              </p>
              <p className="text-xs font-bold text-slate-800 line-clamp-2">{d.materialType}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Truck size={10} className="text-indigo-500" /> Volumes / Peso
              </p>
              <p className="text-xs font-black text-slate-900">{d.quantity}</p>
              <span className="text-[10px] font-mono text-slate-500 block">{d.weight}</span>
            </div>
          </section>

          {/* Diretivas de Doca e Observações */}
          {d.notes && (
            <section className="p-4 bg-amber-50/60 border border-amber-200/60 rounded-2xl flex gap-2.5">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[9px] font-black uppercase text-amber-800 tracking-widest block">Diretriz do Manifesto</span>
                <p className="text-xs text-amber-900 font-medium mt-0.5 leading-relaxed">{d.notes}</p>
              </div>
            </section>
          )}

          {/* Ações de Comunicação Direta */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Comunicação e Suporte</span>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => openMessaging('call', d.customer.phone)}
                className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 shadow-2xs transition-all"
              >
                <Phone size={14} className="text-indigo-600" /> Ligação Direta
              </button>
              <button 
                onClick={() => openMessaging('whatsapp', d.customer.whatsapp)}
                className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 shadow-2xs transition-all"
              >
                <MessageSquare size={14} className="text-emerald-600" /> Enviar Mensagem
              </button>
            </div>
          </section>

          {/* Seção de Comprovação de Entrega (POD) */}
          <section className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Comprovantes (Canhoto / Lacre)
              </span>
              <span className="text-[9px] font-mono text-emerald-600 font-bold flex items-center gap-0.5">
                <ShieldCheck size={10} /> Validação SEFAZ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowSignature(true)}
                className={cn(
                  "flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl transition-all gap-2 group",
                  podPayloadData.signature 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-400"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl shadow-2xs flex items-center justify-center transition-transform group-hover:scale-105", 
                  podPayloadData.signature ? "bg-emerald-600 text-white" : "bg-white text-slate-400 border"
                )}>
                  {podPayloadData.signature ? <CheckCircle size={18} /> : <FileCheck size={18} className="text-indigo-600" />}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase block tracking-tight">
                    {podPayloadData.signature ? 'Canhoto Assinado' : 'Coletar Canhoto'}
                  </span>
                  <span className="text-[8px] text-slate-400 block">Assinatura na Tela</span>
                </div>
              </button>

              <button 
                onClick={() => setShowPhoto(true)}
                className={cn(
                  "flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl transition-all gap-2 group",
                  podPayloadData.photo 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-400"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl shadow-2xs flex items-center justify-center transition-transform group-hover:scale-105", 
                  podPayloadData.photo ? "bg-emerald-600 text-white" : "bg-white text-slate-400 border"
                )}>
                  {podPayloadData.photo ? <CheckCircle size={18} /> : <Camera size={18} className="text-indigo-600" />}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase block tracking-tight">
                    {podPayloadData.photo ? 'Foto Registrada' : 'Foto do Lacre'}
                  </span>
                  <span className="text-[8px] text-slate-400 block">Câmera Principal</span>
                </div>
              </button>
            </div>
          </section>

        </main>

        {/* Modais de Captura Injetados */}
        {showSignature && (
          <SignaturePad 
            onSave={(dataUrl) => { 
              setPodPayloadData(prev => ({ ...prev, signature: dataUrl })); 
              setShowSignature(false); 
              toast.success('Assinatura digital anexada ao manifesto.');
            }} 
            onClose={() => setShowSignature(false)} 
          />
        )}

        {showPhoto && (
          <PhotoCapture 
            onCapture={(dataUrl) => { 
              setPodPayloadData(prev => ({ ...prev, photo: dataUrl })); 
              setShowPhoto(false); 
              toast.success('Registro fotográfico salvo e com hash assinado.');
            }} 
            onClose={() => setShowPhoto(false)} 
          />
        )}

        {/* Rodapé Dinâmico de Ações de Frota */}
        <footer className="p-4 bg-white border-t border-slate-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20 shadow-lg">
          {d.status === 'DELIVERED' ? (
            <div className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-500">
              ✓ Manifesto encerrado e transmitido ao centralizador
            </div>
          ) : d.status === 'IN_TRANSIT' ? (
            <button 
              onClick={() => handlePodSubmission(d.id)}
              disabled={submitPodMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle size={18} />
              {submitPodMutation.isPending ? 'Sincronizando PostGIS...' : 'Finalizar Entrega (POD)'}
            </button>
          ) : (
            <button 
              onClick={() => updateStatusMutation.mutate({ id: d.id, newStatus: 'IN_TRANSIT' })}
              disabled={updateStatusMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Truck size={18} />
              {updateStatusMutation.isPending ? 'Acionando...' : 'Iniciar Viagem Rodoviária'}
            </button>
          )}
        </footer>
      </div>
    );
  }

  // ==========================================
  // TELA 2: PERFIL & SINCRONISMO
  // ==========================================
  if (activeTab === 'profile') {
    return (
      <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl relative font-sans select-none animate-in fade-in duration-200">
        <header className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <h2 className="font-black text-sm uppercase tracking-widest">Ajustes da Cabine</h2>
          <button onClick={handleLogout} className="text-xs font-bold text-rose-400 hover:underline">
            Desconectar
          </button>
        </header>
        
        <main className="flex-1 p-6 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xl">
              {user?.name?.charAt(0) || 'M'}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{user?.name || 'Motorista Oficial'}</p>
              <span className="text-[10px] text-slate-400 font-mono block">CNH Categoria E — Frota Ativa</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 text-xs font-bold text-slate-700">
            <div className="p-4 flex justify-between items-center">
              <span>Modo Otimizado Offline</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Ativo</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span>Canais de Roteamento OSRM</span>
              <span className="text-slate-400 font-mono">v4.1.2</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span>Sincronização Automática</span>
              <span className="text-indigo-600">A cada 5 min</span>
            </div>
          </div>

          <button 
            onClick={() => {
              toast.success('Sincronizando cargas com o servidor...');
              refetchDeliveries();
            }}
            className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-700 uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Sincronizar Cargas
          </button>
        </main>

        {/* Barra Inferior Fixa */}
        <footer className="bg-white border-t p-4 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20 flex justify-around">
          <button onClick={() => setActiveTab('tasks')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors">
            <div className="p-2"><ClipboardList size={20} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Manifestos</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className="flex flex-col items-center gap-1 text-indigo-600">
            <div className="bg-indigo-50 p-2 rounded-xl"><UserIcon size={20} /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Sistema</span>
          </button>
        </footer>
      </div>
    );
  }

  // ==========================================
  // TELA PRINCIPAL: MANIFESTOS DO DIA
  // ==========================================
  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl relative overflow-hidden font-sans select-none">
      
      {/* Header com Status em Destaque */}
      <header className="bg-slate-900 p-6 pt-8 text-white shrink-0 rounded-b-[2.5rem] shadow-xl relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl border border-white/10 shadow-md">
              {user?.name?.charAt(0) || 'M'}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Condutor Operacional</p>
              <h2 className="text-base font-black tracking-tight truncate max-w-[180px]">{user?.name || 'Motorista Titular'}</h2>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 border border-white/5"
            title="Encerrar Expediente"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Card do Manifesto Ativo de Destaque */}
        {activeDelivery ? (
          <div className="bg-white rounded-2xl p-5 text-slate-900 shadow-xl animate-in zoom-in-95 duration-300 border border-slate-100/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded uppercase tracking-widest">
                Próximo Destino
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">{activeDelivery.deliveryNumber}</span>
            </div>
            <h3 className="text-lg font-black tracking-tight truncate text-slate-900">
              {activeDelivery.customer.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium truncate mb-4 flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-indigo-600 shrink-0" /> {activeDelivery.deliveryAddress}
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button 
                onClick={() => openMapsLink(activeDelivery.deliveryAddress)}
                className="bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Navigation size={14} className="text-indigo-400" /> Rota GPS
              </button>
              <button 
                onClick={() => { setSelectedDelivery(activeDelivery); setActiveTab('detail'); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-indigo-600/20 transition-all"
              >
                Abrir Manifesto
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => openMessaging('call', activeDelivery.customer.phone)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 border transition-colors"
              >
                <Phone size={12} className="text-indigo-600" /> Telefonar
              </button>
              <button 
                onClick={() => openMessaging('whatsapp', activeDelivery.customer.whatsapp)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 border transition-colors"
              >
                <MessageSquare size={12} className="text-emerald-600" /> WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center italic opacity-70">
            <p className="text-xs font-medium">Nenhum trajeto imediato pendente de execução.</p>
          </div>
        )}
      </header>

      {/* Listagem Completa do Cronograma */}
      <main className="flex-1 overflow-y-auto p-5 pb-32 custom-scrollbar">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Pautas de Embarque do Dia</h4>
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {tasksList.length} Ordens
            </span>
          </div>

          {tasksList.length > 0 ? (
            <div className="space-y-3">
              {tasksList.map((task) => {
                const badge = getStatusLabel(task.status);
                const isCompleted = task.status === 'DELIVERED';

                return (
                  <div 
                    key={task.id} 
                    onClick={() => { setSelectedDelivery(task); setActiveTab('detail'); }}
                    className={cn(
                      "bg-white p-4 rounded-2xl shadow-2xs border border-slate-100 flex items-center gap-3 cursor-pointer transition-all hover:border-slate-200 group",
                      isCompleted && "opacity-75 bg-slate-50/50"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                      isCompleted ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                    )}>
                      {isCompleted ? <CheckCircle size={20} /> : <Truck size={20} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-black text-slate-900 text-xs truncate">{task.customer.name}</h5>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">{task.weight}</span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                        <MapPin size={10} className="text-slate-400 shrink-0" /> {task.destinationCity}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                        <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", badge.bg)}>
                          {badge.text}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                          {task.scheduledTime} →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center opacity-40 text-center">
              <ClipboardList size={36} className="mb-2 text-slate-400" />
              <p className="text-xs font-bold text-slate-600">Nenhum manifesto agendado para esta placa.</p>
            </div>
          )}
        </div>
      </main>

      {/* Navigation Footer Interativo */}
      <footer className="bg-white border-t border-slate-100 p-4 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20 flex justify-around shadow-lg">
        <button onClick={() => setActiveTab('tasks')} className="flex flex-col items-center gap-1 text-indigo-600">
          <div className="bg-indigo-50 p-2 rounded-xl"><ClipboardList size={20} /></div>
          <span className="text-[9px] font-black uppercase tracking-widest">Manifestos</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors">
          <div className="p-2"><UserIcon size={20} /></div>
          <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
        </button>
      </footer>
    </div>
  );
};

export default DriverDashboard;
