import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Delivery } from '../types';

const BADGE: Record<string, { color: string; label: string }> = {
  DELIVERED: { color: 'bg-green-100 text-green-700', label: 'Entregue' },
  IN_TRANSIT: { color: 'bg-blue-100 text-blue-700', label: 'Em Trânsito' },
  PENDING: { color: 'bg-gray-100 text-gray-700', label: 'Pendente' },
  ASSIGNED: { color: 'bg-purple-100 text-purple-700', label: 'Atribuído' },
  LOADING: { color: 'bg-orange-100 text-orange-700', label: 'Carregando' },
  CANCELLED: { color: 'bg-red-100 text-red-700', label: 'Cancelado' },
};

export default function Deliveries() {
  const [list, setList] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState('all');

  function load() { api.get<Delivery[]>('/deliveries').then(setList).catch(() => {}); }
  useEffect(load, []);

  const filtered = filter === 'all' ? list : list.filter((d) => d.status === filter.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold mb-4">Entregas</h1>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'pending', 'in_transit', 'delivered'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'in_transit' ? 'Em Trânsito' : 'Entregues'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center bg-white rounded-xl border border-gray-200">Nenhuma entrega encontrada</p>
          ) : (
            filtered.map((d) => {
              const badge = BADGE[d.status] || BADGE.PENDING;
              return (
                <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{d.deliveryNumber}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {d.customerName && <span>{d.customerName} · </span>}
                      {d.materialType} - {d.quantity}
                      {d.driverName && <span> · {d.driverName}</span>}
                    </div>
                  </div>
                  {d.estimatedProfit != null && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">R${d.estimatedProfit.toFixed(0)}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
