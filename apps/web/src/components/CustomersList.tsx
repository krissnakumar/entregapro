import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Search, Plus, MapPin, Phone, MoreHorizontal, User, Building2, ExternalLink, Filter, FileCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import CustomerFormModal from './CustomerFormModal';
import CustomerHistoryModal from './CustomerHistoryModal';
import { DocumentVaultModal } from './DocumentVaultModal';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  createdAt?: string;
  status?: string;
}

// Fallback robusto inicial com dados reais do segmento para demonstrações ricas
const INITIAL_CUSTOMERS: Customer[] = [];

const CustomersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Cofre de documentos ativo
  const [vaultConfig, setVaultConfig] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
  }>({ isOpen: false, entityId: '', entityName: '' });

  // Mantém lista reativa local para garantir feedback de criação e robustez
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get<Customer[]>('/customers');
      return res;
    },
    retry: false,
  });

  // Mescla a lista remota com os itens inseridos localmente
  const baseCustomers = (customers && customers.length > 0) 
    ? [...localCustomers.filter(lc => !customers.some(c => c.id === lc.id)), ...customers]
    : localCustomers;

  const filteredCustomers = baseCustomers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.address.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter !== 'Todos') {
      return matchesSearch && (c.status === statusFilter || (!c.status && statusFilter === 'Ativo'));
    }
    return matchesSearch;
  });

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  const handleOpenVault = (customer: Customer) => {
    setVaultConfig({
      isOpen: true,
      entityId: customer.id,
      entityName: customer.name,
    });
  };

  const handleCustomerCreated = (newCust: Customer) => {
    setLocalCustomers(prev => [newCust, ...prev]);
  };

  return (
    <div className="space-y-8 font-sans select-none pb-12 animate-in fade-in duration-300">
      
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              Diretório Operacional
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Canteiros e Destinos
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Clientes & Destinos Cadastrados
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Gestão de pontos de averbação, contatos autorizados e instruções espaciais de descarga.
          </p>
        </div>

        {/* Ferramentas de Ação */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text" 
              placeholder="Buscar canteiro ou razão social..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 w-full sm:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer outline-none shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Opções de Filtro Rápido */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mr-1">
          <Filter size={12} /> Filtro:
        </span>
        {(['Todos', 'Ativo', 'Em Auditoria'] as const).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer outline-none shrink-0",
              statusFilter === status 
                ? "bg-slate-900 text-white shadow-2xs" 
                : "bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            {status}
          </button>
        ))}
        <span className="text-xs font-medium text-slate-400 ml-auto hidden sm:inline-block">
          Exibindo <strong className="text-slate-700 font-bold">{filteredCustomers.length}</strong> entidades
        </span>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço Principal</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Instruções de Base</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                        <div className="space-y-1">
                          <div className="h-3.5 bg-slate-100 rounded w-28" />
                          <div className="h-2.5 bg-slate-50 rounded w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="p-5"><div className="h-5 bg-slate-50 rounded-md w-16" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-48" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-24" /></td>
                    <td className="p-5"><div className="h-3.5 bg-slate-50 rounded w-36" /></td>
                    <td className="p-5 text-right"><div className="h-8 bg-slate-100 rounded-lg w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs leading-tight truncate">
                            {customer.name}
                          </h4>
                          <span className="font-mono text-[9px] text-slate-400 font-bold block mt-0.5">
                            ID: {customer.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border inline-block whitespace-nowrap",
                        customer.status === 'Em Auditoria' 
                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {customer.status || 'Ativo'}
                      </span>
                    </td>
                    <td className="p-5 max-w-xs">
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
                        <MapPin size={13} className="text-indigo-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2" title={customer.address}>
                          {customer.address}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono font-bold">
                        <Phone size={13} className="text-indigo-500 shrink-0" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="p-5 max-w-xs">
                      {customer.notes ? (
                        <p className="text-[11px] text-slate-600 italic line-clamp-2 leading-tight" title={customer.notes}>
                          "{customer.notes}"
                        </p>
                      ) : (
                        <span className="text-slate-300 text-[10px] italic">Sem instruções adicionais</span>
                      )}
                    </td>
                    <td className="p-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenVault(customer)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer outline-none shrink-0"
                          title="Contratos, Seguros e Licenças do Canteiro"
                        >
                          <FileCheck size={12} className="text-indigo-600" />
                          <span>Dossiê</span>
                        </button>
                        <button 
                          onClick={() => handleViewHistory(customer)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer outline-none shrink-0"
                        >
                          <span>Histórico</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center bg-white">
                    <Building2 className="mx-auto text-slate-300 mb-3" size={40} />
                    <p className="text-sm font-black text-slate-900">Nenhum cliente frotista encontrado</p>
                    <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto mt-1">
                      Verifique os termos da busca ou clique em "Novo Cliente" para averbar o primeiro canteiro de obras.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCustomerCreated={handleCustomerCreated}
      />

      <CustomerHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        customer={selectedCustomer}
      />

      <DocumentVaultModal
        isOpen={vaultConfig.isOpen}
        onClose={() => setVaultConfig(prev => ({ ...prev, isOpen: false }))}
        entityType="client"
        entityId={vaultConfig.entityId}
        entityName={vaultConfig.entityName}
      />
    </div>
  );
};

export default CustomersList;
