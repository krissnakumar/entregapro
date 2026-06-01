import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/useAuthStore';
import { Truck, User, MapPin, Clock, Wifi, WifiOff, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:3001';

export function DriverWorkloadPanel() {
  const token = useAuthStore(s => s.token);
  const [onlineDrivers, setOnlineDrivers] = useState<Set<string>>(new Set());

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<any[]>('/drivers'),
  });

  const { data: orders } = useQuery({
    queryKey: ['active-dispatch'],
    queryFn: () => api.get<any[]>('/dispatch'),
  });

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => socket.emit('joinDispatchers'));

    socket.on('driverStatusChanged', (data: { driverId: string; status: 'online' | 'offline' }) => {
      setOnlineDrivers(prev => {
        const next = new Set(prev);
        if (data.status === 'online') next.add(data.driverId);
        else next.delete(data.driverId);
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, [token]);

  const deliveries = orders?.flatMap(o => o.deliveries) || [];

  const driversWithLoad = (drivers || []).map((d: any) => {
    const activeDeliveries = deliveries.filter(
      (del: any) => del.driverId === d.id && del.status !== 'DELIVERED' && del.status !== 'CANCELLED'
    );
    return { ...d, activeDeliveries, load: activeDeliveries.length };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Carga de Motoristas</h3>
        <span className="text-xs text-slate-500">
          {onlineDrivers.size}/{drivers?.length || 0} online
        </span>
      </div>
      <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 size={20} className="animate-spin mx-auto text-slate-300" /></div>
        ) : driversWithLoad.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Nenhum motorista cadastrado</div>
        ) : (
          driversWithLoad.map((driver: any) => (
            <div key={driver.id} className="p-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0",
                  driver.load >= 3 ? "bg-rose-500" : driver.load > 0 ? "bg-amber-500" : "bg-emerald-500"
                )}>
                  <User size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {driver.user?.name || 'Sem nome'}
                    </p>
                    {onlineDrivers.has(driver.id) ? (
                      <Wifi size={12} className="text-emerald-500 shrink-0" />
                    ) : (
                      <WifiOff size={12} className="text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <Truck size={11} />
                    <span>{driver.vehicle?.vehicleNumber || 'Sem veículo'}</span>
                    <span>•</span>
                    <MapPin size={11} />
                    <span className="truncate">{driver.vehicle?.type || '-'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-black",
                    driver.load >= 3 ? "text-rose-600" : driver.load > 0 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {driver.load}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Entregas</p>
                </div>
              </div>
              {driver.load > 0 && (
                <div className="mt-2 pl-13 space-y-1">
                  {driver.activeDeliveries.slice(0, 3).map((del: any) => (
                    <div key={del.id} className="flex items-center gap-2 text-xs text-slate-500 pl-13">
                      <ChevronRight size={10} className="text-slate-300" />
                      <span className="truncate">{del.deliveryAddress || del.customer?.name}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1 py-0.5 rounded shrink-0",
                        del.status === 'IN_TRANSIT' && "bg-blue-50 text-blue-600",
                        del.status === 'LOADING' && "bg-amber-50 text-amber-600",
                        del.status === 'ASSIGNED' && "bg-slate-100 text-slate-600",
                      )}>
                        {del.status === 'IN_TRANSIT' ? 'Em Rota' : del.status === 'LOADING' ? 'Carregando' : 'Atribuído'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
