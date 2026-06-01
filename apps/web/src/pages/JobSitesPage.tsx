import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import {
  HardHat, Plus, MapPin, Pencil, Trash2, Search, X,
  Phone, Map, Navigation, Loader2, Package,
  CheckCircle2, AlertCircle, Clock, Wrench,
} from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const jobSiteIcon = (color: string) => L.divIcon({
  className: 'custom-jobsite-div-icon',
  html: `<div style="background:${color};width:36px;height:36px;border-radius:12px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:bold;">🏗</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

interface JobSite {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  latitude: number;
  longitude: number;
  polygon: any;
  radius: number;
  color: string;
  status: string;
  _count: { deliveries: number };
}

function JobSiteForm({ site, onClose }: { site?: Partial<JobSite>; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: site?.name || '',
    description: site?.description || '',
    address: site?.address || '',
    contactName: site?.contactName || '',
    contactPhone: site?.contactPhone || '',
    latitude: site?.latitude || -23.5505,
    longitude: site?.longitude || -46.6333,
    radius: site?.radius || 50,
    color: site?.color || '#8B5CF6',
    status: site?.status || 'ACTIVE',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/job-sites', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['job-sites'] }); toast.success('Obra cadastrada'); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/job-sites/${site?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['job-sites'] }); toast.success('Obra atualizada'); onClose(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (site?.id) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{site?.id ? 'Editar Obra' : 'Nova Obra'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Latitude</label>
              <input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: +e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Longitude</label>
              <input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: +e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Endereço</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contato</label>
              <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Telefone</label>
              <input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Raio (m)</label>
              <input type="number" value={form.radius} onChange={e => setForm(f => ({ ...f, radius: +e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cor</label>
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-full h-10 px-1 border border-slate-200 rounded-xl cursor-pointer" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Descrição</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors cursor-pointer">
            {site?.id ? 'Salvar' : 'Cadastrar Obra'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onSelect(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export function JobSitesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Partial<JobSite> | undefined>();
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState<JobSite | null>(null);

  const { data: sites, isLoading } = useQuery({
    queryKey: ['job-sites'],
    queryFn: () => api.get<JobSite[]>('/job-sites'),
    refetchInterval: 15000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/job-sites/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['job-sites'] }); toast.success('Obra removida'); },
  });

  const filtered = (sites || []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <JobSiteForm site={editingSite} onClose={() => { setShowForm(false); setEditingSite(undefined); }} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Obras</h2>
          <p className="text-sm text-slate-500">{sites?.length || 0} obras cadastradas</p>
        </div>
        <button
          onClick={() => { setEditingSite(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <Plus size={16} /> Nova Obra
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar obra..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <HardHat size={40} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">Nenhuma obra encontrada</p>
            </div>
          ) : (
            filtered.map(site => (
              <div
                key={site.id}
                onClick={() => setSelectedSite(site)}
                className={cn(
                  "bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer",
                  selectedSite?.id === site.id ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-lg shrink-0"
                    style={{ backgroundColor: site.color }}>
                    🏗
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{site.name}</h4>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
                        site.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {site.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {site.address && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{site.address}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</span>
                      <span className="flex items-center gap-1"><Package size={10} /> {site._count.deliveries} entregas</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingSite(site); setShowForm(true); }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Remover esta obra?')) deleteMutation.mutate(site.id); }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm h-[500px]">
            <MapContainer center={[-23.5505, -46.6333]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker onSelect={(lat, lng) => {
                if (editingSite) return;
                setEditingSite({ latitude: lat, longitude: lng });
                setShowForm(true);
              }} />
              {filtered.map(site => (
                <div key={site.id}>
                  <Marker position={[site.latitude, site.longitude]} icon={jobSiteIcon(site.color)}>
                    <Popup>
                      <div className="p-2 min-w-[150px]">
                        <div className="flex items-center gap-2 border-b pb-1.5 mb-1.5">
                          <span className="text-sm font-bold text-slate-900">{site.name}</span>
                        </div>
                        {site.address && <p className="text-xs text-slate-500 mb-1">{site.address}</p>}
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <Navigation size={10} /> {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{site._count.deliveries} entregas</p>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {selectedSite && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: selectedSite.color }}>
              🏗
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{selectedSite.name}</h3>
              <p className="text-xs text-slate-500">{selectedSite.address || 'Sem endereço'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Latitude</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedSite.latitude.toFixed(6)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Longitude</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedSite.longitude.toFixed(6)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Raio</p>
              <p className="font-bold text-slate-800 mt-0.5">{selectedSite.radius}m</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Entregas</p>
              <p className="font-bold text-slate-800 mt-0.5">{selectedSite._count.deliveries}</p>
            </div>
          </div>
          {selectedSite.contactName && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Phone size={14} className="text-slate-400" />
              <span>{selectedSite.contactName} - {selectedSite.contactPhone}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
