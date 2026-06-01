import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { Play, Square, Truck, MapPin, Loader2, Navigation, BatteryFull, Gauge } from 'lucide-react';
import { toast } from 'sonner';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:3001';

interface RouteData {
  driverId: string;
  deliveryId: string;
  deliveryNumber: string;
  driverName: string;
  vehicleNumber: string | null;
  customerName: string | null;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  waypoints: { lat: number; lng: number }[];
  totalSteps: number;
}

export function GpsSimulatorPanel() {
  const token = useAuthStore(s => s.token);
  const [running, setRunning] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const { data: routes, isLoading, refetch } = useQuery({
    queryKey: ['simulate-routes'],
    queryFn: () => api.get<RouteData[]>('/dispatch/simulate/routes'),
    enabled: false,
  });

  const startSimulation = useCallback(() => {
    refetch().then((result) => {
      const routesData = result.data;
      if (!routesData || routesData.length === 0) {
        toast.error('Nenhuma rota disponível para simulação');
        return;
      }

      const socket: Socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        setRunning(true);
        const progs: Record<string, number> = {};
        const ints: ReturnType<typeof setInterval>[] = [];

        routesData.forEach((route) => {
          progs[route.driverId] = 0;
          let step = 0;
          const speed = 1 + Math.floor(Math.random() * 2);

          const interval = setInterval(() => {
            step += speed;
            if (step >= route.totalSteps) {
              clearInterval(interval);
              setProgress(p => ({ ...p, [route.driverId]: 100 }));
              return;
            }
            const wp = route.waypoints[step];
            if (!wp) return;
            socket.emit('updateLocation', {
              deliveryId: route.deliveryId,
              lat: wp.lat,
              lng: wp.lng,
              driverId: route.driverId,
              speed: Math.round(20 + (step / route.totalSteps) * 40),
              heading: Math.round(
                Math.atan2(
                  route.destLng - route.originLng,
                  route.destLat - route.originLat,
                ) * (180 / Math.PI)
              ),
              batteryLevel: Math.round(50 + Math.random() * 40),
            });
            progs[route.driverId] = Math.round((step / route.totalSteps) * 100);
            setProgress({ ...progs });
          }, 2000);

          ints.push(interval);
        });

        intervalsRef.current = ints;
        toast.success(`Simulando ${routesData.length} motoristas`);
      });

      socket.on('connect_error', (err: any) => {
        toast.error(`Erro de conexão: ${err.message}`);
      });

      socketRef.current = socket;
    });
  }, [token, refetch]);

  const stopSimulation = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setRunning(false);
    setProgress({});
    toast.success('Simulação parada');
  }, []);

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(clearInterval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation size={16} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Simulador de GPS</h3>
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <button
              onClick={stopSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-colors cursor-pointer"
            >
              <Square size={12} /> Parar
            </button>
          ) : (
            <button
              onClick={startSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              <Play size={12} /> Simular
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-center">
            <Loader2 size={20} className="animate-spin mx-auto text-slate-300" />
          </div>
        )}

        {!isLoading && !running && !routes && (
          <div className="p-6 text-center">
            <MapPin size={32} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">Clique em "Simular" para iniciar</p>
            <p className="text-[10px] text-slate-300 mt-1">Motoristas com entregas ativas serão movidos</p>
          </div>
        )}

        {running && routes?.map((route) => (
          <div key={route.driverId} className="p-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0",
                progress[route.driverId] >= 100 ? "bg-emerald-500" : "bg-indigo-500"
              )}>
                <Truck size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{route.driverName}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {route.vehicleNumber} → {route.customerName}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-sm font-black",
                  progress[route.driverId] >= 100 ? "text-emerald-600" : "text-indigo-600"
                )}>
                  {progress[route.driverId] || 0}%
                </p>
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progress[route.driverId] >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                )}
                style={{ width: `${progress[route.driverId] || 0}%` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-400">
              <span className="flex items-center gap-1">
                <Gauge size={10} /> {Math.round(20 + (progress[route.driverId] || 0) * 0.4)} km/h
              </span>
              <span className="flex items-center gap-1">
                <BatteryFull size={10} /> {Math.round(50 + Math.random() * 40)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
