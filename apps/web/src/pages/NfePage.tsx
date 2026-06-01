import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  FileText, Upload, Download, X, Search, FileSpreadsheet,
  CheckCircle2, AlertCircle, XCircle, Clock, Loader2,
  FileWarning, Receipt, DollarSign, Percent, Building2,
  User, Hash, Calendar, ArrowLeft, Trash2, Ban,
} from 'lucide-react';

interface NfeItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ncm: string;
  cst: string;
  cfop: string;
  icmsAliquota: number;
  icmsValor: number;
  ipiAliquota: number;
  ipiValor: number;
  pisAliquota: number;
  pisValor: number;
  cofinsAliquota: number;
  cofinsValor: number;
}

interface NfeInvoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  issueDate: string;
  totalAmount: number;
  accessKey: string;
  nfeNumber: string;
  series: number;
  cfop: string;
  naturezaOperacao: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  iss: number;
  totalTaxes: number;
  nfeStatus: string;
  createdAt: string;
  items: NfeItem[];
  delivery?: { deliveryNumber: string; customer?: { name: string } };
}

export function NfePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [selectedNfe, setSelectedNfe] = useState<NfeInvoice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: nfes, isLoading } = useQuery({
    queryKey: ['nfe-list'],
    queryFn: () => api.get<NfeInvoice[]>('/invoices/nfe'),
    refetchInterval: 15000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/nfe/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-list'] });
      setSelectedNfe(null);
      toast.success('NF-e cancelada');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast.error('Envie um arquivo XML da NF-e');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/invoices/nfe/import', formData);
      queryClient.invalidateQueries({ queryKey: ['nfe-list'] });
      toast.success('NF-e importada com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar NF-e');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
    AUTHORIZED: { label: 'Autorizada', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
    PENDING: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
    CANCELLED: { label: 'Cancelada', color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
    DENIED: { label: 'Denegada', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
    ERROR: { label: 'Erro', color: 'text-red-600', bg: 'bg-red-50', icon: FileWarning },
  };

  const filtered = (nfes || []).filter(n =>
    n.nfeNumber?.includes(search) ||
    n.accessKey?.includes(search) ||
    n.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
    n.cfop?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">NF-e Eletrônica</h2>
          <p className="text-sm text-slate-500">{nfes?.length || 0} notas fiscais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por chave, número, emitente, CFOP..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {selectedNfe ? (
            <NfeDetail
              nfe={selectedNfe}
              onBack={() => setSelectedNfe(null)}
              onCancel={() => cancelMutation.mutate(selectedNfe.id)}
            />
          ) : (
            <div className="space-y-2">
              {isLoading ? (
                <div className="p-12 text-center"><Loader2 size={32} className="animate-spin mx-auto text-indigo-600" /></div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">Nenhuma NF-e encontrada</p>
                  {search && <p className="text-xs text-slate-300 mt-1">Tente outro termo de busca</p>}
                </div>
              ) : (
                filtered.map(nfe => {
                  const cfg = statusConfig[nfe.nfeStatus] || statusConfig.PENDING;
                  const Icon = cfg.icon;
                  return (
                    <div key={nfe.id}
                      onClick={() => setSelectedNfe(nfe)}
                      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2.5 rounded-xl", cfg.bg)}>
                          <Icon size={20} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">NF-e {nfe.nfeNumber}</p>
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", cfg.bg, cfg.color)}>{cfg.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{nfe.vendorName}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            <span>CFOP: {nfe.cfop}</span>
                            <span>Série: {nfe.series}</span>
                            <span>Chave: {nfe.accessKey?.slice(0, 20)}...</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-slate-900">
                            {nfe.totalAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                            Impostos: {nfe.totalTaxes?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload size={16} className="text-indigo-600" />
                Importar XML
              </h3>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "p-6 m-3 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all",
                dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
              )}
            >
              <input ref={fileInputRef} type="file" accept=".xml" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              {uploading ? (
                <Loader2 size={28} className="animate-spin mx-auto text-indigo-600" />
              ) : (
                <>
                  <Upload size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Arraste o XML da NF-e</p>
                  <p className="text-[9px] text-slate-400 mt-1">ou clique para selecionar</p>
                </>
              )}
            </div>
            <div className="px-4 pb-4 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <FileSpreadsheet size={12} /> XML compatíveis
              </p>
              <p className="text-[9px] text-slate-400">NF-e modelo 55</p>
              <p className="text-[9px] text-slate-400">NF-e de construção civil</p>
              <p className="text-[9px] text-slate-400">CT-e (em breve)</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resumo</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Autorizadas</span>
                <span className="font-bold text-emerald-600">{nfes?.filter(n => n.nfeStatus === 'AUTHORIZED').length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Canceladas</span>
                <span className="font-bold text-rose-600">{nfes?.filter(n => n.nfeStatus === 'CANCELLED').length || 0}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Total Bruto</span>
                <span className="font-bold text-slate-900">
                  {nfes?.reduce((s, n) => s + (n.totalAmount || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Impostos</span>
                <span className="font-bold text-amber-600">
                  {nfes?.reduce((s, n) => s + (n.totalTaxes || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NfeDetail({ nfe, onBack, onCancel }: { nfe: NfeInvoice; onBack: () => void; onCancel: () => void }) {
  const cfg = statusConfig[nfe.nfeStatus] || { label: nfe.nfeStatus, color: 'text-slate-600', bg: 'bg-slate-50', icon: Clock };
  // Use statusConfig directly
  const getCfg = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      AUTHORIZED: { label: 'Autorizada', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
      PENDING: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
      CANCELLED: { label: 'Cancelada', color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
      DENIED: { label: 'Denegada', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
      ERROR: { label: 'Erro', color: 'text-red-600', bg: 'bg-red-50', icon: FileWarning },
    };
    return map[status] || map.PENDING;
  };
  const status = getCfg(nfe.nfeStatus);
  const Icon = status.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider", status.bg, status.color)}>
            <Icon size={12} className="inline mr-1" />{status.label}
          </span>
          {nfe.nfeStatus === 'AUTHORIZED' && (
            <button onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer">
              <Ban size={12} /> Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Identificação</h4>
            <div className="space-y-2.5">
              <Field label="Número" value={`NF-e ${nfe.nfeNumber}`} icon={Hash} />
              <Field label="Série" value={String(nfe.series)} icon={Hash} />
              <Field label="Chave de Acesso" value={nfe.accessKey} icon={FileText} mono />
              <Field label="CFOP" value={nfe.cfop} icon={FileText} />
              <Field label="Natureza" value={nfe.naturezaOperacao} icon={FileText} />
              <Field label="Emissão" value={new Date(nfe.issueDate).toLocaleDateString('pt-BR')} icon={Calendar} />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Emitente</h4>
            <div className="space-y-2.5">
              <Field label="Nome" value={nfe.vendorName} icon={Building2} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Valores</h4>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total NF-e</span>
                <span className="font-black text-slate-900">{nfe.totalAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 space-y-1.5">
                <TaxRow label="ICMS" value={nfe.icms} />
                <TaxRow label="IPI" value={nfe.ipi} />
                <TaxRow label="PIS" value={nfe.pis} />
                <TaxRow label="COFINS" value={nfe.cofins} />
                {nfe.iss > 0 && <TaxRow label="ISS" value={nfe.iss} />}
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                <span className="font-bold text-amber-600">Total Impostos</span>
                <span className="font-black text-amber-600">{nfe.totalTaxes?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
          </div>

          {nfe.delivery && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Vinculada à Entrega</h4>
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-sm font-semibold text-indigo-700">{nfe.delivery.deliveryNumber}</p>
                {nfe.delivery.customer && <p className="text-xs text-indigo-500">{nfe.delivery.customer.name}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Itens ({nfe.items.length})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="text-left py-2 pr-4">Descrição</th>
                <th className="text-right py-2 px-2">NCM</th>
                <th className="text-right py-2 px-2">CST</th>
                <th className="text-right py-2 px-2">Qtd</th>
                <th className="text-right py-2 px-2">V. Unit</th>
                <th className="text-right py-2 px-2">V. Total</th>
                <th className="text-right py-2 px-2">ICMS</th>
                <th className="text-right py-2 px-2">IPI</th>
              </tr>
            </thead>
            <tbody>
              {nfe.items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 text-xs">
                  <td className="py-2 pr-4 font-medium text-slate-800">{item.description}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-500">{item.ncm}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-500">{item.cst}</td>
                  <td className="py-2 px-2 text-right text-slate-700">{item.quantity}</td>
                  <td className="py-2 px-2 text-right text-slate-700">{item.unitPrice?.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-semibold text-slate-800">{item.totalPrice?.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right text-amber-600">{item.icmsValor?.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right text-amber-600">{item.ipiValor?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, icon: Icon, mono }: { label: string; value: string; icon: any; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-slate-300 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={cn("text-xs text-slate-800 truncate", mono && "font-mono text-[10px]")}>{value}</p>
      </div>
    </div>
  );
}

function TaxRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-semibold", value > 0 ? "text-amber-600" : "text-slate-400")}>
        {value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  AUTHORIZED: { label: 'Autorizada', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  PENDING: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  CANCELLED: { label: 'Cancelada', color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
  DENIED: { label: 'Denegada', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
  ERROR: { label: 'Erro', color: 'text-red-600', bg: 'bg-red-50', icon: FileWarning },
};
