import React from 'react';
import { X, Wrench, Calendar, Clock, CheckCircle } from 'lucide-react';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: string;
}

interface VehicleLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

const VehicleLogsModal: React.FC<VehicleLogsModalProps> = ({ isOpen, onClose, vehicle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">Ordens de Serviço</h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {vehicle ? `${vehicle.vehicleNumber} - ${vehicle.type}` : 'Carregando...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer outline-none">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 bg-slate-50/50 flex-1 overflow-y-auto space-y-4">
            {/* Mocked Logs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                <div className="flex flex-col items-center pt-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CheckCircle size={14} />
                    </div>
                    <div className="w-px h-full bg-slate-100 my-1 min-h-[40px]"></div>
                </div>
                <div className="flex-1 pb-2">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-slate-900">Troca de Óleo & Filtros</h4>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">O.S. #8492</span>
                    </div>
                    <div className="flex gap-3 mb-2">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Calendar size={11} /> 12 Abr 2026
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Clock size={11} /> 10:00 - 12:30
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        Manutenção preventiva padrão. Substituição de óleo do motor 15W40, filtro de óleo, combustível e ar. Verificação geral de fluidos.
                    </p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                <div className="flex flex-col items-center pt-1">
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                        <Wrench size={14} />
                    </div>
                </div>
                <div className="flex-1 pb-2">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-slate-900">Alinhamento e Balanceamento</h4>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">O.S. #8120</span>
                    </div>
                    <div className="flex gap-3 mb-2">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Calendar size={11} /> 25 Fev 2026
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        Ajuste de cambagem, alinhamento dos eixos traseiros e balanceamento de 6 pneus.
                    </p>
                </div>
            </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-2">
            <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer outline-none"
            >
                Fechar Histórico
            </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleLogsModal;
