import React, { useState, useMemo } from 'react';
import { 
  Files, 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  Download, 
  Search, 
  X, 
  MapPin, 
  Truck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Navigation, 
  Layers, 
  Compass, 
  BarChart3, 
  Activity, 
  SlidersHorizontal, 
  Filter, 
  Camera, 
  History, 
  FileCheck,
  PackageCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// ==========================================
// INTERFACES & TIPAGENS EXCLUSIVAS DE LOGÍSTICA
// (Sem receita ou lucro de faturamento)
// ==========================================
interface OperationalInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  deliveryStatus: 'ASSIGNED' | 'PLANNED' | 'LOADING' | 'AWAITING_DISPATCH' | 'IN_TRANSIT' | 'DELIVERED' | 'COMPLETED' | 'DELAYED' | 'FAILED' | 'EMERGENCY' | 'UNDER_REVIEW';
  priorityLevel: 'BAIXA' | 'NORMAL' | 'ALTA' | 'CRÍTICA';
  dispatcherName: string;
  assignedDriver: string;
  driverAssistant: string;
  assignedTruck: string;
  truckPlateNumber: string;
  materialType: string;
  materialQuantity: string;
  totalWeight: string;
  volume: string;
  deliveryDistance: number;
  estimatedFuelCost: number;
  operationalCost: number;
  dispatchTime: string;
  deliveryDeadline: string;
  currentStage: string;
  gpsStatus: 'ATIVO' | 'FALHANDO' | 'OFFLINE';
  podStatus: 'ASSINADO' | 'PENDENTE' | 'RECUSADO';
  completionPercent: number;
  routeType: 'RODOVIA_EXPRESSA' | 'MISTA_URBANA' | 'SERRA_PESADA' | 'INTERESTADUAL';
  delayStatus: 'NO_PRAZO' | 'ATRASADO_TRANSITO' | 'DOCA_LOTADA' | 'QUEBRA_FROTA';
  createdDate: string;
  destinationCity: string;
  address: string;
  warehouseLocation: string;
  stopCount: number;
  emptyReturnKm: number;
  litersFuelUsed: number;
  dieselPrice: number;
  driverSalaryAlloc: number;
  assistantPayAlloc: number;
  maintenanceAlloc: number;
  palletCount: number;
  isFragile: boolean;
  isHazardous: boolean;
  ocrTranscript: string;
  auditLogs: Array<{ time: string; user: string; action: string; notes: string }>;
  timelineEvents: Array<{ time: string; title: string; desc: string; user: string; status: string }>;
}

// ==========================================
// DADOS OPERACIONAIS 100% LIMPOS (pt-BR)
// ==========================================
const mockEnterpriseInvoices: OperationalInvoice[] = [
  {
    id: 'OP-2026-901',
    invoiceNumber: 'NFE-554210',
    customerName: 'Votorantim Cimentos S.A.',
    deliveryStatus: 'IN_TRANSIT',
    priorityLevel: 'CRÍTICA',
    dispatcherName: 'Carlos M. Albuquerque',
    assignedDriver: 'Roberto V. Alcantara',
    driverAssistant: 'Márcio Silva',
    assignedTruck: 'Scania R540 6x4 (Bitrem)',
    truckPlateNumber: 'BRA-2E19',
    materialType: 'Cimento Portland CP-II (Granel)',
    materialQuantity: '450 Sacos / 30 Paletes',
    totalWeight: '32.5 Toneladas',
    volume: '24.0 m³',
    deliveryDistance: 420,
    estimatedFuelCost: 1450.00,
    operationalCost: 3200.00,
    dispatchTime: '05:30',
    deliveryDeadline: '18:00 Hoje',
    currentStage: 'Passagem por Balança Fiscal (Guarulhos)',
    gpsStatus: 'ATIVO',
    podStatus: 'PENDENTE',
    completionPercent: 68,
    routeType: 'RODOVIA_EXPRESSA',
    delayStatus: 'NO_PRAZO',
    createdDate: '2026-05-13',
    destinationCity: 'São Paulo - SP',
    address: 'Av. das Nações Unidas, 14171 - Doca 4',
    warehouseLocation: 'CD Cajamar Principal',
    stopCount: 2,
    emptyReturnKm: 180,
    litersFuelUsed: 220,
    dieselPrice: 5.95,
    driverSalaryAlloc: 450.00,
    assistantPayAlloc: 200.00,
    maintenanceAlloc: 380.00,
    palletCount: 30,
    isFragile: false,
    isHazardous: false,
    ocrTranscript: 'NF-e PROCESSADA: SEFAZ AUTORIZADA. PROTOCOLO: 135260001234567. CARGA SECA PESADA DESTINADA A CONSTRUÇÃO CIVIL.',
    auditLogs: [
      { time: '05:00', user: 'Sistema Automático', action: 'Geração do Payload Fiscal', notes: 'Importado de ERP com sucesso.' },
      { time: '05:15', user: 'Carlos M.', action: 'Orquestração de Frota', notes: 'Atribuição manual do veículo BRA-2E19.' },
      { time: '05:30', user: 'Portaria CD', action: 'Liberação de Cancela', notes: 'Lacres conferidos: L-99812, L-99813.' }
    ],
    timelineEvents: [
      { time: '05:00', title: 'Manifesto Emitido', desc: 'Sincronização com docas concluída', user: 'Sistema', status: 'done' },
      { time: '05:15', title: 'Carregamento Concluído', desc: '32.5 Toneladas embarcadas', user: 'Doca 2', status: 'done' },
      { time: '05:30', title: 'Saída Autorizada', desc: 'Motorista assumiu o volante', user: 'Portaria', status: 'done' },
      { time: '09:45', title: 'Ponto de Controle de Rota', desc: 'Velocidade de cruzeiro estável na Dutra', user: 'Telemetria', status: 'current' },
      { time: '18:00', title: 'Previsão de Chegada e POD', desc: 'Assinatura digital via tablet', user: 'Cliente Final', status: 'pending' }
    ]
  },
  {
    id: 'OP-2026-902',
    invoiceNumber: 'NFE-554211',
    customerName: 'Gerdau Aços Longos',
    deliveryStatus: 'LOADING',
    priorityLevel: 'ALTA',
    dispatcherName: 'Mariana Souza Dias',
    assignedDriver: 'Fernando Assis',
    driverAssistant: 'Nenhum',
    assignedTruck: 'Volvo FH 460 (Carreta Prancha)',
    truckPlateNumber: 'BRA-8F22',
    materialType: 'Vergalhão de Aço CA50 10mm',
    materialQuantity: '180 Feixes',
    totalWeight: '28.0 Toneladas',
    volume: '15.0 m³',
    deliveryDistance: 150,
    estimatedFuelCost: 620.00,
    operationalCost: 1800.00,
    dispatchTime: 'Aguardando',
    deliveryDeadline: 'Amanhã 12:00',
    currentStage: 'Fixação de Cintas de Segurança',
    gpsStatus: 'ATIVO',
    podStatus: 'PENDENTE',
    completionPercent: 25,
    routeType: 'SERRA_PESADA',
    delayStatus: 'DOCA_LOTADA',
    createdDate: '2026-05-13',
    destinationCity: 'Campinas - SP',
    address: 'Rodovia Anhangüera, Km 98 - Galpão Industrial',
    warehouseLocation: 'Usina Gerdau Araçariguama',
    stopCount: 1,
    emptyReturnKm: 150,
    litersFuelUsed: 95,
    dieselPrice: 5.95,
    driverSalaryAlloc: 300.00,
    assistantPayAlloc: 0.00,
    maintenanceAlloc: 250.00,
    palletCount: 12,
    isFragile: false,
    isHazardous: false,
    ocrTranscript: 'NF-e PROCESSADA: PRODUTO SIDERÚRGICO LONGO. EXIGE AMARRAÇÃO COM CORRENTES DE GRAU 8.',
    auditLogs: [
      { time: '06:30', user: 'Mariana S.', action: 'Agendamento de Pátio', notes: 'Veículo posicionado na prancha de carregamento.' }
    ],
    timelineEvents: [
      { time: '06:00', title: 'Ordem Recebida', desc: 'Integração EDI ativada', user: 'Sistema', status: 'done' },
      { time: '07:00', title: 'Carregamento em Andamento', desc: 'Guindaste operando carga pesada', user: 'Operador Pátio', status: 'current' }
    ]
  },
  {
    id: 'OP-2026-903',
    invoiceNumber: 'CTE-881203',
    customerName: 'Ambev Distribuição e Logística',
    deliveryStatus: 'DELIVERED',
    priorityLevel: 'NORMAL',
    dispatcherName: 'Carlos M. Albuquerque',
    assignedDriver: 'Jorge L. Peixoto',
    driverAssistant: 'Lucas Mendes',
    assignedTruck: 'Mercedes-Benz Atego 2426 (Sider)',
    truckPlateNumber: 'BRA-1A05',
    materialType: 'Carga Paletizada de Bebidas',
    materialQuantity: '24 Paletes Fechados',
    totalWeight: '14.2 Toneladas',
    volume: '38.0 m³',
    deliveryDistance: 85,
    estimatedFuelCost: 290.00,
    operationalCost: 950.00,
    dispatchTime: '04:00',
    deliveryDeadline: '10:00 Hoje',
    currentStage: 'Descarregamento Finalizado (Canhoto Digitalizado)',
    gpsStatus: 'ATIVO',
    podStatus: 'ASSINADO',
    completionPercent: 100,
    routeType: 'MISTA_URBANA',
    delayStatus: 'NO_PRAZO',
    createdDate: '2026-05-13',
    destinationCity: 'Jundiaí - SP',
    address: 'Av. Itavuvu, 3000 - Centro Logístico',
    warehouseLocation: 'CD Jacareí Principal',
    stopCount: 3,
    emptyReturnKm: 85,
    litersFuelUsed: 48,
    dieselPrice: 5.95,
    driverSalaryAlloc: 220.00,
    assistantPayAlloc: 120.00,
    maintenanceAlloc: 180.00,
    palletCount: 24,
    isFragile: true,
    isHazardous: false,
    ocrTranscript: 'CT-e FINALIZADO. COMPROVANTE DE ENTREGA ASSINADO POR: GERENTE DE LOGÍSTICA (MATRÍCULA 8821).',
    auditLogs: [
      { time: '10:15', user: 'Jorge L.', action: 'Captura de POD', notes: 'Foto do canhoto e geolocalização salvas no PostGIS.' }
    ],
    timelineEvents: [
      { time: '04:00', title: 'Saída da Base', desc: 'Rota de distribuição matinal', user: 'Portaria', status: 'done' },
      { time: '09:30', title: 'Chegada ao Alvo', desc: 'Início da conferência de vasilhames', user: 'Cliente', status: 'done' },
      { time: '10:15', title: 'Entrega Concluída', desc: 'Canhoto auditado eletronicamente', user: 'Jorge L.', status: 'done' }
    ]
  },
  {
    id: 'OP-2026-904',
    invoiceNumber: 'NFE-554219',
    customerName: 'Bayer S.A. (Divisão Agrícola)',
    deliveryStatus: 'DELAYED',
    priorityLevel: 'CRÍTICA',
    dispatcherName: 'Mariana Souza Dias',
    assignedDriver: 'Sérgio Ramos',
    driverAssistant: 'Antônio Costa',
    assignedTruck: 'DAF XF 530 (Baú Blindado)',
    truckPlateNumber: 'BRA-9X11',
    materialType: 'Defensivos Agrícolas Classificados',
    materialQuantity: '12 IBCs / Contêineres',
    totalWeight: '16.0 Toneladas',
    volume: '20.0 m³',
    deliveryDistance: 680,
    estimatedFuelCost: 2400.00,
    operationalCost: 5100.00,
    dispatchTime: 'Ontem 22:00',
    deliveryDeadline: '14:00 Hoje',
    currentStage: 'Parada Policial / Fiscalização Rodoviária Prolongada',
    gpsStatus: 'ATIVO',
    podStatus: 'PENDENTE',
    completionPercent: 55,
    routeType: 'INTERESTADUAL',
    delayStatus: 'ATRASADO_TRANSITO',
    createdDate: '2026-05-12',
    destinationCity: 'Ribeirão Preto - SP',
    address: 'Rodovia Anhanguera, Km 318 - Armazém Químico',
    warehouseLocation: 'CD Paulínia Hub',
    stopCount: 1,
    emptyReturnKm: 680,
    litersFuelUsed: 380,
    dieselPrice: 5.95,
    driverSalaryAlloc: 800.00,
    assistantPayAlloc: 400.00,
    maintenanceAlloc: 750.00,
    palletCount: 12,
    isFragile: false,
    isHazardous: true,
    ocrTranscript: 'ATENÇÃO: CARGA PERIGOSA CLASSE 9. LICENÇA IBAMA E PAINEL DE SEGURANÇA OBRIGATÓRIOS.',
    auditLogs: [
      { time: '08:00', user: 'Sérgio R.', action: 'Notificação de Retenção', notes: 'Fiscalização de rotina na divisa. Previsão de liberação em 2h.' }
    ],
    timelineEvents: [
      { time: 'Ontem', title: 'Carregamento Químico', desc: 'Inspeção de lacres de alta segurança', user: 'Doca Q', status: 'done' },
      { time: '08:00', title: 'Alerta de Parada Prolongada', desc: 'Veículo imobilizado na rodovia', user: 'Telemetria', status: 'current' }
    ]
  }
];

export const InvoicesPage: React.FC = () => {
  const [invoicesList, setInvoicesList] = useState<OperationalInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<OperationalInvoice | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>('overview');
  
  // Motores de Busca e Filtros Globais
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [customKmRange, setCustomKmRange] = useState<number>(1000);

  // Exibição Limpa de Colunas
  const [visibleColumns, setVisibleColumns] = useState({
    invoiceNumber: true,
    customerName: true,
    deliveryStatus: true,
    priorityLevel: true,
    assignedTruck: true,
    truckPlateNumber: true,
    assignedDriver: true,
    materialType: true,
    totalWeight: true,
    deliveryDistance: true,
    currentStage: true,
    podStatus: true,
    createdDate: false,
    dispatcherName: false,
    estimatedFuelCost: false,
    operationalCost: false
  });

  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  // Filtragem Otimizada sem Vínculos de Receita
  const filteredRecords = useMemo(() => {
    return invoicesList.filter(inv => {
      if (statusFilter !== 'ALL' && inv.deliveryStatus !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && inv.priorityLevel !== priorityFilter) return false;
      if (inv.deliveryDistance > customKmRange) return false;

      if (!globalSearch.trim()) return true;
      const term = globalSearch.toLowerCase();
      
      return (
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.customerName.toLowerCase().includes(term) ||
        inv.assignedDriver.toLowerCase().includes(term) ||
        inv.driverAssistant.toLowerCase().includes(term) ||
        inv.dispatcherName.toLowerCase().includes(term) ||
        inv.assignedTruck.toLowerCase().includes(term) ||
        inv.truckPlateNumber.toLowerCase().includes(term) ||
        inv.materialType.toLowerCase().includes(term) ||
        inv.destinationCity.toLowerCase().includes(term) ||
        inv.address.toLowerCase().includes(term) ||
        inv.currentStage.toLowerCase().includes(term) ||
        inv.ocrTranscript.toLowerCase().includes(term) ||
        inv.totalWeight.toLowerCase().includes(term)
      );
    });
  }, [invoicesList, globalSearch, statusFilter, priorityFilter, customKmRange]);

  // Cálculos Exclusivos de Volume, Custos Rodoviários e Entregas Ativas
  const kpis = useMemo(() => {
    let totalInvoices = invoicesList.length;
    let activeDeliveries = invoicesList.filter(i => ['IN_TRANSIT', 'LOADING'].includes(i.deliveryStatus)).length;
    let completedInvoices = invoicesList.filter(i => i.deliveryStatus === 'DELIVERED').length;
    let delayedDeliveries = invoicesList.filter(i => i.deliveryStatus === 'DELAYED').length;
    let pendingDispatch = invoicesList.filter(i => ['ASSIGNED', 'PLANNED'].includes(i.deliveryStatus)).length;
    
    let totalWeightTon = invoicesList.reduce((acc, curr) => acc + parseFloat(curr.totalWeight), 0);
    let totalDistanceKm = invoicesList.reduce((acc, curr) => acc + curr.deliveryDistance, 0);
    let totalFuelEst = invoicesList.reduce((acc, curr) => acc + curr.estimatedFuelCost, 0);
    let totalOperationalCost = invoicesList.reduce((acc, curr) => acc + curr.operationalCost, 0);
    let failedDeliveries = invoicesList.filter(i => i.deliveryStatus === 'FAILED').length;

    return {
      totalInvoices,
      activeDeliveries,
      completedInvoices,
      delayedDeliveries,
      pendingDispatch,
      totalWeightTon: totalWeightTon.toFixed(1),
      totalDistanceKm,
      totalFuelEst,
      totalOperationalCost,
      failedDeliveries
    };
  }, [invoicesList]);

  const getStatusBadge = (status: OperationalInvoice['deliveryStatus']) => {
    switch(status) {
      case 'ASSIGNED':
      case 'PLANNED':
        return { label: 'Planejado / Atribuído', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
      case 'LOADING':
      case 'AWAITING_DISPATCH':
        return { label: 'Carregando nas Docas', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse' };
      case 'IN_TRANSIT':
        return { label: 'Em Trânsito Rodoviário', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' };
      case 'DELIVERED':
      case 'COMPLETED':
        return { label: 'Entrega Concluída (POD)', bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' };
      case 'DELAYED':
        return { label: 'Retido / Em Atraso', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
      case 'FAILED':
      case 'EMERGENCY':
        return { label: 'Sinistro / Falha Crítica', bg: 'bg-red-600 text-white border-red-700 font-black', dot: 'bg-white' };
      case 'UNDER_REVIEW':
        return { label: 'Auditoria de Manifesto', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const getPriorityBadge = (priority: OperationalInvoice['priorityLevel']) => {
    switch(priority) {
      case 'CRÍTICA': return 'bg-rose-500 text-white font-black px-2 py-0.5 rounded text-[9px] tracking-widest';
      case 'ALTA': return 'bg-amber-500 text-white font-bold px-2 py-0.5 rounded text-[9px] tracking-widest';
      case 'NORMAL': return 'bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[9px] border';
      default: return 'bg-slate-50 text-slate-500 px-2 py-0.5 rounded text-[9px]';
    }
  };

  const handleExport = (type: 'PDF' | 'EXCEL' | 'CSV') => {
    toast.success(`Exportando ${filteredRecords.length} relatórios logísticos no formato ${type}...`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* Header Corporativo de Entrega */}
      <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest rounded-lg border border-primary/20">
              Centro de Inteligência de Entrega
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-lg border">
              Monitoramento 360° em Tempo Real
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Gestão de Manifestos & Orquestração de Frota
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl leading-relaxed">
            Consolidação operacional ligando veículos alocados, condutores em rota rodoviária, canhotos digitais de entrega e consumo de combustível com alta rastreabilidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button 
            onClick={() => handleExport('EXCEL')}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-primary/40 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-2xs flex items-center gap-2"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" /> Exportar Planilha
          </button>
          <button 
            onClick={() => handleExport('PDF')}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-primary/40 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-2xs flex items-center gap-2"
          >
            <Files size={16} className="text-rose-600" /> Relatório Operacional
          </button>
          <button 
            onClick={() => {
              toast.success('Sincronizando fila de despachos e geolocalizações no PostGIS...');
              setInvoicesList([...invoicesList]);
            }}
            className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            title="Sincronizar Ledger"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Array Limpo de Indicadores Operacionais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
        
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-indigo-600">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Manifestos Hoje</p>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis.totalInvoices} Ordens</p>
          <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded block w-fit mt-1">Pátio Mapeado</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entregas Ativas</p>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis.activeDeliveries} Cargas</p>
          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded block w-fit mt-1">Em trânsito</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Canhotos Concluídos</p>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis.completedInvoices} PODs</p>
          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded block w-fit mt-1">Não-repúdio OK</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-rose-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entregas em Atraso</p>
          <p className="text-xl font-black text-rose-600 mt-1">{kpis.delayedDeliveries} Alertas</p>
          <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded block w-fit mt-1">SLA sob risco</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-blue-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Despacho Pendente</p>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis.pendingDispatch} Frotas</p>
          <span className="text-[8px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded block w-fit mt-1">Aguardando doca</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-purple-600">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Peso Embarcado</p>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis.totalWeightTon}t</p>
          <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded block w-fit mt-1">Balança central</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-slate-800">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Distância Total</p>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis.totalDistanceKm} Km</p>
          <span className="text-[8px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded block w-fit mt-1">Trajetos OSRM</span>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all border-l-4 border-l-teal-600">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Custo Diesel Est.</p>
          <p className="text-xl font-black text-teal-700 mt-1 font-mono">R$ {kpis.totalFuelEst}</p>
          <span className="text-[8px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded block w-fit mt-1">Alocação base</span>
        </div>

      </div>

      {/* Sistema Integrado de Filtragem Inteligente */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisa de Frota: Nº Fatura, Motorista, Assistente, Placa, Cidade, Produto, Status, Doca de Carga..."
              className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            {globalSearch && (
              <button onClick={() => setGlobalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)}
              className={cn(
                "px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-2xs flex items-center gap-2",
                isColumnConfigOpen && "bg-slate-900 text-white border-slate-900"
              )}
            >
              <SlidersHorizontal size={14} /> Colunas
            </button>

            {(globalSearch || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || customKmRange < 1000) && (
              <button 
                onClick={() => {
                  setGlobalSearch('');
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setCustomKmRange(1000);
                  toast.info('Restrições de filtro removidas.');
                }}
                className="px-3 py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-xs transition-all hover:bg-rose-100"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
           <div>
             <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 flex items-center gap-1">
               <Filter size={10} className="text-primary" /> Estágio / Status Logístico
             </label>
             <select
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none"
             >
               <option value="ALL">Todas as Categorias Rodoviárias</option>
               <option value="ASSIGNED">Atribuídos / Planejados</option>
               <option value="LOADING">Carregando em Pátio</option>
               <option value="IN_TRANSIT">Em Trânsito Ativo</option>
               <option value="DELIVERED">Entregas Validadas</option>
               <option value="DELAYED">Retenções Rodoviárias</option>
               <option value="FAILED">Falhas Operacionais</option>
             </select>
           </div>

           <div>
             <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 flex items-center gap-1">
               <AlertTriangle size={10} className="text-amber-500" /> Nível de Prioridade
             </label>
             <select
               value={priorityFilter}
               onChange={(e) => setPriorityFilter(e.target.value)}
               className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none"
             >
               <option value="ALL">Qualquer Nível de Urgência</option>
               <option value="CRÍTICA">Urgência CRÍTICA</option>
               <option value="ALTA">Urgência ALTA</option>
               <option value="NORMAL">Urgência NORMAL</option>
             </select>
           </div>

           <div>
             <div className="flex justify-between items-center mb-1.5">
               <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block flex items-center gap-1">
                 <Navigation size={10} className="text-indigo-500" /> Distância Operacional
               </label>
               <span className="text-xs font-mono font-bold text-primary">{customKmRange} Km</span>
             </div>
             <input 
               type="range" 
               min="50" 
               max="1000" 
               step="50"
               value={customKmRange}
               onChange={(e) => setCustomKmRange(Number(e.target.value))}
               className="w-full accent-primary cursor-pointer"
             />
           </div>
        </div>

        {isColumnConfigOpen && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
              Personalizar Colunas Visíveis
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.keys(visibleColumns).map((colKey) => {
                const isSelected = (visibleColumns as any)[colKey];
                return (
                  <button
                    key={colKey}
                    type="button"
                    onClick={() => setVisibleColumns(prev => ({ ...prev, [colKey]: !isSelected }))}
                    className={cn(
                      "p-2 text-left rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between",
                      isSelected ? "bg-white border-primary text-primary shadow-2xs" : "bg-slate-100 border-transparent text-slate-400 line-through"
                    )}
                  >
                    <span className="truncate">{colKey}</span>
                    <span className="w-2 h-2 rounded-full shrink-0 ml-1" style={{ backgroundColor: isSelected ? '#4f46e5' : '#cbd5e1' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Tabela Principal Otimizada */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                {visibleColumns.invoiceNumber && <th className="p-4 pl-6 sticky left-0 bg-slate-50 z-10">Chave / Fatura</th>}
                {visibleColumns.customerName && <th className="p-4">Cliente Destino</th>}
                {visibleColumns.deliveryStatus && <th className="p-4">Status Logístico</th>}
                {visibleColumns.priorityLevel && <th className="p-4">Prioridade</th>}
                {visibleColumns.assignedTruck && <th className="p-4">Veículo Alocado</th>}
                {visibleColumns.truckPlateNumber && <th className="p-4">Placa</th>}
                {visibleColumns.assignedDriver && <th className="p-4">Condutor Oficial</th>}
                {visibleColumns.materialType && <th className="p-4">Material / Quantidade</th>}
                {visibleColumns.totalWeight && <th className="p-4">Peso Rodoviário</th>}
                {visibleColumns.deliveryDistance && <th className="p-4">Raio OSRM</th>}
                {visibleColumns.currentStage && <th className="p-4">Estágio de Pátio / Trânsito</th>}
                {visibleColumns.podStatus && <th className="p-4">Status de POD</th>}
                {visibleColumns.createdDate && <th className="p-4">Emissão Inicial</th>}
                {visibleColumns.dispatcherName && <th className="p-4">Despachante Alocado</th>}
                {visibleColumns.estimatedFuelCost && <th className="p-4">Custo Combustível</th>}
                {visibleColumns.operationalCost && <th className="p-4">Despesa Acumulada</th>}
                <th className="p-4 pr-6 text-right sticky right-0 bg-slate-50 z-10">Inspeção Integrada</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <PackageCheck size={36} className="opacity-20 mb-3" />
                      <p className="font-bold">Nenhum manifesto atende às chaves e restrições fornecidas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((inv) => {
                  const badge = getStatusBadge(inv.deliveryStatus);
                  const isSelected = selectedInvoice?.id === inv.id;

                  return (
                    <tr 
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={cn(
                        "hover:bg-primary/[0.02] cursor-pointer transition-colors group whitespace-nowrap",
                        isSelected && "bg-primary/5 font-bold"
                      )}
                    >
                      {visibleColumns.invoiceNumber && (
                        <td className="p-4 pl-6 sticky left-0 bg-white group-hover:bg-slate-50 z-10 font-mono font-bold text-primary">
                          <div>{inv.invoiceNumber}</div>
                          <div className="text-[9px] text-slate-400 font-normal">{inv.id}</div>
                        </td>
                      )}

                      {visibleColumns.customerName && (
                        <td className="p-4">
                          <div className="font-black text-slate-900 truncate max-w-xs">{inv.customerName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-primary shrink-0" /> {inv.destinationCity}
                          </div>
                        </td>
                      )}

                      {visibleColumns.deliveryStatus && (
                        <td className="p-4">
                          <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1.5", badge.bg)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", badge.dot)} />
                            {badge.label}
                          </span>
                        </td>
                      )}

                      {visibleColumns.priorityLevel && (
                        <td className="p-4">
                          <span className={getPriorityBadge(inv.priorityLevel)}>{inv.priorityLevel}</span>
                        </td>
                      )}

                      {visibleColumns.assignedTruck && <td className="p-4 font-bold text-slate-800">{inv.assignedTruck}</td>}
                      {visibleColumns.truckPlateNumber && <td className="p-4 font-mono text-slate-600 bg-slate-50 rounded px-1">{inv.truckPlateNumber}</td>}

                      {visibleColumns.assignedDriver && (
                        <td className="p-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Truck size={12} className="text-indigo-500" /> {inv.assignedDriver}
                          </div>
                          {inv.driverAssistant !== 'Nenhum' && <div className="text-[9px] text-slate-400 mt-0.5">Aux: {inv.driverAssistant}</div>}
                        </td>
                      )}

                      {visibleColumns.materialType && (
                        <td className="p-4 truncate max-w-xs">
                          <div className="font-bold text-slate-800">{inv.materialType}</div>
                          <div className="text-[9px] text-slate-400">{inv.materialQuantity}</div>
                        </td>
                      )}

                      {visibleColumns.totalWeight && <td className="p-4 font-mono font-bold text-slate-800">{inv.totalWeight}</td>}
                      {visibleColumns.deliveryDistance && <td className="p-4 font-mono">{inv.deliveryDistance} Km</td>}
                      {visibleColumns.currentStage && <td className="p-4 font-medium text-slate-600 truncate max-w-xs italic">{inv.currentStage}</td>}
                      
                      {visibleColumns.podStatus && (
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black tracking-widest",
                            inv.podStatus === 'ASSINADO' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {inv.podStatus}
                          </span>
                        </td>
                      )}

                      {visibleColumns.createdDate && <td className="p-4 font-mono">{inv.createdDate}</td>}
                      {visibleColumns.dispatcherName && <td className="p-4 text-slate-500">{inv.dispatcherName}</td>}
                      {visibleColumns.estimatedFuelCost && <td className="p-4 font-mono text-slate-500">R$ {inv.estimatedFuelCost}</td>}
                      {visibleColumns.operationalCost && <td className="p-4 font-mono font-bold text-slate-800">R$ {inv.operationalCost}</td>}

                      <td onClick={(e) => e.stopPropagation()} className="p-4 pr-6 text-right sticky right-0 bg-white group-hover:bg-slate-50 z-10">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all border shadow-2xs"
                        >
                          Detalhes 360°
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
          <div>Exibindo <strong className="text-slate-800">{filteredRecords.length}</strong> ordens rastreadas.</div>
          <span className="px-2 py-1 bg-white border rounded">Central Inteligente Ativa</span>
        </div>
      </div>

      {/* Console Detalhado Fullscreen (Sem Faturamento ou Margens de Lucro) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedInvoice(null)} />
          
          <div className="bg-white w-full max-w-7xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col h-[92vh]">
            
            <div className="p-5 px-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary text-white rounded-2xl shadow-md">
                  <Files size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{selectedInvoice.id}</span>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">/ {selectedInvoice.invoiceNumber}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedInvoice.customerName}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-700 border">
                  {selectedInvoice.deliveryStatus}
                </span>

                <button onClick={() => setSelectedInvoice(null)} className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="bg-slate-50/80 border-b border-slate-200/60 px-6 py-2 overflow-x-auto custom-scrollbar shrink-0">
              <div className="flex gap-1.5 min-w-max">
                {[
                  { id: 'overview', label: 'Resumo da Entrega', icon: BarChart3 },
                  { id: 'delivery_details', label: 'Rotas e Docas', icon: Navigation },
                  { id: 'fleet_details', label: 'Frota & Capacidade', icon: Truck },
                  { id: 'financials', label: 'Custos Logísticos', icon: Activity },
                  { id: 'materials', label: 'Carga & Verificação', icon: Layers },
                  { id: 'gps_tracking', label: 'Telemetria & Mapa', icon: Compass },
                  { id: 'documents', label: 'Documentos Oficiais', icon: FileCheck },
                  { id: 'photos', label: 'Fotos e Lacres', icon: Camera },
                  { id: 'fuel_logs', label: 'Abastecimento', icon: Activity },
                  { id: 'activity_timeline', label: 'Linha do Tempo', icon: Clock },
                  { id: 'audit_logs', label: 'Auditoria e Edições', icon: History }
                ].map((tab) => {
                  const isActive = activeDetailTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDetailTab(tab.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-black tracking-tight transition-all flex items-center gap-1.5 shrink-0",
                        isActive ? "bg-white text-primary shadow-2xs border border-slate-200/60" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
                      )}
                    >
                      <tab.icon size={14} className={isActive ? "text-primary" : "text-slate-400"} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
              
              {/* ABA 1: OVERVIEW */}
              {activeDetailTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black tracking-widest text-primary uppercase">Progresso Rodoviário da Frota</span>
                        <span className="font-mono font-black text-emerald-400 text-sm">{selectedInvoice.completionPercent}% Concluído</span>
                      </div>

                      <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${selectedInvoice.completionPercent}%` }} />
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
                        <span>Origem: {selectedInvoice.warehouseLocation}</span>
                        <span>Estágio: {selectedInvoice.currentStage}</span>
                        <span>Destino: {selectedInvoice.destinationCity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 bg-slate-50 border rounded-2xl space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Condutor Alocado</span>
                      <p className="text-xs font-black text-slate-900">{selectedInvoice.assignedDriver}</p>
                      <p className="text-[10px] text-slate-500">Auxiliar: {selectedInvoice.driverAssistant}</p>
                    </div>

                    <div className="p-5 bg-slate-50 border rounded-2xl space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Identificação do Veículo</span>
                      <p className="text-xs font-black text-slate-900">{selectedInvoice.assignedTruck}</p>
                      <p className="text-[10px] font-mono text-slate-500">Placa: {selectedInvoice.truckPlateNumber}</p>
                    </div>

                    <div className="p-5 bg-slate-50 border rounded-2xl space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Orquestração de Base</span>
                      <p className="text-xs font-black text-slate-900">{selectedInvoice.dispatcherName}</p>
                      <p className="text-[10px] text-slate-500">Despachado às: {selectedInvoice.dispatchTime}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: DELIVERY DETAILS */}
              {activeDetailTab === 'delivery_details' && (
                <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <div className="bg-slate-50 p-6 rounded-2xl border space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Dados Espaciais</h4>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block">Doca de Origem</span>
                      <p className="text-xs font-bold text-slate-800">{selectedInvoice.warehouseLocation}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block">Destino do Polígono</span>
                      <p className="text-xs font-bold text-slate-800">{selectedInvoice.address}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: FLEET DETAILS */}
              {activeDetailTab === 'fleet_details' && (
                <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <div className="p-6 bg-slate-50 border rounded-2xl space-y-4">
                    <h4 className="text-sm font-black text-slate-900">{selectedInvoice.assignedTruck}</h4>
                    <p className="text-xs text-slate-500 font-mono">Implemento: {selectedInvoice.truckPlateNumber}</p>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">Retorno Vazio Mapeado</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{selectedInvoice.emptyReturnKm} Km</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">Status Mecânico</span>
                        <span className="text-xs font-bold text-slate-800">Em plenas condições rodoviárias</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 4: FINANCIALS (Apenas métricas de custo logístico rodoviário, sem receita ou lucro) */}
              {activeDetailTab === 'financials' && (
                <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Acumulado de Despesas Operacionais da Frota</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="p-4 bg-white border rounded-xl">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Custo Total da Entrega</span>
                        <p className="text-xl font-black text-slate-900 mt-1 font-mono">
                          R$ {selectedInvoice.operationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="p-4 bg-white border rounded-xl">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Alocação de Combustível</span>
                        <p className="text-xl font-black text-teal-700 mt-1 font-mono">
                          R$ {selectedInvoice.estimatedFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[9px] text-slate-400 block mt-0.5">({selectedInvoice.litersFuelUsed} Litros consumidos)</span>
                      </div>

                      <div className="p-4 bg-white border rounded-xl">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Coeficiente por Extensão</span>
                        <p className="text-xl font-black text-primary mt-1 font-mono">
                          R$ {(selectedInvoice.operationalCost / selectedInvoice.deliveryDistance).toFixed(2)} / Km
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                      <p><strong>Recursos Humanos alocados na jornada:</strong> R$ {selectedInvoice.driverSalaryAlloc} (Titular) + R$ {selectedInvoice.assistantPayAlloc} (Apoio).</p>
                      <p><strong>Provisão para desgaste de pneus e manutenções rotineiras:</strong> R$ {selectedInvoice.maintenanceAlloc}.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 5: MATERIALS */}
              {activeDetailTab === 'materials' && (
                <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <div className="p-6 bg-slate-50 border rounded-2xl space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Verificação de Volumes</h4>
                    <p className="text-xs font-bold text-slate-800">{selectedInvoice.materialType} — {selectedInvoice.materialQuantity}</p>
                    <p className="text-[11px] font-mono text-slate-500">Total Auditado: {selectedInvoice.palletCount} volumes de carga. Frágil: {selectedInvoice.isFragile ? 'Sim' : 'Não'}.</p>
                  </div>
                </div>
              )}

              {/* ABA 6: GPS */}
              {activeDetailTab === 'gps_tracking' && (
                <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <div className="p-4 bg-slate-50 border rounded-2xl text-xs font-bold">
                    Sinal Telemétrico de Pátio: <span className="text-primary">{selectedInvoice.gpsStatus}</span>
                  </div>
                </div>
              )}

              {/* ABA 7: DOCUMENTS */}
              {activeDetailTab === 'documents' && (
                <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <div className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold">CT-e / NF-e Oficial Digitalizado</span>
                    <button onClick={() => toast.success('Arquivo manifestado aberto.')} className="font-bold text-primary">Inspecionar</button>
                  </div>
                </div>
              )}

              {/* ABA 8: PHOTOS */}
              {activeDetailTab === 'photos' && (
                <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto text-center py-8">
                  <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-400">Galeria de Lacres Físicos Registrados nas Docas</p>
                </div>
              )}

              {/* ABA 9: FUEL LOGS */}
              {activeDetailTab === 'fuel_logs' && (
                <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  <p className="text-xs font-mono text-slate-600">Posto Conveniado Rodoviário S10 — {selectedInvoice.litersFuelUsed} Litros Abastecidos.</p>
                </div>
              )}

              {/* ABA 10: TIMELINE */}
              {activeDetailTab === 'activity_timeline' && (
                <div className="space-y-4 animate-in fade-in duration-200 max-w-3xl mx-auto">
                  {selectedInvoice.timelineEvents.map((ev, index) => (
                    <div key={index} className="text-xs border-b pb-2">
                      <span className="font-mono text-slate-400">{ev.time}</span>
                      <p className="font-bold text-slate-800">{ev.title} — {ev.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA 11: AUDIT */}
              {activeDetailTab === 'audit_logs' && (
                <div className="space-y-2 animate-in fade-in duration-200 max-w-5xl mx-auto">
                  {selectedInvoice.auditLogs.map((log, idx) => (
                    <div key={idx} className="text-xs p-3 bg-slate-50 rounded border">
                      <p className="font-bold text-slate-700">{log.action}</p>
                      <span className="text-[10px] text-slate-400">{log.time} • {log.user}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            <div className="p-4 px-8 bg-slate-50 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-500 shrink-0">
              <span className="font-mono">Registro: {selectedInvoice.id}</span>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest"
              >
                Retornar à Grelha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default InvoicesPage;
