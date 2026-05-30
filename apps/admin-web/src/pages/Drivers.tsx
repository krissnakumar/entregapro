import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Driver } from '../types';

export default function Drivers() {
  const [list, setList] = useState<Driver[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', licenseNumber: '' });

  function load() { api.get<Driver[]>('/drivers').then(setList).catch(() => {}); }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/drivers', { name: form.name, phone: form.phone, cnhNumber: form.licenseNumber });
    setShowForm(false);
    setForm({ name: '', phone: '', licenseNumber: '' });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Motoristas</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg">
            {showForm ? 'Cancelar' : '+ Novo Motorista'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={create} className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-3">
            <input placeholder="Nome*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Telefone*" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="CNH*" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <button type="submit" className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg">Salvar</button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {list.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">Nenhum motorista cadastrado</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">Telefone</th>
                  <th className="p-3 font-medium hidden md:table-cell">Status</th>
                  <th className="p-3 font-medium hidden md:table-cell">Veículo</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3 text-gray-600">{d.phone}</td>
                    <td className="p-3 hidden md:table-cell">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${d.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {d.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 hidden md:table-cell">{d.vehicleNumber || '-'}</td>
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
