import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import { DriverWorkloadPanel } from './DriverWorkloadPanel';
import { GpsSimulatorPanel } from './GpsSimulatorPanel';
import DispatchBoard from '../DispatchBoard';
import MapView from '../MapView';
import {
  LayoutDashboard, Map, Users, Truck, Clock, AlertTriangle,
  PackageCheck, ClipboardList, Navigation, Loader2,
} from 'lucide-react';

type Tab = 'kanban' | 'mapa' | 'carga';

export function DispatchCommandCenter() {
  const [tab, setTab] = useState<Tab>('kanban');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['active-dispatch'],
    queryFn: () => api.get<any[]>('/dispatch'),
    refetchInterval: 10000,
  });

  const deliveries = orders?.flatMap(o => o.deliveries) || [];

  const stats = [
    { label: 'Pendentes', value: deliveries.filter((d: any) => d.status === 'PENDING').length, color: 'text-rose-600', bg: 'bg-rose-50', icon: ClipboardList },
    { label: 'Carregando', value: deliveries.filter((d: any) => d.status === 'LOADING').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: PackageCheck },
    { label: 'Em Rota', value: deliveries.filter((d: any) => d.status === 'IN_TRANSIT').length, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Truck },
    { label: 'Entregues', value: deliveries.filter((d: any) => d.status === 'DELIVERED').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Clock },
    { label: 'Atrasadas', value: deliveries.filter((d: any) => {
      if (d.status === 'DELIVERED' || d.status === 'CANCELLED') return false;
      if (!d.scheduledTime) return false;
      return new Date(d.scheduledTime) < new Date();
    }).length, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
  ];

  const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'kanban', label: 'Kanban', icon: LayoutDashboard },
    { key: 'mapa', label: 'Mapa', icon: Map },
    { key: 'carga', label: 'Carga Motoristas', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn('p-2 rounded-xl', s.bg)}>
                      <Icon size={16} className={s.color} />
                    </div>
                    {isLoading && <Loader2 size={12} className="animate-spin text-slate-300" />}
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                  <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1 w-fit">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer',
                    tab === t.key ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  )}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-[500px]">
            {tab === 'kanban' && <DispatchBoard />}
            {tab === 'mapa' && (
              <div className="h-[600px] rounded-2xl overflow-hidden">
                <MapView />
              </div>
            )}
            {tab === 'carga' && <DriverWorkloadPanel />}
          </div>
        </div>

        <div className="xl:col-span-1 space-y-4">
          <GpsSimulatorPanel />
        </div>
      </div>
    </div>
  );
}
