import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Customer } from '../types';

export default function Customers() {
  const [list, setList] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', latitude: '', longitude: '' });

  function load() { api.get<Customer[]>('/customers').then(setList).catch(() => {}); }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/customers', {
      name: form.name, phone: form.phone, address: form.address,
      latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude),
    });
    setShowForm(false);
    setForm({ name: '', phone: '', address: '', latitude: '', longitude: '' });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Clientes</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            {showForm ? 'Cancelar' : '+ Novo Cliente'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={create} className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nome*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-2 px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="Telefone*" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="Endereço*" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="Latitude*" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
              <input placeholder="Longitude*" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <button type="submit" className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg">Salvar</button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {list.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">Nenhum cliente cadastrado</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">Telefone</th>
                  <th className="p-3 font-medium hidden md:table-cell">Endereço</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-gray-600">{c.phone}</td>
                    <td className="p-3 text-gray-500 hidden md:table-cell">{c.address}</td>
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
