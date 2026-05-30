import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api/client';
import type { KpiData, Delivery } from '../types';

const NAV = [
  { label: 'Dashboard', path: '/', icon: '⊞' },
  { label: 'Entregas', path: '/deliveries', icon: '📦' },
  { label: 'Clientes', path: '/customers', icon: '🏢' },
  { label: 'Motoristas', path: '/drivers', icon: '👤' },
  { label: 'Veículos', path: '/vehicles', icon: '🚛' },
];

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const nav = useNavigate();
  const loc = useLocation();
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [recent, setRecent] = useState<Delivery[]>([]);

  useEffect(() => {
    api.get<KpiData>('/reports/executive').then(setKpi).catch(() => {});
    api.get<Delivery[]>('/deliveries').then((d) => setRecent(d.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">EP</div>
          <span className="font-bold text-sm">EntregaPRO</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.path}
              onClick={() => nav(n.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                loc.pathname === n.path ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
          <div className="px-3 text-xs text-gray-500">{user?.name}</div>
          <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Sair</button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <div className="md:hidden flex gap-2">
            {NAV.map((n) => (
              <button key={n.path} onClick={() => nav(n.path)} className={`px-3 py-1.5 text-xs rounded-lg ${loc.pathname === n.path ? 'bg-gray-900 text-white' : 'bg-white border'}`}>
                {n.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Entregas Hoje', value: kpi?.dailyCount ?? '-', color: 'bg-blue-500' },
            { label: 'Concluídas', value: kpi?.completedToday ?? '-', color: 'bg-green-500' },
            { label: 'Atrasadas', value: kpi?.delayedCount ?? '-', color: 'bg-orange-500' },
            { label: 'Motoristas Ativos', value: kpi?.activeDrivers ?? '-', color: 'bg-purple-500' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-8 h-8 ${card.color} rounded-lg mb-3`} />
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold mb-3">Entregas Recentes</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Nenhuma entrega recente</p>
          ) : (
            <div className="space-y-2">
              {recent.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium">{d.deliveryNumber}</span>
                    <span className="text-xs text-gray-500 ml-2">{d.customerName}</span>
                  </div>
                  <Badge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DELIVERED: 'bg-green-100 text-green-700',
    IN_TRANSIT: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-gray-100 text-gray-700',
    ASSIGNED: 'bg-purple-100 text-purple-700',
    LOADING: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    DELIVERED: 'Entregue', IN_TRANSIT: 'Em Trânsito', PENDING: 'Pendente',
    ASSIGNED: 'Atribuído', LOADING: 'Carregando', CANCELLED: 'Cancelado',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}
