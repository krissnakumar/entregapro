import React, { useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { User as UserIcon, Mail, Phone, Shield, Save, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { User } from '../types';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteAccountModal from '../components/DeleteAccountModal';

const Profile = () => {
  const { user, setAuth, token } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.patch<User>(`/users/${user?.id}`, data),
    onSuccess: (updatedUser) => {
      setAuth(updatedUser, token!);
      toast.success('Dados pessoais atualizados com sucesso');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: () => {
      toast.error('Falha ao salvar dados do perfil.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('O arquivo de imagem deve ter menos de 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const avatarUrl = String(reader.result || '');
      try {
        const updatedUser = await api.patch<User>(`/users/${user?.id}`, { avatarUrl });
        setAuth(updatedUser, token!);
        toast.success('Foto de perfil atualizada com sucesso');
      } catch {
        toast.error('Falha ao atualizar foto de perfil');
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.onerror = () => {
      setIsUploadingAvatar(false);
      toast.error('Falha ao processar imagem');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-slate-900 to-indigo-950 relative">
          <div className="absolute -bottom-12 left-8 group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-24 h-24 bg-primary text-white text-3xl font-black rounded-2xl flex items-center justify-center border-4 border-white shadow-lg group-hover:opacity-90 transition-opacity overflow-hidden relative">
              {isUploadingAvatar ? (
                <Loader2 className="animate-spin text-white" size={32} />
              ) : user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity">
              <Camera size={20} />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </div>
        
        <div className="pt-16 pb-8 px-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user?.name || 'Administrador Central'}</h2>
          <p className="text-slate-500 flex items-center gap-1.5 mt-1">
            <Shield size={14} className="text-primary" />
            <span className="text-xs font-black uppercase tracking-widest">{user?.role || 'ADMIN'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-8 space-y-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-4 mb-6">
              Informações Cadastrais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none transition-all focus:border-primary"
                    placeholder="Nome de credencial"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Endereço de E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl opacity-60 text-xs font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Telefone Celular / WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none transition-all focus:border-primary"
                    placeholder="+55 11 99999-9999"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button 
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
              >
                {updateProfileMutation.isPending ? <Loader2 className="animate-spin text-white" size={16} /> : <Save size={16} />}
                <span>Salvar Modificações</span>
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Segurança de Assinatura</h3>
            <p className="text-[11px] text-slate-500 font-medium">Modifique a chave secreta associada a este terminal logístico.</p>
            <button 
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-slate-100 shadow-2xs"
            >
              Alterar Senha
            </button>
          </div>

          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="font-black text-xs uppercase tracking-widest text-rose-600">Encerramento de Credencial</h3>
            <p className="text-[11px] text-slate-500 font-medium">A revogação de chaves purga o acesso imediato de todas as docas de carga ativas.</p>
            <button 
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-2xs"
            >
              Excluir Registro
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
      />
    </div>
  );
};

export default Profile;
