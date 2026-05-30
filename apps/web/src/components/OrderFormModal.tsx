import React, { useState } from 'react';
import { X, Package, User, MapPin, Loader2, Calendar, Clipboard, Plus, Truck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import CustomerFormModal from './CustomerFormModal';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fallback robusto inicial com dados reais para garantir funcionamento mesmo offline ou com 401
const INITIAL_CUSTOMERS: any[] = [];

const INITIAL_DRIVERS: any[] = [];

const OrderFormModal = ({ isOpen, onClose }: OrderFormModalProps) => {
  const queryClient = useQueryClient();
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Local state for dynamically added customers during this session
  const [localAddedCustomers, setLocalAddedCustomers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    materialType: 'Concrete',
    quantity: '',
    scheduledTime: new Date().toISOString().slice(0, 16),
    notes: '',
    driverId: '',
    vehicleId: '',
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<any[]>('/customers'),
    retry: false,
  });

  const { data: drivers, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<any[]>('/drivers'),
    retry: false,
  });

  // Mescla a resposta do servidor com o fallback local
  const baseList = (customers && customers.length > 0)
    ? customers
    : INITIAL_CUSTOMERS;

  // Garante que clientes novos adicionados localmente apareçam primeiro e sem duplicação
  const customersList = [
    ...localAddedCustomers,
    ...baseList.filter(bc => !localAddedCustomers.some(lac => lac.id === bc.id))
  ];

  const driversList = (drivers && drivers.length > 0)
    ? drivers.map((d: any) => ({
        id: d.id,
        name: d.user?.name || d.name,
        vehicle: d.vehicle || d.currentVehicle || null
      }))
    : INITIAL_DRIVERS;

  const createOrderMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/dispatch', data),
    onSuccess: () => {
      toast.success('Pedido criado e entrega agendada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['deliveries-live'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      setFormData({
        customerId: '',
        materialType: 'Concrete',
        quantity: '',
        scheduledTime: new Date().toISOString().slice(0, 16),
        notes: '',
        driverId: '',
        vehicleId: '',
      });
    },
    onError: (error: Error) => {
      toast.error('Falha ao criar pedido no backend.');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error('Por favor, selecione um cliente.');
      return;
    }
    createOrderMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
          <h3 className="text-base font-black text-slate-900 leading-none">Criar Novo Pedido</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer outline-none text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Selecionar Cliente</label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-[11px] text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1 transition-colors outline-none cursor-pointer"
              >
                <Plus size={12} />
                Novo Cliente
              </button>
            </div>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none text-slate-800 font-bold text-xs cursor-pointer"
              >
                <option value="">
                  {isLoadingCustomers ? 'Carregando clientes...' : 'Escolha um cliente...'}
                </option>
                {customersList.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
            
            {formData.customerId && (
              <p className="text-[10px] text-slate-500 font-bold flex items-center px-1">
                <MapPin size={10} className="mr-1 text-indigo-600" />
                {customersList.find(c => c.id === formData.customerId)?.address}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Material</label>
              <div className="relative">
                <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={formData.materialType}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none text-slate-800 font-bold text-xs cursor-pointer"
                >
                  <option value="Concrete">Concreto</option>
                  <option value="Gravel">Cascalho</option>
                  <option value="Sand">Areia</option>
                  <option value="Asphalt">Asfalto</option>
                  <option value="Bricks">Tijolos</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Quantidade / Carga</label>
              <div className="relative">
                <Clipboard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-800 font-bold text-xs"
                  placeholder="Ex: 10m³"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Data/Hora Agendada</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-800 font-bold text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Designar Motorista (Opcional)</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={formData.driverId}
                onChange={(e) => {
                  const dId = e.target.value;
                  const selectedDriver = driversList.find(d => d.id === dId);
                  setFormData({
                    ...formData,
                    driverId: dId,
                    vehicleId: selectedDriver?.vehicle?.id || selectedDriver?.vehicle?.vehicleNumber || '',
                  });
                }}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none text-slate-800 font-bold text-xs cursor-pointer"
              >
                <option value="">
                  {isLoadingDrivers ? 'Carregando motoristas...' : 'Escolha um motorista...'}
                </option>
                {driversList.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>
            {formData.driverId && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl animate-in slide-in-from-top-1 duration-200">
                <p className="text-[10px] font-black uppercase text-slate-400 flex items-center mb-1.5">
                  <Truck size={12} className="mr-1 text-indigo-600" />
                  Veículo Vinculado Automaticamente
                </p>
                {driversList.find(d => d.id === formData.driverId)?.vehicle ? (
                  <div className="flex items-center justify-between text-xs font-black text-slate-800 pl-4">
                    <span>{driversList.find(d => d.id === formData.driverId).vehicle.type}</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 text-[10px]">
                      Placa: {driversList.find(d => d.id === formData.driverId).vehicle.vehicleNumber}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-bold pl-4">
                    Nenhum veículo vinculado a este motorista.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Instruções de Descarregamento</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all min-h-[80px] text-xs font-bold text-slate-800"
              placeholder="Instruções para o motorista, código do portão, restrições locais, etc."
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors outline-none cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createOrderMutation.isPending}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/10 active:scale-95 transition-all flex items-center gap-2 outline-none cursor-pointer"
            >
              {createOrderMutation.isPending && <Loader2 className="animate-spin" size={18} />}
              Confirmar Pedido
            </button>
          </div>
        </form>
      </div>

      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={(newCustomer) => {
          setLocalAddedCustomers(prev => [newCustomer, ...prev]);
          setFormData((prev) => ({ ...prev, customerId: newCustomer.id }));
          setIsCustomerModalOpen(false);
          toast.success(`Cliente ${newCustomer.name} criado e selecionado!`);
        }}
      />
    </div>
  );
};

export default OrderFormModal;
