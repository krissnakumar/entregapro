import React, { useEffect, useState } from 'react';
import { X, Building2, PackageCheck, Calendar, MapPin, Truck, Loader2, AlertCircle, Clock, User } from 'lucide-react';
import { api } from '../api/client';
import { cn } from '../lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  status?: string;
}

interface DeliveryRecord {
  id: string;
  deliveryNumber: string;
  status: string;
  materialType: string;
  quantity: string;
  deliveryAddress: string;
  scheduledTime: string;
  completedAt?: string;
  createdAt: string;
  driver?: { user: { name: string } };
  vehicle?: { vehicleNumber: string };
}

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  ASSIGNED: { label: 'Designada', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  LOADING: { label: 'Carregando', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  IN_TRANSIT: { label: 'Em Rota', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  DELIVERED: { label: 'Concluída', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  CANCELLED: { label: 'Cancelada', color: 'text-red-700 bg-red-50 border-red-200' },
};

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ isOpen, onClose, customer }) => {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !customer) return;
    setLoading(true);
    setError('');
    api.get<DeliveryRecord[]>(`/deliveries?customerId=${customer.id}`)
      .then((data) => {
        setDeliveries(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setError('Não foi possível carregar o histórico. Tente novamente.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, customer]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">Histórico de Entregas</h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {customer ? customer.name : 'Carregando...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer outline-none">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="animate-spin text-indigo-600 mb-3" size={28} />
              <p className="text-sm font-bold text-slate-600">Carregando histórico...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="text-red-400 mb-3" size={32} />
              <p className="text-sm font-bold text-slate-700">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError('');
                  api.get<DeliveryRecord[]>(`/deliveries?customerId=${customer?.id}`)
                    .then((data) => setDeliveries(Array.isArray(data) ? data : []))
                    .catch(() => setError('Não foi possível carregar o histórico.'))
                    .finally(() => setLoading(false));
                }}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer outline-none"
              >
                Tentar Novamente
              </button>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageCheck className="text-slate-300 mb-3" size={40} />
              <p className="text-sm font-black text-slate-900">Nenhuma entrega registrada</p>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
                Este cliente ainda não possui viagens vinculadas no sistema operacional.
              </p>
            </div>
          ) : (
            deliveries.map((delivery, idx) => {
              const statusInfo = STATUS_MAP[delivery.status] || STATUS_MAP.PENDING;
              const isLast = idx === deliveries.length - 1;
              return (
                <div key={delivery.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                  <div className="flex flex-col items-center pt-1">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border",
                      delivery.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : delivery.status === 'CANCELLED'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    )}>
                      <PackageCheck size={14} />
                    </div>
                    {!isLast && <div className="w-px h-full bg-slate-100 my-1 min-h-[40px]"></div>}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm text-slate-900">
                        {delivery.materialType || 'Carga'}
                      </h4>
                      <span className={cn(
                        "text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap",
                        statusInfo.color
                      )}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                      {delivery.deliveryNumber && (
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          #{delivery.deliveryNumber}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                        <Calendar size={11} />
                        {new Date(delivery.scheduledTime || delivery.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      {delivery.driver?.user?.name && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <User size={11} />
                          {delivery.driver.user.name}
                        </span>
                      )}
                      {delivery.vehicle?.vehicleNumber && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <Truck size={11} />
                          {delivery.vehicle.vehicleNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                        Volume & Destino
                      </span>
                      <span className="font-mono font-black text-slate-700">
                        {delivery.quantity || 'N/I'}
                      </span>
                      <span className="text-slate-300 mx-1">|</span>
                      <span className="text-slate-600">{delivery.deliveryAddress}</span>
                    </div>
                    {delivery.completedAt && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 font-medium">
                        <Clock size={10} />
                        Concluída em: {new Date(delivery.completedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-white shrink-0 flex justify-between items-center gap-2">
          {!loading && !error && (
            <span className="text-[10px] font-bold text-slate-400">
              Exibindo {deliveries.length} {deliveries.length === 1 ? 'viagem' : 'viagens'} operada{deliveries.length === 1 ? '' : 's'}.
            </span>
          )}
          {loading && <span />}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer outline-none"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
