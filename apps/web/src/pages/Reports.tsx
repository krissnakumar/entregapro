import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  Truck, Clock, AlertTriangle, Download, FileSpreadsheet,
  FileText, Loader2, ChevronRight, Users, MapPin,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

interface ExecutiveStats {
  dailyCount: number;
  delayedCount: number;
  activeDrivers: number;
  fleetUtilization: number;
  completedToday: number;
  avgDeliveryTime: string;
  financial: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgMargin: number;
    totalDeliveries: number;
  };
  weekly: { name: string; deliveries: number }[];
  distribution: { name: string; value: number; color: string }[];
  topDrivers: { id: string; name: string; completedDeliveries: number }[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

export function ReportsPage() {
  const [tab, setTab] = useState<'overview' | 'financial' | 'drivers'>('overview');

  const { data: exec, isLoading } = useQuery({
    queryKey: ['executive-report'],
    queryFn: () => api.get<ExecutiveStats>('/reports/executive'),
    refetchInterval: 30000,
  });

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const token = localStorage.getItem('entregapro-auth');
      const t = token ? JSON.parse(token).state?.token : '';
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const res = await fetch(`/api/reports/export/${format}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Erro ao exportar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Relatório exportado como ${ext.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const fin = exec?.financial;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Relatórios</h2>
          <p className="text-sm text-slate-500">Painel executivo e análises</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard icon={Truck} label="Hoje" value={String(exec?.dailyCount || 0)} color="text-indigo-600" bg="bg-indigo-50" />
        <MetricCard icon={CheckCircle} label="Concluídas" value={String(exec?.completedToday || 0)} color="text-emerald-600" bg="bg-emerald-50" />
        <MetricCard icon={AlertTriangle} label="Atrasadas" value={String(exec?.delayedCount || 0)} color="text-rose-600" bg="bg-rose-50" />
        <MetricCard icon={Clock} label="Tempo Médio" value={exec?.avgDeliveryTime || '—'} color="text-amber-600" bg="bg-amber-50" />
        <MetricCard icon={Users} label="Motoristas" value={String(exec?.activeDrivers || 0)} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard icon={BarChart3} label="Frota" value={`${exec?.fleetUtilization || 0}%`} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1 w-fit">
        {(['overview', 'financial', 'drivers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer',
              tab === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}>
            {t === 'overview' ? 'Visão Geral' : t === 'financial' ? 'Financeiro' : 'Motoristas'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Entregas da Semana</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={exec?.weekly || []}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="deliveries" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Distribuição Hoje</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={exec?.distribution || []}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={4} dataKey="value"
                >
                  {(exec?.distribution || []).map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Top Motoristas</h3>
            <div className="space-y-2">
              {(exec?.topDrivers || []).map((d, i) => (
                <div key={d.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <span className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white",
                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-300"
                  )}>{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-slate-700">{d.name}</span>
                  <span className="text-sm font-bold text-emerald-600">{d.completedDeliveries}</span>
                </div>
              ))}
              {(!exec?.topDrivers || exec.topDrivers.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Resumo Financeiro</h3>
            {fin ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                  <span className="text-sm text-slate-600">Receita Total</span>
                  <span className="text-lg font-black text-emerald-600">
                    {fin.totalRevenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl">
                  <span className="text-sm text-slate-600">Custo Total</span>
                  <span className="text-lg font-black text-rose-600">
                    {fin.totalCost?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                  <span className="text-sm text-slate-600">Lucro Total</span>
                  <span className="text-lg font-black text-indigo-600">
                    {fin.totalProfit?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
                  <span className="text-sm text-slate-600">Margem Média</span>
                  <span className="text-lg font-black text-amber-600">{fin.avgMargin}%</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Calcule os custos das entregas para ver dados financeiros</p>
            )}
          </div>
        </div>
      )}

      {tab === 'financial' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Receita vs Custos (Mensal)</h3>
          <FinancialChart />
        </div>
      )}

      {tab === 'drivers' && (
        <DriverPerformance />
      )}
    </div>
  );
}

function FinancialChart() {
  const { data: financial } = useQuery({
    queryKey: ['financial-report'],
    queryFn: () => api.get<{ monthly: { month: string; revenue: number; cost: number; profit: number }[] }>('/reports/financial'),
    refetchInterval: 60000,
  });

  if (!financial?.monthly?.length) {
    return <p className="text-sm text-slate-400 text-center py-8">Calcule os custos das entregas para ver dados financeiros</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={financial.monthly}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cost" name="Custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="Lucro" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DriverPerformance() {
  const { data: drivers } = useQuery({
    queryKey: ['report-drivers'],
    queryFn: () => api.get<any[]>('/reports/drivers'),
  });

  if (!drivers?.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <Users size={40} className="mx-auto text-slate-200 mb-2" />
        <p className="text-sm text-slate-400">Nenhum motorista cadastrado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50">
              <th className="text-left py-3 px-4">Motorista</th>
              <th className="text-right py-3 px-4">Total</th>
              <th className="text-right py-3 px-4">Concluídas</th>
              <th className="text-right py-3 px-4">Taxa de Sucesso</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => {
              const rate = d.totalDeliveries > 0
                ? Math.round((d.completedDeliveries / d.totalDeliveries) * 100)
                : 0;
              return (
                <tr key={d.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{d.name}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{d.totalDeliveries}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-600">{d.completedDeliveries}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-lg",
                      rate >= 80 ? "bg-emerald-50 text-emerald-600" :
                      rate >= 50 ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {rate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("p-2 rounded-xl", bg)}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("text-xl font-black mt-0.5", color)}>{value}</p>
    </div>
  );
}

function CheckCircle(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
