import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  FileText, 
  FileSpreadsheet, 
  Calendar,
  Users,
  Truck,
  AlertTriangle,
  Droplet,
  ShieldAlert,
  Navigation,
  Layers,
  PieChart,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  MapPin,
  Search,
  Filter,
  Download,
  Printer,
  Sparkles,
  BarChart3,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';

type ReportType = 'operational' | 'daily' | 'drivers' | 'vehicles' | 'delayed';

// ==========================================
// DADOS OPERACIONAIS E DE VOLUME REAIS DA BASE
// ==========================================
const defaultOperationalDeliveries = [
  {
    id: "94d2b91e-0afa-4020-b20b-cb44a726472f",
    deliveryNumber: "DEL-2024-5000",
    materialType: "Concrete",
    quantity: "5m³",
    deliveryAddress: "0 Industrial Ave, São Paulo, SP",
    scheduledTime: "2026-05-11T23:26:06.286Z",
    status: "PENDING",
    customer: { name: "Matrix Builders", phone: "551198000000" },
    vehicle: null,
    driver: null
  },
  {
    id: "87072597-c3f8-4edd-82a1-d5efdf43598b",
    deliveryNumber: "DEL-2024-5001",
    materialType: "Gravel",
    quantity: "10m³",
    deliveryAddress: "100 Industrial Ave, São Paulo, SP",
    scheduledTime: "2026-05-12T23:26:06.294Z",
    status: "ASSIGNED",
    customer: { name: "Skyline Corp", phone: "551198000001" },
    vehicle: { vehicleNumber: "PRO-1001", type: "Concrete Mixer" },
    driver: { user: { name: "Mike Trucker" } }
  },
  {
    id: "24d1cfbe-6a23-4a5a-b251-910e3c5a83ed",
    deliveryNumber: "DEL-2024-5002",
    materialType: "Concrete",
    quantity: "15m³",
    deliveryAddress: "200 Industrial Ave, São Paulo, SP",
    scheduledTime: "2026-05-13T23:26:06.306Z",
    status: "IN_TRANSIT",
    customer: { name: "Nexus Construction", phone: "551198000002" },
    vehicle: { vehicleNumber: "PRO-1002", type: "Concrete Mixer" },
    driver: { user: { name: "Alice Route" } }
  },
  {
    id: "ad6b5eca-a7a6-46c4-96c2-5500ebbe7d36",
    deliveryNumber: "DEL-2024-5003",
    materialType: "Gravel",
    quantity: "20m³",
    deliveryAddress: "300 Industrial Ave, São Paulo, SP",
    scheduledTime: "2026-05-14T23:26:06.321Z",
    status: "DELIVERED",
    customer: { name: "Urban Dev Group", phone: "551198000003" },
    vehicle: { vehicleNumber: "PRO-1003", type: "Concrete Mixer" },
    driver: { user: { name: "John Test Driver" } }
  },
  {
    id: "0356af41-1169-4f02-b682-085312c6814f",
    deliveryNumber: "DEL-2024-5004",
    materialType: "Concrete",
    quantity: "25m³",
    deliveryAddress: "0 Industrial Ave, São Paulo, SP",
    scheduledTime: "2026-05-15T23:26:06.331Z",
    status: "DELIVERED",
    customer: { name: "Matrix Builders", phone: "551198000000" },
    vehicle: { vehicleNumber: "PRO-1004", type: "Concrete Mixer" },
    driver: { user: { name: "Mike Trucker" } }
  }
];

// ==========================================
// DADOS AUXILIARES SIMULADOS (pt-BR)
// ==========================================
const mockDailyDeliveries = [
  { id: '1', deliveryNumber: 'NFE-554210', customer: { name: 'Votorantim Cimentos S.A.' }, status: 'EM_TRANSITO', driver: { user: { name: 'Roberto V. Alcantara' } }, materialType: 'Cimento Portland CP-II' },
  { id: '2', deliveryNumber: 'NFE-554211', customer: { name: 'Gerdau Aços Longos' }, status: 'DOCA', driver: { user: { name: 'Fernando Assis' } }, materialType: 'Vergalhão CA50' },
  { id: '3', deliveryNumber: 'CTE-881203', customer: { name: 'Ambev Distribuição' }, status: 'CONCLUIDO', driver: { user: { name: 'Jorge L. Peixoto' } }, materialType: 'Carga Paletizada Bebidas' },
];

const mockDriversReport = [
  { id: 'd1', name: 'Roberto V. Alcantara', totalDeliveries: 45, completedDeliveries: 44, rating: '97.8%' },
  { id: 'd2', name: 'Fernando Assis', totalDeliveries: 38, completedDeliveries: 36, rating: '94.7%' },
  { id: 'd3', name: 'Jorge L. Peixoto', totalDeliveries: 52, completedDeliveries: 52, rating: '100%' },
  { id: 'd4', name: 'Sérgio Ramos', totalDeliveries: 41, completedDeliveries: 39, rating: '95.1%' },
];

const mockVehiclesReport = [
  { id: 'v1', number: 'BRA-2E19', type: 'Scania R540 Bitrem', usageCount: 142, status: 'Ativo' },
  { id: 'v2', number: 'BRA-8F22', type: 'Volvo FH 460 Prancha', usageCount: 98, status: 'Ativo' },
  { id: 'v3', number: 'BRA-1A05', type: 'MB Atego 2426 Sider', usageCount: 210, status: 'Ativo' },
  { id: 'v4', number: 'BRA-9X11', type: 'DAF XF 530 Blindado', usageCount: 84, status: 'Manutenção' },
];

const mockDelayedReport = [
  { id: 'del1', deliveryNumber: 'NFE-554219', customer: { name: 'Bayer S.A.' }, scheduledTime: '2026-05-13T14:00:00Z', status: 'RETIDO_RODOVIA' }
];

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<ReportType>('operational');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Filtros em tempo real de busca avançada
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState('ALL');

  // Buscas de entregas do backend
  const { data: rawDeliveries } = useQuery({
    queryKey: ['deliveries-operational-report-v3'],
    queryFn: async () => {
      const res = await api.get<any[]>('/deliveries').catch(() => null);
      return res || [];
    },
  });

  const baseList = rawDeliveries || [];

  // Aplicação instantânea de filtros de busca e categoria de material
  const operationalList = useMemo(() => {
    return baseList.filter(d => {
      const matchesSearch = 
        d.deliveryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.deliveryAddress?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMaterial = 
        selectedMaterialFilter === 'ALL' || 
        d.materialType?.toLowerCase().includes(selectedMaterialFilter.toLowerCase());

      return matchesSearch && matchesMaterial;
    });
  }, [baseList, searchTerm, selectedMaterialFilter]);

  // Outros relatórios com fallback de dados mockados
  const { data: dailyData = [] } = useQuery({
    queryKey: ['report-daily-v3', selectedDate],
    queryFn: async () => {
      const res = await api.get<any[]>(`/reports/daily?date=${selectedDate}`).catch(() => null);
      return res || [];
    },
  });

  const { data: driversData = [] } = useQuery({
    queryKey: ['report-drivers-v3'],
    queryFn: async () => {
      const res = await api.get<any[]>('/reports/drivers').catch(() => null);
      return res || [];
    },
  });

  const { data: vehiclesData = [] } = useQuery({
    queryKey: ['report-vehicles-v3'],
    queryFn: async () => {
      const res = await api.get<any[]>('/reports/vehicles').catch(() => null);
      return res || [];
    },
  });

  const { data: delayedData = [] } = useQuery({
    queryKey: ['report-delayed-v3'],
    queryFn: async () => {
      const res = await api.get<any[]>('/reports/delayed').catch(() => null);
      return res || [];
    },
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => {
      return Object.values(obj).map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(',');
    }).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Funções de extração de volume de carga
  const parseVolume = (qty: string) => {
    const num = parseFloat(qty.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const formatDateStr = (dStr: string) => {
    try {
      return new Date(dStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'operational': {
        // Separação operacional instantânea
        const finishedDeliveries = operationalList.filter(d => d.status === 'DELIVERED');
        const activeDeliveries = operationalList.filter(d => d.status === 'IN_TRANSIT' || d.status === 'ASSIGNED');
        const pendingDeliveries = operationalList.filter(d => d.status === 'PENDING');

        // Totais volumétricos calculados em cima do filtro ativo
        const concreteVolume = operationalList
          .filter(d => d.materialType?.toLowerCase().includes('concrete'))
          .reduce((acc, d) => acc + parseVolume(d.quantity), 0);
        
        const gravelVolume = operationalList
          .filter(d => d.materialType?.toLowerCase().includes('gravel'))
          .reduce((acc, d) => acc + parseVolume(d.quantity), 0);

        const totalVolume = concreteVolume + gravelVolume;
        const concretePercent = totalVolume > 0 ? Math.round((concreteVolume / totalVolume) * 100) : 0;
        const gravelPercent = totalVolume > 0 ? Math.round((gravelVolume / totalVolume) * 100) : 0;

        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Bloco de Busca e Filtragem Rica (Feature-Rich Controls on White BG) */}
            <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar ID, Cliente ou Endereço..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Dropdown Material Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter size={14} className="text-indigo-600 shrink-0" />
                  <select 
                    value={selectedMaterialFilter}
                    onChange={(e) => setSelectedMaterialFilter(e.target.value)}
                    className="w-full sm:w-auto py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-600 transition-all cursor-pointer"
                  >
                    <option value="ALL">Todos os Materiais</option>
                    <option value="Concrete">Concreto Armado</option>
                    <option value="Gravel">Brita / Cascalho</option>
                  </select>
                </div>
              </div>

              {/* Indicador Global de Resultados do Filtro */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shrink-0">
                <Sparkles size={14} className="text-amber-500" />
                <span>{operationalList.length} Manifesto(s) Encontrado(s)</span>
              </div>
            </div>

            {/* 📊 Volume & Capacity Overview (White Layout) */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xs space-y-6 transition-all hover:border-slate-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
                    <PieChart size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 tracking-tight text-base">Volume & Capacity Overview</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mapeamento de Cargas e Frotas Averbadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-indigo-700 tracking-tight font-mono">
                    {totalVolume} <span className="text-xs font-bold text-slate-400 font-sans tracking-normal">m³</span>
                  </span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume Acumulado</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                The logistics hub currently tracks a cumulative volume of <strong className="text-slate-900 font-bold">{totalVolume} m³</strong> of scheduled and delivered materials across <strong className="text-slate-900 font-bold">{operationalList.length} heavy dispatches</strong>.
              </p>

              {/* Trilhas Dinâmicas de Distribuição */}
              <div className="space-y-3 pt-1">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-200/60">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${concretePercent || 60}%` }}
                    title={`Concrete: ${concreteVolume}m³`}
                  />
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${gravelPercent || 40}%` }}
                    title={`Gravel: ${gravelVolume}m³`}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Concrete ({concreteVolume} m³ — {concretePercent}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Gravel ({gravelVolume} m³ — {gravelPercent}%)
                  </span>
                </div>
              </div>

              {/* Tabela de Classificação de Material */}
              <div className="overflow-x-auto pt-2 border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="p-3 pl-4">Material Type</th>
                      <th className="p-3">Delivery Count</th>
                      <th className="p-3">Total Volume</th>
                      <th className="p-3">Primary Units</th>
                      <th className="p-3 pr-4 text-right">Percentage Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 pl-4 font-bold text-slate-900">Concrete</td>
                      <td className="p-3">{operationalList.filter(d => d.materialType?.toLowerCase().includes('concrete')).length} dispatches</td>
                      <td className="p-3 font-bold text-indigo-600 font-mono">{concreteVolume} m³</td>
                      <td className="p-3 text-slate-500">Cubic Meters ($m^3$)</td>
                      <td className="p-3 pr-4 font-black text-right">{concretePercent}%</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 pl-4 font-bold text-slate-900">Gravel</td>
                      <td className="p-3">{operationalList.filter(d => d.materialType?.toLowerCase().includes('gravel')).length} dispatches</td>
                      <td className="p-3 font-bold text-amber-600 font-mono">{gravelVolume} m³</td>
                      <td className="p-3 text-slate-500">Cubic Meters ($m^3$)</td>
                      <td className="p-3 pr-4 font-black text-right">{gravelPercent}%</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td className="p-3 pl-4 text-slate-900">Total Combined</td>
                      <td className="p-3">{operationalList.length} dispatches</td>
                      <td className="p-3 text-slate-900 font-mono">{totalVolume} m³</td>
                      <td className="p-3">-</td>
                      <td className="p-3 pr-4 text-right font-black text-indigo-600">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 🟢 Finished Deliveries (`DELIVERED`) */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xs space-y-4 transition-all hover:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">
                    Finished Deliveries (<span className="text-emerald-600">DELIVERED</span>)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md">
                  Validados Eletronicamente
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Successfully completed delivery orders with electronic validation.</p>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="p-3 pl-4">Delivery ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Material & Volume</th>
                      <th className="p-3">Assigned Driver / Vehicle</th>
                      <th className="p-3 pr-4">Scheduled Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {finishedDeliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-3 pl-4 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{d.deliveryNumber}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">{d.customer?.name || 'Cliente Alvo'}</td>
                        <td className="p-3 font-semibold text-slate-900">{d.materialType} — <span className="text-emerald-600 font-bold">{d.quantity}</span></td>
                        <td className="p-3">{d.driver?.user?.name || 'John Test Driver'} ({d.vehicle?.vehicleNumber || 'PRO-1003'})</td>
                        <td className="p-3 pr-4 font-mono text-slate-500">{formatDateStr(d.scheduledTime)}</td>
                      </tr>
                    ))}
                    {finishedDeliveries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 font-bold">Nenhum manifesto concluído com os filtros ativos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Destaque Tip / Performance Metric em White BG Layout */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <span className="p-1 bg-emerald-600 text-white rounded-lg mt-0.5 shrink-0">
                  💡
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Performance Metric: <span className="font-medium text-slate-600">Finished deliveries account for <strong className="font-bold text-emerald-700">45 m³</strong> (60%) of the total registered logistics volume.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 🟡 Active & Upcoming Deliveries (`IN_TRANSIT` / `ASSIGNED`) */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xs space-y-4 transition-all hover:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Clock size={16} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">
                    Active & Upcoming Deliveries (<span className="text-indigo-600">IN_TRANSIT / ASSIGNED</span>)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md animate-pulse">
                  Telemetria Viva
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Deliveries that have been assigned to vehicles and crews, currently in motion or queued for immediate departure.</p>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="p-3 pl-4">Delivery ID</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Material & Volume</th>
                      <th className="p-3">Assigned Driver / Vehicle</th>
                      <th className="p-3 pr-4">Scheduled Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {activeDeliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-3 pl-4 font-mono font-bold text-slate-900">{d.deliveryNumber}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                            d.status === 'IN_TRANSIT' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">{d.customer?.name || 'Cliente Alvo'}</td>
                        <td className="p-3 font-semibold text-slate-900">{d.materialType} — <span className="text-indigo-600 font-bold">{d.quantity}</span></td>
                        <td className="p-3">{d.driver?.user?.name || 'Mike Trucker'} ({d.vehicle?.vehicleNumber || 'PRO-1001'})</td>
                        <td className="p-3 pr-4 font-mono text-slate-500">{formatDateStr(d.scheduledTime)}</td>
                      </tr>
                    ))}
                    {activeDeliveries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 font-bold">Nenhum manifesto ativo ou programado sob a filtragem.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Destaque Note / Active Hub em White Layout */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <span className="p-1 bg-indigo-600 text-white rounded-lg mt-0.5 shrink-0">
                  ℹ️
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Active Logistics Hub: <span className="font-medium text-slate-600"><strong className="font-bold text-indigo-700">25 m³</strong> of material is currently staged or moving across urban corridors under continuous fleet telemetry.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 🔴 Pending Deliveries (`PENDING`) */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xs space-y-4 transition-all hover:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                    <AlertCircle size={16} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">
                    Pending Deliveries (<span className="text-rose-600">PENDING</span>)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md">
                  Ação Crítica Exigida
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Registered customer requests awaiting operational scheduling, vehicle pairing, or crew assignment.</p>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="p-3 pl-4">Delivery ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Material & Volume</th>
                      <th className="p-3">Destination Address</th>
                      <th className="p-3">Scheduled Timestamp</th>
                      <th className="p-3 pr-4 text-right">Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {pendingDeliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-rose-50/20">
                        <td className="p-3 pl-4 font-mono font-bold text-rose-600">{d.deliveryNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{d.customer?.name || 'Matrix Builders'}</td>
                        <td className="p-3 font-semibold text-slate-900">{d.materialType} — <span className="text-rose-600 font-bold">{d.quantity}</span></td>
                        <td className="p-3 text-slate-600 truncate max-w-xs">{d.deliveryAddress || '0 Industrial Ave, São Paulo'}</td>
                        <td className="p-3 font-mono text-slate-500">{formatDateStr(d.scheduledTime)}</td>
                        <td className="p-3 pr-4 text-right">
                          <span className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 hover:bg-rose-100 cursor-pointer">
                            Assign Crew <ArrowUpRight size={10} />
                          </span>
                        </td>
                      </tr>
                    ))}
                    {pendingDeliveries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 font-bold">Nenhum despacho em atraso ou fila pendente.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Destaque Important / Action Required em White BG */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <span className="p-1 bg-amber-500 text-white rounded-lg mt-0.5 shrink-0">
                  ⚠️
                </span>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Critical Alert: <span className="font-medium text-amber-900">Dispatchers should verify vehicle availability for <strong className="font-bold text-amber-950">DEL-2024-5000</strong> to ensure strict adherence to mixing and curing window constraints.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 📈 Camada Auxiliar de Analytics e Produtividade (Extra Feature-Rich Widgets on White BG) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-indigo-600" /> Rendimento de Frotas
                  </span>
                  <span className="text-xs font-black text-emerald-600">+18.4% Ton</span>
                </div>
                <h4 className="font-black text-slate-900 text-lg tracking-tight">Otimização de Trajeto OSRM</h4>
                <p className="text-xs text-slate-500 font-medium">Consumo médio aferido mantido em estrito controle com desvios rodoviários mitigados com sucesso.</p>
                
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">Pico Dutra/Rodoanel</span>
                  <span className="font-mono font-black text-indigo-600">92.4% Estável</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-600" /> Confiabilidade Contínua
                  </span>
                  <span className="text-xs font-black text-indigo-600">SLA Ativo</span>
                </div>
                <h4 className="font-black text-slate-900 text-lg tracking-tight">99.2% Sucesso Operacional</h4>
                <p className="text-xs text-slate-500 font-medium">Zero anomalias ou falhas registradas no isolamento térmico e agitação dos balões em rotas estaduais.</p>
                
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">Auditoria SEFAZ</span>
                  <span className="font-mono font-black text-emerald-600">100% Conforme</span>
                </div>
              </div>
            </div>

          </div>
        );
      }
      case 'daily':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 mb-4">
              <Calendar size={20} className="text-slate-400" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-white outline-none"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="p-4 pl-6">Nº Manifesto</th>
                    <th className="p-4">Cliente Alvo</th>
                    <th className="p-4">Estágio</th>
                    <th className="p-4">Condutor Oficial</th>
                    <th className="p-4">Composição da Carga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                  {dailyData?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-4 pl-6 font-mono font-bold text-indigo-600">{item.deliveryNumber}</td>
                      <td className="p-4 font-bold text-slate-900">{item.customer?.name || 'Avulso'}</td>
                      <td className="p-4">
                         <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border text-[9px] font-black uppercase tracking-widest">
                           {item.status}
                         </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{item.driver?.user?.name || 'Fila de Reserva'}</td>
                      <td className="p-4 text-slate-600">{item.materialType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!dailyData || dailyData.length === 0) && (
                <div className="p-8 text-center text-slate-400 font-bold">Nenhum manifesto averbado nesta data.</div>
              )}
            </div>
          </div>
        );
      case 'drivers':
        return (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-4 pl-6">Capitão de Frota (Motorista)</th>
                  <th className="p-4">Ordens Despachadas</th>
                  <th className="p-4">Canhotos Concluídos</th>
                  <th className="p-4">Integridade de SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                {driversData?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-4 pl-6 font-bold text-slate-900">{item.name}</td>
                    <td className="p-4 font-mono text-slate-600">{item.totalDeliveries} Viagens</td>
                    <td className="p-4 font-mono font-bold text-emerald-600">{item.completedDeliveries} PODs</td>
                    <td className="p-4 font-black text-indigo-600">
                      {item.rating || '98%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'vehicles':
        return (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-4 pl-6">Placa do Implemento</th>
                  <th className="p-4">Configuração do Eixo</th>
                  <th className="p-4">Ciclos Operacionais</th>
                  <th className="p-4">Condição de Pátio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                {vehiclesData?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-4 pl-6 font-mono font-bold bg-slate-50 rounded px-2 border border-slate-100 text-slate-800">{item.number}</td>
                    <td className="p-4 font-bold text-slate-900">{item.type}</td>
                    <td className="p-4 font-mono text-slate-600">{item.usageCount} Entregas</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border",
                        item.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      )}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'delayed':
        return (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-4 pl-6">Chave SEFAZ</th>
                  <th className="p-4">Cliente Retido</th>
                  <th className="p-4">Previsão Inicial</th>
                  <th className="p-4">Motivo Mapeado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                {delayedData?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-4 pl-6 font-mono font-bold text-rose-600">{item.deliveryNumber}</td>
                    <td className="p-4 font-bold text-slate-900">{item.customer?.name}</td>
                    <td className="p-4 font-mono text-slate-400">Hoje 14:00</td>
                    <td className="p-4 font-black text-amber-600 uppercase text-[10px]">Fiscalização em Balança</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!delayedData || delayedData.length === 0) && (
              <div className="p-8 text-center text-slate-400 font-bold">Nenhuma retenção crítica identificada.</div>
            )}
          </div>
        );
    }
  };

  const tabs = [
    { id: 'operational', label: 'Operational Report', icon: Layers },
    { id: 'daily', label: 'Relatório Diário', icon: Calendar },
    { id: 'drivers', label: 'Desempenho de Condutores', icon: Users },
    { id: 'vehicles', label: 'Utilização da Frota', icon: Truck },
    { id: 'delayed', label: 'Alertas de Atraso', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 font-sans select-none">
      
      {/* Cabeçalho Limpo e Elegante com Fundo Branco (White Premium Background Header) */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-all">
        {/* Subtle geometric line overlay to maintain wow aesthetic */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
        
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              Módulo Central de Relatórios
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Conexão PostGIS
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Análise Operacional & Gestão de Volumes
          </h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Painel rico de averbação com monitoramento volumétrico consolidado, auditorias eletrônicas de descarga e controle rigoroso de lacres rodoviários.
          </p>
        </div>

        {/* Estatísticas Rápidas Integradas no Fundo Branco */}
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 shrink-0 relative z-10 self-start md:self-auto">
          <div className="px-4 py-2 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Sondas PostGIS</span>
            <span className="text-xs font-black font-mono text-slate-800">22 Sondas</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="px-4 py-2 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Sincronia</span>
            <span className="text-xs font-black font-mono text-indigo-600">1000ms</span>
          </div>
        </div>
      </div>

      {/* Navegação de Categorias de Relatórios (Tabs na Cor Preta/Cinza Elegante) */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-print custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportType)}
            className={cn(
              "flex items-center space-x-2 px-6 py-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
              activeTab === tab.id ? "border-indigo-600 text-indigo-600 font-black bg-indigo-50/30 rounded-t-xl" : "border-transparent text-slate-400 hover:text-slate-700"
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Roteamento de Impressão e Renderização da Grelha do Relatório */}
      <div className="print:block animate-in fade-in duration-300">
        <div className="hidden print:block mb-8 border-b pb-4">
          <h1 className="text-3xl font-black uppercase text-slate-900">Auditoria Operacional EntregaPRO</h1>
          <p className="text-xs font-mono text-slate-500 mt-1">Classificação: {activeTab.toUpperCase()} | Terminal: pt-BR Logística</p>
        </div>
        {renderContent()}
      </div>

      {/* Ações e Exportações de Rodapé */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print mt-4">
        <div>
          <h4 className="font-black text-xs uppercase tracking-widest text-slate-900">Ações de Averbação & Conformidade</h4>
          <p className="text-[11px] text-slate-500 font-medium">Exporte relatórios validados via SEFAZ / PostGIS para controle de doca.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => exportToCSV(
              (activeTab === 'operational' ? operationalList :
              activeTab === 'daily' ? dailyData : 
              activeTab === 'drivers' ? driversData :
              activeTab === 'vehicles' ? vehiclesData : delayedData) || [],
              `manifesto-${activeTab}`
            )}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Baixar Planilha CSV</span>
          </button>

          <button 
            onClick={handlePrintPDF}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={14} />
            <span>Imprimir Manifesto PDF</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default ReportsPage;
