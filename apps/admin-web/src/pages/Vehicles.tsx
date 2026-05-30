import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Vehicle } from '../types';

export default function Vehicles() {
  const [list, setList] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicleNumber: '', type: '', capacity: '', fuelType: '' });

  function load() { api.get<Vehicle[]>('/vehicles').then(setList).catch(() => {}); }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/vehicles', form);
    setShowForm(false);
    setForm({ vehicleNumber: '', type: '', capacity: '', fuelType: '' });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Veículos</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg">
            {showForm ? 'Cancelar' : '+ Novo Veículo'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={create} className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Placa/Número*" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="Tipo*" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="Capacidade*" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="Combustível*" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <button type="submit" className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg">Salvar</button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {list.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">Nenhum veículo cadastrado</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="p-3 font-medium">Placa</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium hidden md:table-cell">Capacidade</th>
                  <th className="p-3 font-medium hidden md:table-cell">Combustível</th>
                  <th className="p-3 font-medium hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-medium">{v.vehicleNumber}</td>
                    <td className="p-3 text-gray-600">{v.type}</td>
                    <td className="p-3 text-gray-500 hidden md:table-cell">{v.capacity}</td>
                    <td className="p-3 text-gray-500 hidden md:table-cell">{v.fuelType}</td>
                    <td className="p-3 hidden md:table-cell">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${v.activeStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {v.activeStatus ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
