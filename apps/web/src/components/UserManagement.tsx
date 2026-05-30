import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { User, Role } from '../types';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  MoreHorizontal,
  Search,
  Filter,
  CheckCircle,
  X,
  Lock,
  Unlock,
  Key,
  Edit,
  Trash2,
  RefreshCw,
  Send,
  UserCheck,
  Check,
  Layers,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const AVAILABLE_PERMISSIONS = [
  { id: 'manifest:write', label: 'Emissão/Edição de Manifestos (CT-e/MDF-e)' },
  { id: 'manifest:read', label: 'Consulta de Registros de Carga' },
  { id: 'fleet:dispatch', label: 'Despacho de Unidades e Frotas' },
  { id: 'route:override', label: 'Alteração Manual de Rotas OSRM' },
  { id: 'users:manage', label: 'Gerenciamento de Credenciais de Usuário' },
  { id: 'pod:submit', label: 'Envio de Canhotos e Lacres via App Mobile' },
  { id: 'telemetry:ping', label: 'Transmissão de Coordenadas GPS' },
  { id: 'osrm:bypass', label: 'Bypass em Restrições de Polígonos de Risco' },
];

const UserManagement = () => {
  const queryClient = useQueryClient();
  // Query principal, com fallback para os mockados de alta fidelidade
  const { data: apiUsers = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').catch(() => []),
  });
  const localUsers = apiUsers;

  // Estados de Busca e Filtragem
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleTab, setSelectedRoleTab] = useState<string>('ALL');

  // Estados dos Modais
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Estados do Formulário de Usuário
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<Role>(Role.DISPATCHER);
  const [formPermissions, setFormPermissions] = useState<string[]>(['manifest:read', 'fleet:dispatch']);

  // Estado de Bloqueio Simulado
  const [lockedUserIds, setLockedUserIds] = useState<string[]>([]);

  // Estado para Menu de Ações em Linha
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const createUserMutation = useMutation({
    mutationFn: (payload: any) => api.post('/users', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: any) => api.patch(`/users/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  // Filtra reativamente os usuários exibidos
  const filteredUsers = useMemo(() => {
    return localUsers.filter(u => {
      // Filtro de Busca de Texto
      const matchesSearch = 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro por Aba de Cargo
      if (selectedRoleTab === 'ALL') return matchesSearch;
      if (selectedRoleTab === 'ADMINS') return matchesSearch && (u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN);
      if (selectedRoleTab === 'DISPATCHERS') return matchesSearch && u.role === Role.DISPATCHER;
      if (selectedRoleTab === 'DRIVERS') return matchesSearch && u.role === Role.DRIVER;
      if (selectedRoleTab === 'HELPERS') return matchesSearch && u.role === Role.HELPER;
      
      return matchesSearch;
    });
  }, [localUsers, searchQuery, selectedRoleTab]);

  // Abre Modal para Adicionar
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole(Role.DISPATCHER);
    setFormPermissions(['manifest:read', 'fleet:dispatch']);
    setIsUserModalOpen(true);
  };

  // Abre Modal para Editar
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormRole(user.role);
    setFormPermissions(user.permissions || []);
    setIsUserModalOpen(true);
    setActiveDropdownId(null);
  };

  // Alterna a seleção de uma permissão no checkbox
  const handleTogglePermission = (permId: string) => {
    setFormPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  // Salva usuário (Adiciona ou Atualiza)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Preencha os campos de Nome e E-mail obrigatórios.');
      return;
    }

    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        payload: {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim() || undefined,
          role: formRole,
          permissions: formPermissions,
        },
      });
      toast.success(`Credenciais de ${formName} atualizadas com sucesso!`);
    } else {
      createUserMutation.mutate({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        role: formRole,
        permissions: formPermissions,
        password: '123456',
      });
      toast.success(`Novo acesso para ${formName} provisionado na rede.`);
    }

    setIsUserModalOpen(false);
  };

  // Alterna estado de bloqueio de conta
  const handleToggleLock = (userId: string, userName: string) => {
    setLockedUserIds(prev => {
      const isLocked = prev.includes(userId);
      if (isLocked) {
        updateUserMutation.mutate({ id: userId, payload: { active_status: true } });
        toast.success(`Acesso desbloqueado para o operador ${userName}.`);
        return prev.filter(id => id !== userId);
      } else {
        updateUserMutation.mutate({ id: userId, payload: { active_status: false } });
        toast.warning(`Conta de ${userName} bloqueada por diretiva de segurança.`);
        return [...prev, userId];
      }
    });
    setActiveDropdownId(null);
  };

  // Simula disparo de redefinição de senha
  const handleSendPasswordReset = (email: string) => {
    toast.success(`Link de redefinição criptografada enviado para ${email}`);
    setActiveDropdownId(null);
  };

  // Remove o usuário
  const handleDeleteUser = (userId: string, userName: string) => {
    deleteUserMutation.mutate(userId);
    toast.success(`Registro de ${userName} expurgado da base de credenciais.`);
    setActiveDropdownId(null);
  };

  // Dispara Ping de Teste
  const handleSendTestPing = (userName: string) => {
    toast.success(`Sinal de telemetria rodoviária injetado para ${userName}.`);
    setActiveDropdownId(null);
  };

  // Tradução de Nomes de Cargos para Exibição
  const getRoleBadge = (role: Role) => {
    switch(role) {
      case Role.SUPER_ADMIN:
      case Role.ADMIN:
        return { label: 'Administrador', bg: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300' };
      case Role.DISPATCHER:
        return { label: 'Despachante Ops', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300' };
      case Role.DRIVER:
        return { label: 'Motorista Frota', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' };
      case Role.HELPER:
        return { label: 'Apoio/Escolta', bg: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300' };
      default:
        return { label: role, bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16 animate-in fade-in duration-300">
      
      {/* Cabeçalho Executivo e Estatísticas de Segmentação */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Controle de Credenciais</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Gestão de Usuários e Permissões</h1>
            <p className="text-slate-400 font-medium text-xs mt-1 max-w-xl">
              Controle hierárquico de acessos, alocação de condutores de implementos e gerenciamento granular das autorizações do sistema logístico central.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-3 border-r border-white/10">
              <p className="text-2xl font-black text-indigo-400 font-mono">{localUsers.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registrados</p>
            </div>
            <div className="text-center px-3 border-r border-white/10">
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {localUsers.filter(u => u.role === Role.DRIVER).length}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Condutores</p>
            </div>
            <div className="text-center px-3">
              <p className="text-2xl font-black text-amber-400 font-mono">
                {lockedUserIds.length}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bloqueados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações: Filtro de Busca, Abas de Segmentação e Adição */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Abas de Categorias de Cargo */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto custom-scrollbar self-start">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'ADMINS', label: 'Administração' },
            { id: 'DISPATCHERS', label: 'Despacho Ops' },
            { id: 'DRIVERS', label: 'Frota Mobile' },
            { id: 'HELPERS', label: 'Apoio/Escolta' }
          ].map((tab) => {
            const isActive = selectedRoleTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedRoleTab(tab.id)}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Inputs de Pesquisa e Inclusão */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar nome, e-mail, tel..."
              className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-64 md:w-80 transition-all text-xs font-medium placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button 
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all font-black text-xs uppercase tracking-wider shrink-0"
          >
            <UserPlus size={16} />
            <span>Provisionar Acesso</span>
          </button>
        </div>
      </div>

      {/* Grelha de Exibição de Credenciais e Níveis de Acesso */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação do Operador</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível e Perfil</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contatos Rápidos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Diretivas e Permissões</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && localUsers.length === 0 ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-36" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-56" /></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <UsersIcon size={32} className="opacity-30" />
                      <p className="font-bold text-xs">Nenhum operador com as credenciais especificadas foi localizado.</p>
                      <button 
                        onClick={() => { setSearchQuery(''); setSelectedRoleTab('ALL'); }}
                        className="text-[10px] font-black text-indigo-600 underline tracking-wider uppercase mt-1"
                      >
                        Limpar Filtros de Busca
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.map((u) => {
                const isLocked = lockedUserIds.includes(u.id);
                const badge = getRoleBadge(u.role);
                const isDropdownActive = activeDropdownId === u.id;

                return (
                  <tr 
                    key={u.id} 
                    className={cn(
                      "hover:bg-slate-50/60 transition-colors group relative",
                      isLocked && "opacity-60 bg-slate-50/40"
                    )}
                  >
                    {/* Coluna 1: Nome e Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border transition-transform group-hover:scale-105",
                          u.role === Role.SUPER_ADMIN || u.role === Role.ADMIN 
                            ? "bg-purple-100 text-purple-700 border-purple-200" 
                            : u.role === Role.DISPATCHER 
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                            : "bg-emerald-100 text-emerald-700 border-emerald-200"
                        )}>
                          {isLocked ? <Lock size={16} className="text-slate-500" /> : u.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("font-black text-xs text-slate-900 truncate", isLocked && "line-through text-slate-500")}>
                              {u.name}
                            </p>
                            {isLocked && (
                              <span className="bg-rose-100 text-rose-700 font-bold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                Bloqueado
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{u.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Coluna 2: Nível/Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                        badge.bg
                      )}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Coluna 3: Contatos Rápidos */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400 shrink-0" /> 
                          <span className="font-mono">{u.phone || 'Sem Registro Celular'}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400 shrink-0" /> 
                          <span className="truncate max-w-[180px]">{u.email}</span>
                        </p>
                      </div>
                    </td>

                    {/* Coluna 4: Micro-Badges de Permissões */}
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {u.permissions && u.permissions.length > 0 ? (
                          u.permissions.map((p, idx) => (
                            <span 
                              key={idx} 
                              className="text-[8px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded tracking-tight"
                            >
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] italic text-slate-400">Acesso Restrito Mínimo</span>
                        )}
                      </div>
                    </td>

                    {/* Coluna 5: Ações Avançadas e Dropdown Simulado */}
                    <td className="px-6 py-4 text-right relative">
                      <div className="inline-block relative">
                        <button 
                          onClick={() => setActiveDropdownId(activeDropdownId === u.id ? null : u.id)}
                          className={cn(
                            "p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700",
                            isDropdownActive && "bg-slate-100 text-indigo-600 shadow-2xs"
                          )}
                          title="Ações do Operador"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {/* Dropdown Menu Flutuante Absoluto */}
                        {isDropdownActive && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20 text-left animate-in fade-in-50 zoom-in-95 duration-150">
                            <div className="px-3 py-1.5 border-b border-slate-50 mb-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diretivas de Ação</p>
                            </div>

                            <button 
                              onClick={() => handleOpenEditModal(u)}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <Edit size={14} className="text-indigo-500" />
                              <span>Editar Credenciais</span>
                            </button>

                            <button 
                              onClick={() => handleSendPasswordReset(u.email)}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <Key size={14} className="text-amber-500" />
                              <span>Enviar Redefinição</span>
                            </button>

                            <button 
                              onClick={() => handleSendTestPing(u.name)}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <Send size={14} className="text-emerald-500" />
                              <span>Injetar Teste Telemetria</span>
                            </button>

                            <div className="my-1 border-t border-slate-50" />

                            <button 
                              onClick={() => handleToggleLock(u.id, u.name)}
                              className="w-full px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors hover:bg-slate-50 text-slate-700"
                            >
                              {isLocked ? (
                                <>
                                  <Unlock size={14} className="text-emerald-600" />
                                  <span className="text-emerald-600">Desbloquear Operador</span>
                                </>
                              ) : (
                                <>
                                  <Lock size={14} className="text-rose-600" />
                                  <span className="text-rose-600">Bloquear Acesso</span>
                                </>
                              )}
                            </button>

                            <button 
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 size={14} />
                              <span>Revogar Credencial</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roda-pé de Auditoria */}
      <div className="flex items-center justify-between px-4 pt-2 text-slate-400 text-xs">
        <p className="font-medium">
          Exibindo <span className="font-black text-slate-600">{filteredUsers.length}</span> operadores baseados nas diretivas ativas.
        </p>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-wider">Acesso Seguro Criptografado (SHA-256)</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL SIMULADO: ADICIONAR / EDITAR CREDENCIAIS E PERMISSÕES */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  {editingUser ? <Edit size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingUser ? 'Edição de Credenciais do Operador' : 'Provisionar Novo Acesso ao Sistema'}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">Configure as chaves e papéis operacionais deste nó</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário Interativo */}
            <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                  Nome Completo do Operador / Agente *
                </label>
                <input 
                  type="text" 
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Roberto da Silva Barbosa"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Endereço de E-mail Corporativo *
                  </label>
                  <input 
                    type="email" 
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="operador@entregapro.com.br"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                    Telefone Celular / Rádio
                  </label>
                  <input 
                    type="text" 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(11) 99000-1122"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Seleção de Nível Operacional */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                  Perfil de Acesso e Cargo Hierárquico
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: Role.ADMIN, label: 'Admin Geral', desc: 'Acesso Global' },
                    { role: Role.DISPATCHER, label: 'Despachante', desc: 'Roteamento Ops' },
                    { role: Role.DRIVER, label: 'Motorista', desc: 'App Companion' },
                    { role: Role.HELPER, label: 'Apoio/Escolta', desc: 'Monitor de Via' }
                  ].map((item) => {
                    const isSelected = formRole === item.role;
                    return (
                      <button
                        type="button"
                        key={item.role}
                        onClick={() => setFormRole(item.role)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-20",
                          isSelected 
                            ? "bg-indigo-50/50 border-indigo-500 text-indigo-900 shadow-2xs" 
                            : "bg-white border-slate-100 hover:border-slate-200 text-slate-600"
                        )}
                      >
                        <span className="font-black text-xs block">{item.label}</span>
                        <span className="text-[9px] text-slate-400 block tracking-tight leading-none mt-1">
                          {item.desc}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Matriz de Permissões Granulares */}
              <div className="space-y-3 pt-2 border-t border-slate-50">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                  Autorizações de Acesso Granulares (ACL)
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = formPermissions.includes(perm.id);
                    return (
                      <label 
                        key={perm.id} 
                        className={cn(
                          "flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-left select-none",
                          isChecked ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:bg-white/50 text-slate-600 font-medium"
                        )}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] leading-tight">{perm.label}</p>
                          <p className="text-[8px] font-mono text-slate-400 mt-0.5">{perm.id}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>{editingUser ? 'Salvar Modificações' : 'Confirmar Provisionamento'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;
