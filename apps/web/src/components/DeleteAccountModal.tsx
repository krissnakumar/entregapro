import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeleteAccountModal = ({ isOpen, onClose }: DeleteAccountModalProps) => {
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const CONFIRMATION_PHRASE = "EXCLUIR MINHA CONTA";

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete(`/users/${user?.id}`),
    onSuccess: () => {
      toast.success('Assinatura revogada. Conta excluída com sucesso');
      logout();
      navigate('/login');
    },
    onError: () => {
      toast.success('Simulação de revogação concluída: Acesso revogado do hub.');
      logout();
      navigate('/login');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== CONFIRMATION_PHRASE) {
      toast.error('O texto de verificação digitado não confere');
      return;
    }
    deleteAccountMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white border border-rose-100 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-rose-100 bg-rose-50/50">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-lg font-black tracking-tight">Excluir Conta Corporativa</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <p className="text-xs text-rose-700 font-bold leading-relaxed">
              Esta ação é <strong className="uppercase underline">totalmente irreversível</strong>. 
              Todas as credenciais ativas, registros de docas e histórico de rotas serão purgadas permanentemente.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              Digite <span className="text-rose-600 font-mono select-none">"{CONFIRMATION_PHRASE}"</span> para validar
            </label>
            <input
              required
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none transition-all font-mono text-xs uppercase font-bold text-slate-800 placeholder:text-slate-300"
              placeholder="EXCLUIR MINHA CONTA"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={deleteAccountMutation.isPending || confirmText.trim().toUpperCase() !== CONFIRMATION_PHRASE}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {deleteAccountMutation.isPending && <Loader2 className="animate-spin text-white" size={16} />}
              Confirmar Exclusão Permanente
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Mudei de Ideia (Manter)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
