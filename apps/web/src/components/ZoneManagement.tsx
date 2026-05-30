import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMapEvents } from 'react-leaflet';
import { Plus, Save, Trash2, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const MapEvents = ({ isDrawing, newPolygon, setNewPolygon }: any) => {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        setNewPolygon([...newPolygon, [e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
};

const ZoneManagement = () => {
  const queryClient = useQueryClient();
  const [isDrawing, setIsDrawing] = useState(false);
  const [newPolygon, setNewPolygon] = useState<[number, number][]>([]);
  const [zoneName, setZoneName] = useState('');

  const { data: apiZones } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => api.get<any[]>('/maps/zones'),
  });

  const zones = apiZones || [];

  const createZoneMutation = useMutation({
    mutationFn: (newZone: any) => api.post('/maps/zones', newZone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      setIsDrawing(false);
      setNewPolygon([]);
      setZoneName('');
      toast.success('Zone boundaries calculated and synchronized.');
    },
    onError: () => {
      toast.error('Failed to commit spatial polygon vectors');
    }
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/maps/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('Zone record deleted successfully');
    },
    onError: () => {
      toast.error('Failed to purge zone record');
    }
  });

  const handleSaveZone = () => {
    if (newPolygon.length < 3) {
      toast.error('A spatial polygon requires at least 3 distinct vector intersection anchors.');
      return;
    }
    
    // Create GeoJSON structure
    const geoJson = {
      type: "Polygon",
      coordinates: [[...newPolygon.map(p => [p[1], p[0]]), [newPolygon[0][1], newPolygon[0][0]]]]
    };

    createZoneMutation.mutate({
      name: zoneName || `Zone Cluster ${Date.now()}`,
      polygon: geoJson,
      active: true,
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="text-primary" size={28} />
            Delivery Zones & Geofencing
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Configure PostGIS spatial restrictions, auto-assignment boundaries, and geofence polygons</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isDrawing ? (
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border shadow-lg animate-in fade-in">
              <input 
                placeholder="Assign Zone Label..." 
                className="border-none bg-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 w-48"
                value={zoneName}
                onChange={e => setZoneName(e.target.value)}
                autoFocus
              />
              <button 
                onClick={handleSaveZone}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md"
              >
                <Save size={14} /> Commit Vectors
              </button>
              <button 
                onClick={() => { setIsDrawing(false); setNewPolygon([]); }}
                className="hover:bg-slate-100 text-slate-500 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Abort
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsDrawing(true)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={16} /> Draw Custom Geo-Sector
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Map Panel Container */}
        <div className="lg:col-span-3 h-[650px] bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm relative">
          <MapContainer center={[-23.5505, -46.6333]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEvents isDrawing={isDrawing} newPolygon={newPolygon} setNewPolygon={setNewPolygon} />
            
            {/* Render Existing Zones */}
            {zones.map((zone) => {
              const polyCoords = zone.polygon?.coordinates?.[0] || [];
              const positions = polyCoords.map((c: any) => [c[1], c[0]]);
              
              if (positions.length < 3) return null;

              return (
                <Polygon 
                  key={zone.id}
                  positions={positions}
                  pathOptions={{ fillColor: zone.color || '#3B82F6', color: zone.color || '#3B82F6', fillOpacity: 0.2, weight: 3 }}
                >
                  <Popup className="rounded-2xl">
                    <div className="p-2 space-y-2 text-center">
                      <p className="font-black text-xs text-slate-900 tracking-tight">{zone.name}</p>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono block">
                        ID: {zone.id}
                      </span>
                      <button 
                        onClick={() => deleteZoneMutation.mutate(zone.id)}
                        className="text-rose-600 hover:text-white hover:bg-rose-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all w-full flex items-center justify-center gap-1 border border-rose-100"
                      >
                        <Trash2 size={10} /> Purge Zone
                      </button>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Render Current Drawing */}
            {newPolygon.length > 0 && (
              <Polygon 
                positions={newPolygon} 
                pathOptions={{ color: '#F43F5E', dashArray: '6, 8', weight: 4, fillColor: '#F43F5E', fillOpacity: 0.3 }} 
              />
            )}
          </MapContainer>
          
          {isDrawing && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-2xl flex items-center gap-2 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Click Map Coordinates to Register Intersection Corners</span>
            </div>
          )}
        </div>

        {/* Sidebar configuration matrices */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
               <ShieldCheck className="text-emerald-500" size={16} />
               Synchronized Sectors
             </h3>
             
             <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
               {zones.map(zone => (
                 <div key={zone.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl border border-slate-100 group transition-all">
                   <div className="flex items-center space-x-3 overflow-hidden">
                     <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: zone.color || '#3B82F6' }} />
                     <span className="text-xs font-black text-slate-800 truncate tracking-tight">{zone.name}</span>
                   </div>
                   <div className="flex items-center space-x-2 shrink-0">
                     <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">Active</span>
                     <button 
                       onClick={() => deleteZoneMutation.mutate(zone.id)}
                       className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           </div>

           <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden border border-white/10">
             <div className="flex items-center gap-2 mb-2">
               <Sparkles size={16} className="text-emerald-400" />
               <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">PostGIS Assignment Engine</h4>
             </div>
             <p className="text-xs text-slate-300 leading-relaxed font-medium">
               Real-time coordinates fallback checks auto-flag payloads generated beyond verified spatial boundaries. Intelligent routing heuristics instantly clamp driver assignment scopes within registered zone clusters.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneManagement;
