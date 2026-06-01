import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, ShieldCheck, Activity, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setSubmitted(true);
    toast.success('Link de redefinição enviado com sucesso');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Elementos de Fundo Animados */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <div className="relative z-10 w-full max-w-md p-4">
        {/* Área de Logotipo e Marca */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-2xl shadow-indigo-600/40 mb-6">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">ENTREGAPRO</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-2">Recuperação de Acesso</p>
        </div>

        {!submitted ? (
          <>
            {/* Cartão com Efeito Glassmorphism - Formulário */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-500">
              <h2 className="text-2xl font-black text-white mb-2">Redefinir Senha</h2>
              <p className="text-slate-400 text-xs font-medium mb-8 leading-relaxed">
                Insira seu e-mail cadastrado e enviaremos um link seguro para redefinir sua senha de acesso à central logística.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    E-mail da Conta
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@entregapro.com.br"
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 font-medium"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group overflow-hidden bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <span>Enviar Link de Redefinição</span>
                    )}
                  </div>
                </button>
              </form>
            </div>

            {/* Link de Voltar */}
            <div className="mt-6 text-center animate-in fade-in zoom-in-95 duration-500 delay-300">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Voltar para o Login
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Estado de Sucesso */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 size={36} className="text-emerald-400" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white mb-2">E-mail Enviado!</h2>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">
                    Se uma conta existir para <strong className="text-white">{email}</strong>, você receberá um link de redefinição de senha em instantes.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    ⏱️ O link expira em <strong className="text-indigo-400">30 minutos</strong>. Verifique também sua caixa de spam ou lixo eletrônico.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center animate-in fade-in zoom-in-95 duration-500">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Retornar ao Login
              </Link>
            </div>
          </>
        )}

        {/* Rodapé Informativo */}
        <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">SSL Seguro</span>
          </div>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
            <Activity size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Criptografia</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
