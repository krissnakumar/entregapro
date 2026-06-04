import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api/client';
import { AuthResponse } from '../types';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>('/auth/login', { email, password });
      setAuth(data.user, data.access_token);
      toast.success(`Bem-vindo de volta, ${data.user.name}`);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Falha ao autenticar. Verifique credenciais e conexão com o backend.');
      toast.error('Não foi possível autenticar no momento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Elementos de Fundo Animados */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <div className="relative z-10 w-full max-w-md p-4">
        {/* Área de Logotipo e Marca */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-8 duration-700">
           <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-2xl shadow-indigo-600/40 mb-6">
              <Activity size={40} className="text-white" />
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter italic">ENTREGAPRO</h1>
           <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-2">Inteligência Logística</p>
        </div>

        {/* Cartão com Efeito Glassmorphism */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-500">
          <h2 className="text-2xl font-black text-white mb-8">Acesso ao Comando</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação da Frota</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input
                  type="text"
                  value={email}
                  placeholder="admin@entregapro.com.br"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave de Segurança</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 font-medium font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-offset-slate-950" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">Lembrar dispositivo</span>
              </label>
              <Link to="/forgot-password" virtual-link="true" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Recuperar acesso?
              </Link>
            </div>

            {error && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in shake duration-500">
                  <div className="p-1.5 bg-rose-500 rounded-lg">
                    <ShieldCheck size={14} className="text-white" />
                  </div>
                  <p className="text-xs font-bold text-rose-400">{error}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="w-full text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Limpar Cache da Sessão
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <div className="flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    <span>Iniciar Sessão</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>
        </div>

        {/* Rodapé Informativo */}
        <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Criptografia SSL</span>
           </div>
           <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
              <Activity size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Rede Estável</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
