import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ShieldCheck, Shield, Check, X, Loader2, Users, FileText, Info } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';

interface PermissionItem {
  id: string;
  key: string;
  description: string;
}

interface RolePermission {
  permission: PermissionItem;
}

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  permissions: RolePermission[];
}

export function RolesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<RoleItem[]>({
    queryKey: ['roles-list'],
    queryFn: () => api.get<RoleItem[]>('/roles').catch(() => []),
  });

  // Fetch Permissions
  const { data: permissions = [], isLoading: isLoadingPerms } = useQuery<PermissionItem[]>({
    queryKey: ['permissions-list'],
    queryFn: () => api.get<PermissionItem[]>('/permissions').catch(() => []),
  });

  // Filter permissions based on search query
  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => 
      p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [permissions, searchQuery]);

  const isLoading = isLoadingRoles || isLoadingPerms;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  // Get description translation and icon color for default roles
  const getRoleMeta = (roleName: string) => {
    switch(roleName.toUpperCase()) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return {
          title: 'Administrador',
          description: 'Acesso total a todas as configurações, faturamento, relatórios e usuários do sistema.',
          color: 'text-purple-600 bg-purple-50 border-purple-100',
          gradient: 'from-purple-600 to-indigo-700'
        };
      case 'DISPATCHER':
        return {
          title: 'Despachante',
          description: 'Gerenciamento de rotas, despacho de frotas, motoristas e acompanhamento em tempo real.',
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          gradient: 'from-indigo-600 to-blue-700'
        };
      case 'DRIVER':
        return {
          title: 'Motorista',
          description: 'Acesso às rotas atribuídas, envio de comprovantes de entrega (POD) e telemetria GPS.',
          color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          gradient: 'from-emerald-600 to-teal-700'
        };
      case 'HELPER':
        return {
          title: 'Ajudante / Apoio',
          description: 'Auxilia na conferência de cargas, relatórios parciais de manutenção e visualização básica.',
          color: 'text-amber-600 bg-amber-50 border-amber-100',
          gradient: 'from-amber-600 to-orange-700'
        };
      default:
        return {
          title: roleName,
          description: 'Perfil de acesso personalizado para a organização.',
          color: 'text-slate-600 bg-slate-50 border-slate-100',
          gradient: 'from-slate-600 to-slate-700'
        };
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16 animate-in fade-in duration-300">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Segurança & Governança</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white font-sans">Matriz de Cargos e Permissões</h1>
            <p className="text-slate-400 font-medium text-xs mt-1 max-w-xl">
              Audite e visualize de forma transparente os perfis de acesso (Roles) e privilégios granulares (ACL) ativos na sua rede logística.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-4 border-r border-white/10">
              <p className="text-2xl font-black text-indigo-400 font-mono">{roles.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Perfis Ativos</p>
            </div>
            <div className="text-center px-4">
              <p className="text-2xl font-black text-emerald-400 font-mono">{permissions.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Chaves ACL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => {
          const meta = getRoleMeta(role.name);
          const hasPermsCount = role.permissions?.length || 0;
          return (
            <div key={role.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border", meta.color)}>
                    {role.name}
                  </span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Shield size={16} />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-black text-slate-900">{meta.title}</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                    {role.description || meta.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Permissões Ativas</span>
                <span className="font-mono font-black text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                  {hasPermsCount} / {permissions.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matrix Audit Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Matriz de Controle de Acesso (ACL)</h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Cruze permissões granulares com os perfis de acesso da organização.</p>
          </div>
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar permissões..."
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-64 transition-all text-xs font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Permissão (Chave ACL)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Descrição Operacional</th>
                  {roles.map((role) => (
                    <th key={role.id} className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={2 + roles.length} className="text-center py-12 text-xs italic text-slate-400">
                      Nenhuma diretiva de permissão corresponde aos critérios especificados.
                    </td>
                  </tr>
                ) : (
                  filteredPermissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span className="font-mono font-bold text-[11px] text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                            {perm.key}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-slate-500">
                        {perm.description}
                      </td>
                      {roles.map((role) => {
                        const hasPermission = role.permissions?.some(
                          (rp) => rp.permission.key === perm.key || rp.permission.id === perm.id
                        );
                        return (
                          <td key={role.id} className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center">
                              {hasPermission ? (
                                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-3xs animate-in zoom-in-50 duration-200">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center">
                                  <X size={10} strokeWidth={3.5} />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
