import React, { useState } from 'react';
import { X, User, Phone, MapPin, Loader2, MessageSquare, Building2, StickyNote } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (newCustomer: any) => void;
}

const CustomerFormModal = ({ isOpen, onClose, onCustomerCreated }: CustomerFormModalProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    notes: '',
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/customers', data),
    onSuccess: (data: any) => {
      toast.success('Cliente frotista cadastrado com sucesso no prontuário.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (onCustomerCreated && data) {
        onCustomerCreated(data);
      }
      onClose();
      setFormData({
        name: '',
        phone: '',
        whatsapp: '',
        address: '',
        notes: '',
      });
    },
    onError: () => {
      toast.error('Falha ao processar a averbação do cliente.');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error('Preencha os campos obrigatórios: Razão Social, Telefone e Endereço.');
      return;
    }
    createCustomerMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">Cadastrar Novo Cliente</h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">Vínculo de entrega e faturamento operacional</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer outline-none">
            <X size={18} />
          </button>
        </div>

        {/* Formulário Interno */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Razão Social / Nome Fantasia *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                placeholder="Ex: Construtora Votorantim S/A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Telefone Principal *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="(11) 4002-8922"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">WhatsApp / Plantão</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="(11) 98888-7777"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Endereço Principal / Canteiro de Obra *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                required
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                placeholder="Rodovia Anhanguera, Km 26 - São Paulo, SP"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Instruções Espaciais / Restrições de Descarga</label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 transition-all min-h-[80px]"
                placeholder="Horários permitidos, altura máxima do viaduto local, necessidade de guindaste..."
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createCustomerMutation.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer outline-none"
            >
              {createCustomerMutation.isPending && <Loader2 className="animate-spin shrink-0" size={14} />}
              <span>Salvar Cliente</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CustomerFormModal;
