import React, { useState, useEffect } from 'react';
import { X, Truck, Gauge, Fuel, Loader2, Calendar, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleCreated?: (newVehicle: any) => void;
  vehicleToEdit?: any | null;
}

const VehicleFormModal = ({ isOpen, onClose, onVehicleCreated, vehicleToEdit }: VehicleFormModalProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    type: 'Caminhão Betoneira',
    capacity: '',
    fuelType: 'Diesel S10',
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    maintenanceDue: '',
    imageUrl: '',
  });

  useEffect(() => {
    if (vehicleToEdit) {
      setFormData({
        vehicleNumber: vehicleToEdit.vehicleNumber || '',
        type: vehicleToEdit.type || 'Caminhão Betoneira',
        capacity: String(vehicleToEdit.capacity || ''),
        fuelType: vehicleToEdit.fuelType || 'Diesel S10',
        status: vehicleToEdit.status || 'active',
        maintenanceDue: vehicleToEdit.lastMaintenance ? new Date(vehicleToEdit.lastMaintenance).toISOString().split('T')[0] : '',
        imageUrl: vehicleToEdit.imageUrl || '',
      });
    } else {
      setFormData({
        vehicleNumber: '',
        type: 'Caminhão Betoneira',
        capacity: '',
        fuelType: 'Diesel S10',
        status: 'active',
        maintenanceDue: '',
        imageUrl: '',
      });
    }
  }, [vehicleToEdit, isOpen]);

  const createVehicleMutation = useMutation({
    mutationFn: (data: any) => api.post('/vehicles', data),
    onSuccess: (data: any) => {
      toast.success('Ativo incorporado à matriz operacional de frotas.', {
        icon: <Sparkles className="text-indigo-600 shrink-0" size={16} />
      });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      if (onVehicleCreated && data) {
        onVehicleCreated(data);
      }
      onClose();
    },
    onError: () => {
      toast.error('Falha ao processar averbação do ativo no prontuário.');
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/vehicles/${vehicleToEdit.id}`, data),
    onSuccess: () => {
      toast.success('Ativo frotista atualizado com sucesso!', {
        icon: <CheckCircle2 className="text-indigo-600 shrink-0" size={16} />
      });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao atualizar o ativo frotista.');
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleNumber || !formData.capacity) {
      toast.error('Informe a Placa de Identificação e a Capacidade do Ativo.');
      return;
    }

    const payload = {
      vehicleNumber: formData.vehicleNumber,
      type: formData.type,
      capacity: parseFloat(formData.capacity) || 0,
      fuelType: formData.fuelType,
      status: formData.status,
      lastMaintenance: formData.maintenanceDue ? new Date(formData.maintenanceDue).toISOString() : undefined,
      imageUrl: formData.imageUrl || null,
    };

    if (vehicleToEdit) {
      updateVehicleMutation.mutate(payload);
    } else {
      createVehicleMutation.mutate(payload);
    }
  };

  const handleApplyPreset = (type: string, capacity: string, fuel: string) => {
    setFormData(prev => ({
      ...prev,
      type,
      capacity,
      fuelType: fuel
    }));
    toast.success(`Pré-configuração carregada: ${type} (${capacity}T)`);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 md:p-6 font-sans select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">
                {vehicleToEdit ? 'Editar Ativo Frotista' : 'Averbar Unidade Frotista'}
              </h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {vehicleToEdit ? 'Modificação de especificações técnicas do veículo' : 'Cadastramento de veículos e máquinas pesadas'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer outline-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white">
          
          {/* Tira de Configurações Rápidas - Hidden in Edit Mode */}
          {!vehicleToEdit && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Perfis Frotistas Sugeridos</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button" 
                  onClick={() => handleApplyPreset('Caminhão Betoneira', '24.0', 'Diesel S10')}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 rounded-xl text-left transition-all group cursor-pointer outline-none"
                >
                  <span className="text-[11px] font-black text-slate-800 block group-hover:text-indigo-600 truncate">Betoneira 8m³</span>
                  <span className="text-[9px] font-mono font-medium text-slate-400">24.0T Diesel</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => handleApplyPreset('Caçamba Basculante', '18.0', 'Diesel S500')}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 rounded-xl text-left transition-all group cursor-pointer outline-none"
                >
                  <span className="text-[11px] font-black text-slate-800 block group-hover:text-indigo-600 truncate">Basculante</span>
                  <span className="text-[9px] font-mono font-medium text-slate-400">18.0T S500</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => handleApplyPreset('Pá Carregadeira', '14.0', 'Diesel S10')}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 rounded-xl text-left transition-all group cursor-pointer outline-none"
                >
                  <span className="text-[11px] font-black text-slate-800 block group-hover:text-indigo-600 truncate">Maquinário</span>
                  <span className="text-[9px] font-mono font-medium text-slate-400">14.0T Pátio</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 mb-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Foto ou Imagem do Veículo</label>
            <div className="flex items-center gap-3">
              {formData.imageUrl ? (
                <img src={formData.imageUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 animate-in fade-in" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase">
                  Foto
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="vehicle-image-upload"
                />
                <label
                  htmlFor="vehicle-image-upload"
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-block outline-none"
                >
                  Selecionar Imagem
                </label>
                {formData.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="ml-2 text-xs font-bold text-rose-600 hover:text-rose-700 outline-none"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Identificação / Placa *</label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                required
                type="text"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all uppercase"
                placeholder="ABC-1234 ou BT-09"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Tipo do Ativo *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="Caminhão Betoneira">Caminhão Betoneira</option>
                <option value="Caçamba Basculante">Caçamba Basculante</option>
                <option value="Cavalo Mecânico">Cavalo Mecânico</option>
                <option value="Pá Carregadeira">Pá Carregadeira</option>
                <option value="Caminhão Pipa/Apoio">Caminhão Pipa/Apoio</option>
                <option value="Veículo Leve / Frota">Veículo Leve / Frota</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Capacidade (Ton/m³) *</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  required
                  type="text"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value.replace(/[^\d.]/g, '') })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="Ex: 24.5"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Combustível Especificado *</label>
              <div className="relative">
                <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Diesel S10">Diesel S10</option>
                  <option value="Diesel S500">Diesel S500</option>
                  <option value="Arla 32 Dedicado">Arla 32 Dedicado</option>
                  <option value="Etanol/Flex">Etanol/Flex</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Vencimento da Revisão</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={formData.maintenanceDue}
                  onChange={(e) => setFormData({ ...formData, maintenanceDue: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Status Operacional *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="active">Operante / Ativo</option>
              <option value="maintenance">Em Manutenção</option>
              <option value="inactive">Inativo / Fora de Serviço</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5">
             <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
             <p className="text-[10px] text-slate-500 font-medium leading-tight">
               Ativos integrados ativam relatórios no <strong className="text-slate-700">Motor Antifraude</strong> para auditorias contínuas de abastecimento e hodômetro.
             </p>
          </div>

          {/* Rodapé Interno */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
              className="px-5 py-2 bg-primary hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer outline-none"
            >
              {createVehicleMutation.isPending || updateVehicleMutation.isPending ? (
                <Loader2 className="animate-spin shrink-0" size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>{vehicleToEdit ? 'Atualizar Ativo' : 'Salvar Ativo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleFormModal;
