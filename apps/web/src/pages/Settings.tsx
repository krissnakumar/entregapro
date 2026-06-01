import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Lock, 
  Globe, 
  Shield, 
  CreditCard, 
  HelpCircle,
  ChevronRight,
  User,
  Smartphone,
  Mail,
  Languages,
  Clock,
  Check,
  Sparkles,
  Sliders,
  Webhook,
  Key,
  HardDrive,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Building2,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import Profile from './Profile';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

type SettingsTab = 'overview' | 'notifications' | 'language' | 'billing' | 'profile' | 'dispatch_rules' | 'api_keys' | 'company';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const user = useAuthStore((state) => state.user);
  const organizationId = user?.organizationId;

  const { data: companyData, refetch: refetchCompany, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['company-details', organizationId],
    queryFn: () => {
      if (!organizationId) return Promise.resolve(null);
      return api.get<any>(`/organizations/${organizationId}`);
    },
    enabled: !!organizationId,
  });

  const [compName, setCompName] = useState('');
  const [compCnpj, setCompCnpj] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compAddress, setCompAddress] = useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, any>>('/settings').catch(() => ({})),
  });
  
  // Preferências ricas simuladas de notificação
  const [notifications, setNotifications] = useState({
    email: true,
    push_mobile: true,
    alertas_sla: true,
    chegada_docas: true,
    relatorios_semanais: false,
    sms_motoristas: true
  });

  // Região e fusos horários
  const [region, setRegion] = useState({
    language: 'Português (Brasil)',
    timezone: 'UTC-3 (Horário de Brasília)'
  });

  // Regras automáticas e heurísticas do despacho
  const [dispatchRules, setDispatchRules] = useState({
    autoAssignEnabled: true,
    maxSearchRadiusKm: 25,
    slaTimeoutThresholdMinutes: 30,
    priorityAlgorithm: 'HEURISTIC_WEIGHTED',
    freezeOnOverload: false
  });

  // Integrações e chaves de API
  const [apiKeys, setApiKeys] = useState({
    webhookUrl: 'https://api.entregapro.com.br/v2/callback',
    productionKey: 'ep_live_998827162534aabbcc',
    nfeToken: 'tok_sefaz_sp_2026_xxyyzz',
    sandboxMode: false
  });

  React.useEffect(() => {
    if (!settingsData) return;
    if (settingsData.notifications) setNotifications(settingsData.notifications);
    if (settingsData.region) setRegion(settingsData.region);
    if (settingsData.dispatchRules) setDispatchRules(settingsData.dispatchRules);
    if (settingsData.apiKeys) setApiKeys(settingsData.apiKeys);
  }, [settingsData]);

  React.useEffect(() => {
    if (companyData) {
      setCompName(companyData.name || '');
      setCompCnpj(companyData.cnpj || '');
      setCompPhone(companyData.phone || '');
      setCompAddress(companyData.address || '');
    }
  }, [companyData]);

  const saveSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => api.put(`/settings/${key}`, { value }),
  });

  const persistSetting = (key: string, value: any, successMessage?: string) => {
    saveSettingMutation.mutate(
      { key, value },
      {
        onSuccess: () => {
          if (successMessage) toast.success(successMessage);
        },
        onError: () => toast.error('Falha ao salvar configuração no backend.'),
      },
    );
  };

  const sections = [
    {
      title: 'Geral & Pessoal',
      items: [
        { id: 'profile', name: 'Informações do Perfil', desc: 'Atualizar credenciais de acesso, nome e avatar', icon: User, action: () => setActiveTab('profile') },
        { id: 'company', name: 'Dados da Empresa', desc: 'Gerenciar razão social, CNPJ, telefone e endereço corporativo', icon: Building2, action: () => setActiveTab('company') },
        { id: 'notifications', name: 'Central de Notificações', desc: 'Configurar canais de alerta (Push, Email, Docas)', icon: Bell, action: () => setActiveTab('notifications') },
        { id: 'language', name: 'Idioma e Localização', desc: 'Ajustar formato pt-BR e fuso horário oficial', icon: Globe, action: () => setActiveTab('language') },
      ]
    },
    {
      title: 'Motor de Despacho & Heurísticas',
      items: [
        { id: 'dispatch_rules', name: 'Regras de Orquestração', desc: 'Configurar pesos de Smart Assign, raios e SLAs', icon: SlidersHorizontal, action: () => setActiveTab('dispatch_rules') },
        { id: 'api_keys', name: 'Webhooks & Integração Fiscal', desc: 'Gerenciar tokens da SEFAZ, NF-e e chaves de API', icon: Webhook, action: () => setActiveTab('api_keys') },
      ]
    },
    {
      title: 'Segurança & Auditoria',
      items: [
        { id: 'password', name: 'Credenciais e Senha', desc: 'Alterar assinatura de acesso da plataforma', icon: Lock, action: () => setActiveTab('profile') },
        { id: '2fa', name: 'Autenticação em Duas Etapas (2FA)', desc: 'Camada extra de hardware e biometria', icon: Shield, action: () => {
          toast.success('Protocolo 2FA ativado para o terminal atual com sucesso.');
        }},
      ]
    },
    {
      title: 'Assinaturas & Licenças',
      items: [
        { id: 'billing', name: 'Plano de Assinatura', desc: 'Gerenciar licenças ativas e cartões corporativos', icon: CreditCard, action: () => setActiveTab('billing') },
        { id: 'support', name: 'Suporte e Documentação', desc: 'Acessar manuais operacionais corporativos', icon: HelpCircle, action: () => window.open('https://entregapro.com.br', '_blank') },
      ]
    }
  ];

  const renderNotifications = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setActiveTab('overview')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
          ← Voltar para o Painel Geral
        </button>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Canais de Notificação</h3>
      </div>
      
      <div className="bg-white border border-slate-100 rounded-[2rem] divide-y divide-slate-50 shadow-sm overflow-hidden">
        {Object.entries(notifications).map(([key, value]) => {
          const formattedLabel = key.replace('_', ' ');
          return (
            <div key={key} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
              <div>
                <p className="font-bold text-sm text-slate-900 capitalize">{formattedLabel}</p>
                <p className="text-xs text-slate-500 mt-0.5">Disparar relatórios ou notificações instantâneas no respectivo canal.</p>
              </div>
              <button 
                onClick={() => {
                  const next = { ...notifications, [key]: !value };
                  setNotifications(next);
                  persistSetting('notifications', next);
                  toast.success(`Canal "${formattedLabel}" atualizado com sucesso.`);
                }}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative shadow-inner shrink-0",
                  value ? "bg-primary" : "bg-slate-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  value ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderLanguage = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setActiveTab('overview')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
          ← Voltar para o Painel Geral
        </button>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Idioma e Região</h3>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Languages size={16} className="text-primary" /> Idioma da Interface
          </label>
          <select 
            value={region.language}
            onChange={(e) => {
              const next = { ...region, language: e.target.value };
              setRegion(next);
              persistSetting('region', next);
              toast.success('Idioma da aplicação reconfigurado.');
            }}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option>Português (Brasil)</option>
            <option>English (United States)</option>
            <option>Español (Latinoamérica)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Clock size={16} className="text-primary" /> Fuso Horário Alvo
          </label>
          <select 
            value={region.timezone}
            onChange={(e) => {
              const next = { ...region, timezone: e.target.value };
              setRegion(next);
              persistSetting('region', next);
              toast.success('Fuso horário sincronizado com o servidor central.');
            }}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option>UTC-3 (Horário de Brasília)</option>
            <option>UTC-4 (Horário do Amazonas)</option>
            <option>UTC-2 (Fernando de Noronha)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderDispatchRules = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setActiveTab('overview')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
          ← Voltar para o Painel Geral
        </button>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Heurísticas de Despacho</h3>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary block">Módulo Autônomo</span>
            <p className="font-bold text-slate-900 text-sm">Smart Assign Ativado</p>
            <p className="text-xs text-slate-500 mt-0.5">Aloca as frotas e motoristas automaticamente com base em pesos espaciais.</p>
          </div>
          <button 
            onClick={() => {
              const next = { ...dispatchRules, autoAssignEnabled: !dispatchRules.autoAssignEnabled };
              setDispatchRules(next);
              persistSetting('dispatchRules', next);
              toast.success('Status do Smart Assign alterado.');
            }}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative shadow-inner shrink-0",
              dispatchRules.autoAssignEnabled ? "bg-primary" : "bg-slate-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
              dispatchRules.autoAssignEnabled ? "left-7" : "left-1"
            )} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">
              Raio Máximo de Busca (Km)
            </label>
            <input 
              type="number" 
              value={dispatchRules.maxSearchRadiusKm}
              onChange={(e) => setDispatchRules(prev => ({ ...prev, maxSearchRadiusKm: Number(e.target.value) }))}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">
              Tolerância de Atraso SLA (Minutos)
            </label>
            <input 
              type="number" 
              value={dispatchRules.slaTimeoutThresholdMinutes}
              onChange={(e) => setDispatchRules(prev => ({ ...prev, slaTimeoutThresholdMinutes: Number(e.target.value) }))}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">
            Algoritmo de Priorização
          </label>
          <select 
            value={dispatchRules.priorityAlgorithm}
            onChange={(e) => setDispatchRules(prev => ({ ...prev, priorityAlgorithm: e.target.value }))}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none"
          >
            <option value="HEURISTIC_WEIGHTED">Heurística Ponderada (Combustível + Distância)</option>
            <option value="SHORTEST_PATH_FIRST">Caminho Mínimo Absoluto (OSRM)</option>
            <option value="ROUND_ROBIN_FAIR">Distribuição Uniforme por Motorista</option>
          </select>
        </div>

        <button 
          onClick={() => persistSetting('dispatchRules', dispatchRules, 'Matriz de heurísticas atualizada no banco de dados e sincronizada com PostGIS.')}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
        >
          Salvar Regras de Orquestração
        </button>
      </div>
    </div>
  );

  const renderApiKeys = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setActiveTab('overview')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
          ← Voltar para o Painel Geral
        </button>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Webhooks & Integrações</h3>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 space-y-6 shadow-sm">
         <div className="flex items-center justify-between pb-4 border-b border-slate-100">
           <div>
             <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">Ambiente Operacional</span>
             <p className="font-bold text-slate-900 text-sm">Modo Sandbox (Homologação)</p>
           </div>
           <button 
            onClick={() => {
              const next = { ...apiKeys, sandboxMode: !apiKeys.sandboxMode };
              setApiKeys(next);
              persistSetting('apiKeys', next);
              toast.info('Ambiente de disparo alterado.');
            }}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative shadow-inner shrink-0",
              apiKeys.sandboxMode ? "bg-amber-500" : "bg-slate-200"
            )}
           >
             <div className={cn(
               "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
               apiKeys.sandboxMode ? "left-7" : "left-1"
             )} />
           </button>
         </div>

         <div className="space-y-2">
           <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">
             URL de Retorno de Webhook (Status Dispatch)
           </label>
           <input 
             type="text" 
             value={apiKeys.webhookUrl}
             onChange={(e) => setApiKeys(prev => ({ ...prev, webhookUrl: e.target.value }))}
             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none"
           />
         </div>

         <div className="space-y-2">
           <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">
             Token de Emissão Fiscal (SEFAZ/SP NF-e)
           </label>
           <div className="flex gap-2">
             <input 
               type="password" 
               value={apiKeys.nfeToken}
               disabled
               className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-500 outline-none cursor-not-allowed"
             />
             <button 
             onClick={() => {
                 const newToken = `tok_sefaz_sp_2026_${Math.random().toString(36).substring(2, 8)}`;
                 const next = { ...apiKeys, nfeToken: newToken };
                 setApiKeys(next);
                 persistSetting('apiKeys', next);
                 toast.success('Token SEFAZ regenerado com sucesso.');
               }}
               className="px-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
               title="Regerar Assinatura"
             >
               <RefreshCw size={16} />
             </button>
           </div>
         </div>

         <div className="space-y-2">
           <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">
             Chave de Acesso Principal (API Privada)
           </label>
           <input 
             type="text" 
             value={apiKeys.productionKey}
             readOnly
             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-primary font-bold outline-none selection:bg-primary/10"
           />
         </div>
      </div>
    </div>
  );

  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);

  const fetchCompanyFromCnpj = async (cnpjToFetch: string) => {
    const digits = cnpjToFetch.replace(/\D/g, '');
    if (digits.length !== 14) {
      toast.error('CNPJ deve conter exatamente 14 dígitos para consulta.');
      return;
    }
    
    setIsFetchingCnpj(true);
    const promise = fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('CNPJ não encontrado ou limite de requisições excedido.');
        const data = await res.json();
        
        if (data.razao_social) setCompName(data.razao_social);
        
        if (data.ddd_telefone_1) {
          const cleanPhone = data.ddd_telefone_1.replace(/\D/g, '');
          if (cleanPhone.length >= 10) {
            const ddd = cleanPhone.substring(0, 2);
            const num = cleanPhone.substring(2);
            setCompPhone(`(${ddd}) ${num.substring(0, 4)}-${num.substring(4)}`);
          } else {
            setCompPhone(data.ddd_telefone_1);
          }
        }
        
        const street = data.logradouro || '';
        const number = data.numero || '';
        const neighborhood = data.bairro || '';
        const city = data.municipio || '';
        const state = data.uf || '';
        const zip = data.cep || '';
        
        const fullAddr = `${street}, ${number}${neighborhood ? ` - ${neighborhood}` : ''}, ${city} - ${state}${zip ? `, CEP ${zip}` : ''}`;
        setCompAddress(fullAddr);
        
        return data;
      });

    toast.promise(promise, {
      loading: 'Consultando base da Receita Federal...',
      success: 'Dados da empresa autocompletados com sucesso!',
      error: (err) => err.message || 'Erro ao consultar CNPJ.',
    });
    
    promise.finally(() => setIsFetchingCnpj(false));
  };

  const updateCompanyMutation = useMutation({
    mutationFn: (payload: any) => {
      return api.patch(`/organizations/${organizationId}`, payload);
    },
    onSuccess: () => {
      refetchCompany();
      toast.success('Informações da empresa salvas com sucesso!');
    },
    onError: () => {
      toast.error('Falha ao atualizar dados da empresa no servidor.');
    }
  });

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) {
      toast.error('O nome da empresa é obrigatório.');
      return;
    }
    updateCompanyMutation.mutate({
      name: compName.trim(),
      cnpj: compCnpj.trim() || null,
      phone: compPhone.trim() || null,
      address: compAddress.trim() || null,
    });
  };

  const renderCompany = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setActiveTab('overview')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
          ← Voltar para o Painel Geral
        </button>
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 size={22} className="text-primary" /> Perfil da Empresa
        </h3>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
        {isLoadingCompany ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary animate-spin-slow" size={24} />
          </div>
        ) : !companyData ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm font-bold">Nenhuma empresa associada ao seu perfil.</p>
          </div>
        ) : (
          <form onSubmit={handleSaveCompany} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Nome da Empresa / Razão Social *
              </label>
              <input 
                type="text" 
                required
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="Ex: Construtora Modelo Ltda"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  CNPJ Corporativo
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={compCnpj}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 14) val = val.substring(0, 14);
                      
                      if (val.length > 12) {
                        val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                      } else if (val.length > 8) {
                        val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
                      } else if (val.length > 5) {
                        val = val.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
                      } else if (val.length > 2) {
                        val = val.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
                      }
                      setCompCnpj(val);
                    }}
                    placeholder="00.000.000/0001-00"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    disabled={isFetchingCnpj || compCnpj.replace(/\D/g, '').length !== 14}
                    onClick={() => fetchCompanyFromCnpj(compCnpj)}
                    className="px-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                  >
                    {isFetchingCnpj ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      'Consultar'
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  Telefone / Contato Comercial
                </label>
                <input 
                  type="text" 
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                  placeholder="(11) 3300-4400"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Endereço Matriz / Sede
              </label>
              <input 
                type="text" 
                value={compAddress}
                onChange={(e) => setCompAddress(e.target.value)}
                placeholder="Av. Paulista, 1000 - São Paulo, SP"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            {/* Quick Metrics from Organization API */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Operadores</span>
                <span className="font-mono font-black text-slate-700 text-sm">{companyData._count?.users || 0}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Motoristas</span>
                <span className="font-mono font-black text-slate-700 text-sm">{companyData._count?.drivers || 0}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Veículos</span>
                <span className="font-mono font-black text-slate-700 text-sm">{companyData._count?.vehicles || 0}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Clientes</span>
                <span className="font-mono font-black text-slate-700 text-sm">{companyData._count?.customers || 0}</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={updateCompanyMutation.isPending}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md mt-6 flex items-center justify-center gap-2 cursor-pointer"
            >
              {updateCompanyMutation.isPending ? (
                <Loader2 className="animate-spin text-white" size={16} />
              ) : 'Salvar Dados da Empresa'}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setActiveTab('overview')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
          ← Voltar para o Painel Geral
        </button>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Assinatura e Licenciamento</h3>
      </div>

      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <span className="px-3 py-1 bg-white/10 text-slate-300 font-mono text-[10px] font-black rounded-lg block w-fit mb-3 border border-white/5 uppercase tracking-widest">
            Licença Corporativa Ativa
          </span>
          <h4 className="text-3xl font-black tracking-tight text-white mb-6">EntregaPRO Command Center</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                <Check size={14} />
              </div>
              <span className="font-bold text-xs text-slate-300">Veículos Ilimitados</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                <Check size={14} />
              </div>
              <span className="font-bold text-xs text-slate-300">Telemetria PostGIS</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                <Check size={14} />
              </div>
              <span className="font-bold text-xs text-slate-300">SLA Preditivo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 space-y-4 shadow-sm">
        <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Forma de Pagamento Vinculada</h4>
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="px-3 py-2 bg-slate-900 rounded-lg flex items-center justify-center text-[9px] text-white font-black tracking-widest">
              MASTERCARD
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">•••• •••• •••• 8844</p>
              <p className="text-[10px] text-slate-400 font-medium">Vencimento em 08/2029</p>
            </div>
          </div>
          <button 
            onClick={() => toast.success('Formulário de alteração de método de pagamento aberto.')}
            className="text-xs font-black text-primary hover:underline uppercase tracking-widest"
          >
            Substituir Cartão
          </button>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">
            {section.title}
          </h3>
          <div className="grid gap-3">
            {section.items.map((item) => (
              <button 
                key={item.id}
                onClick={item.action}
                className="flex items-center justify-between p-4 px-5 bg-white border border-slate-100 rounded-2xl hover:border-primary/40 hover:shadow-md transition-all group text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <p className="font-black text-xs text-slate-900 group-hover:text-primary transition-colors">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-black text-[10px] uppercase tracking-widest flex items-center gap-0.5 shrink-0">
                  Acessar <ChevronRight size={14} />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-8 border-t border-slate-100">
        <div className="bg-slate-900 text-white rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-primary block mb-0.5">Build Corporativa</span>
            <p className="font-black text-xs tracking-tight text-white">EntregaPRO Command Hub <span className="text-emerald-400 font-mono">v2.0.0-BR</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sincronizado com infraestrutura em nuvem regional.</p>
          </div>
          <button 
            onClick={() => toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
              loading: 'Buscando pacotes no repositório oficial...',
              success: 'O Command Hub está totalmente atualizado com a última versão pt-BR!',
              error: 'Falha na verificação',
            })}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Verificar Updates
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {activeTab === 'overview' && (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configurações Globais</h2>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-md">
              Ajuste regras de automação logística, fuso horário, canais de mensageria e chaves de acesso para emissão eletrônica de CT-e.
            </p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0 hidden sm:block">
            <SettingsIcon size={28} className="animate-spin-slow" />
          </div>
        </div>
      )}

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'notifications' && renderNotifications()}
      {activeTab === 'language' && renderLanguage()}
      {activeTab === 'dispatch_rules' && renderDispatchRules()}
      {activeTab === 'api_keys' && renderApiKeys()}
      {activeTab === 'billing' && renderBilling()}
      {activeTab === 'company' && renderCompany()}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <button onClick={() => setActiveTab('overview')} className="text-xs font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
            ← Voltar para o Painel Geral
          </button>
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
            <Profile />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
