import React from 'react';
import { X, Building2, PackageCheck, Calendar, MapPin, Truck } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  status?: string;
}

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ isOpen, onClose, customer }) => {
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
            {/* Mocked History */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                <div className="flex flex-col items-center pt-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <PackageCheck size={14} />
                    </div>
                    <div className="w-px h-full bg-slate-100 my-1 min-h-[40px]"></div>
                </div>
                <div className="flex-1 pb-2">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-slate-900">Entrega de Concreto FCK 30</h4>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Concluída</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mb-3">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Calendar size={11} /> 18 Mai 2026
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Truck size={11} /> Betoneira CBT-001
                        </span>
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Volume Descarregado</span>
                            <span className="font-mono font-black text-slate-700">12 m³</span>
                        </div>
                        <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline outline-none cursor-pointer">
                            Ver Manifesto
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                <div className="flex flex-col items-center pt-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <PackageCheck size={14} />
                    </div>
                </div>
                <div className="flex-1 pb-2">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-slate-900">Entrega de Agregados (Areia)</h4>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Concluída</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mb-3">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Calendar size={11} /> 10 Mai 2026
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Truck size={11} /> Basculante BASC-02
                        </span>
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Volume Descarregado</span>
                            <span className="font-mono font-black text-slate-700">18 Toneladas</span>
                        </div>
                        <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline outline-none cursor-pointer">
                            Ver Manifesto
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-white shrink-0 flex justify-between items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400">Exibindo últimas 2 viagens operadas.</span>
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
