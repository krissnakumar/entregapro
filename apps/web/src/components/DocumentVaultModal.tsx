import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Upload, FileText, Trash2, AlertCircle, Loader2, FileCheck, Download, Eye, Calendar, User, Building2, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface DocumentVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'driver' | 'vehicle' | 'customer' | 'truck' | 'client';
  entityId: string;
  entityName: string;
}

interface VaultDoc {
  id: string;
  name: string;
  type: 'cnh' | 'crlv' | 'insurance' | 'license' | 'certificate' | 'contract' | 'other';
  fileSize: number;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
  notes?: string;
}

const DOC_TYPES = [
  { value: 'cnh', label: 'CNH', icon: User },
  { value: 'crlv', label: 'CRLV', icon: Truck },
  { value: 'insurance', label: 'Seguro', icon: ShieldCheck },
  { value: 'license', label: 'Alvará/Licença', icon: FileCheck },
  { value: 'certificate', label: 'Certidão', icon: FileCheck },
  { value: 'contract', label: 'Contrato', icon: FileText },
  { value: 'other', label: 'Outro', icon: FileText },
] as const;

const STORAGE_PREFIX = 'entregapro-vault-';

function getStorageKey(entityType: string, entityId: string): string {
  return `${STORAGE_PREFIX}${entityType}-${entityId}`;
}

function loadDocs(entityType: string, entityId: string): VaultDoc[] {
  try {
    const raw = localStorage.getItem(getStorageKey(entityType, entityId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDocs(entityType: string, entityId: string, docs: VaultDoc[]) {
  try {
    localStorage.setItem(getStorageKey(entityType, entityId), JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save vault docs:', e);
    toast.error('Limite de armazenamento excedido. Remova documentos antigos.');
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const ENTITY_LABELS: Record<string, string> = {
  driver: 'condutor',
  vehicle: 'veículo',
  customer: 'cliente',
  truck: 'veículo',
  client: 'cliente',
};

export const DocumentVaultModal: React.FC<DocumentVaultModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
}) => {
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<VaultDoc | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const label = ENTITY_LABELS[entityType] || 'entidade';

  useEffect(() => {
    if (isOpen) {
      setDocs(loadDocs(entityType, entityId));
      setSelectedDoc(null);
    }
  }, [isOpen, entityType, entityId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const docType = prompt('Tipo de documento: CNH, CRLV, Seguro, Alvará, Certidão, Contrato, Outro')?.toLowerCase() || 'other';
      const validType = DOC_TYPES.find(t => t.value === docType)?.value || 'other';

      const newDoc: VaultDoc = {
        id: crypto.randomUUID(),
        name: file.name,
        type: validType as VaultDoc['type'],
        fileSize: file.size,
        mimeType: file.type,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };

      const updated = [...docs, newDoc];
      setDocs(updated);
      saveDocs(entityType, entityId, updated);
      toast.success('Documento anexado ao cofre.');
    } catch {
      toast.error('Erro ao processar o arquivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (docId: string) => {
    const updated = docs.filter(d => d.id !== docId);
    setDocs(updated);
    saveDocs(entityType, entityId, updated);
    if (selectedDoc?.id === docId) setSelectedDoc(null);
    toast.success('Documento removido do cofre.');
  };

  const filteredDocs = filterType === 'all' ? docs : docs.filter(d => d.type === filterType);

  const DocTypeIcon = (type: string) => {
    const t = DOC_TYPES.find(dt => dt.value === type);
    return t ? t.icon : FileText;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white shrink-0">
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

        {selectedDoc ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer outline-none mb-2"
            >
              ← Voltar para lista
            </button>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              {selectedDoc.mimeType.startsWith('image/') ? (
                <img
                  src={selectedDoc.dataUrl}
                  alt={selectedDoc.name}
                  className="w-full max-h-[50vh] object-contain bg-white"
                />
              ) : selectedDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={selectedDoc.dataUrl}
                  title={selectedDoc.name}
                  className="w-full h-[50vh] bg-white"
                />
              ) : (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <FileText size={48} />
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-sm text-slate-900">{selectedDoc.name}</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-500 font-medium">
                <span>{formatSize(selectedDoc.fileSize)}</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {formatDate(selectedDoc.uploadedAt)}
                </span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase">
                  {DOC_TYPES.find(t => t.value === selectedDoc.type)?.label || selectedDoc.type}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <a
                  href={selectedDoc.dataUrl}
                  download={selectedDoc.name}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-700 transition-colors"
                >
                  <Download size={12} />
                  Baixar
                </a>
                <button
                  onClick={() => handleDelete(selectedDoc.id)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-red-100 transition-colors cursor-pointer outline-none"
                >
                  <Trash2 size={12} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 whitespace-nowrap">
                Filtro:
              </span>
              {[{ value: 'all', label: 'Todos', icon: ShieldCheck }, ...DOC_TYPES].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setFilterType(t.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer outline-none whitespace-nowrap",
                      filterType === t.value
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Icon size={12} />
                    {t.label}
                  </button>
                );
              })}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                  {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
                </span>
                <label className={cn(
                  "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0",
                  uploading && "opacity-50 pointer-events-none"
                )}>
                  {uploading ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : (
                    <Upload size={12} />
                  )}
                  <span>Anexar</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-3">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldCheck className="text-slate-300 mb-3" size={48} />
                  <p className="text-sm font-black text-slate-900">Cofre vazio</p>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mt-1">
                    Nenhum documento anexado para este {label}. Clique em "Anexar" para adicionar CNH, CRLV, seguros e certidões.
                  </p>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const TypeIcon = DocTypeIcon(doc.type);
                  const typeLabel = DOC_TYPES.find(t => t.value === doc.type)?.label || 'Documento';
                  return (
                    <div
                      key={doc.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 hover:border-indigo-200 transition-colors cursor-pointer"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 shrink-0">
                        <TypeIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium mt-0.5">
                          <span>{typeLabel}</span>
                          <span>{formatSize(doc.fileSize)}</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {formatDate(doc.uploadedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                          className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer outline-none"
                          title="Visualizar"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer outline-none"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-medium">
                Os documentos são armazenados localmente no navegador.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer outline-none"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
