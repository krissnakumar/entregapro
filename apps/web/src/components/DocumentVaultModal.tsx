import React from 'react';
import { X, FileCheck, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface DocumentVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'driver' | 'vehicle' | 'customer';
  entityId: string;
  entityName: string;
}

export const DocumentVaultModal: React.FC<DocumentVaultModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">Cofre de Documentos</h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">{entityName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer outline-none">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 bg-white flex-1 overflow-y-auto min-h-[200px] flex flex-col items-center justify-center text-center">
            <FileCheck className="text-slate-300 mb-2" size={40} />
            <p className="text-sm font-black text-slate-900">Nenhum documento anexado</p>
            <p className="text-xs text-slate-400 font-medium max-w-[250px]">
              Faça o upload dos documentos e certidões necessários para este {entityType === 'driver' ? 'condutor' : entityType === 'vehicle' ? 'veículo' : 'cliente'}.
            </p>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer outline-none"
            >
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};
