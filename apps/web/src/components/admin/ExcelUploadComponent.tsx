import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExcelUploadResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export function ExcelUploadComponent() {
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExcelUploadResult | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/deliveries/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data: ExcelUploadResult) => {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
      setResult(data);
      if (data.errors.length === 0) {
        toast.success(`${data.created} entregas criadas com sucesso!`);
      } else {
        toast.warning(`${data.created} criadas, ${data.errors.length} erros`);
      }
      setSelectedFile(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao fazer upload do arquivo');
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
    setResult(null);
  };

  const downloadTemplate = () => {
    const headers = [
      'Nome do Cliente',
      'Telefone do Cliente',
      'Email do Cliente',
      'Rua',
      'Número',
      'Complemento',
      'Bairro',
      'Cidade',
      'Estado',
      'CEP',
      'Data Agendada',
      'Número da NF',
      'Valor da NF',
      'Material',
      'Quantidade',
      'Peso',
      'Observações',
    ];
    const csv = headers.join(',') + '\n' + 'Exemplo,11999999999,email@test.com,Rua A,123,apt 1,Centro,São Paulo,SP,01234-567,2026-06-10,NF001,150.00,Material X,2,5.0,Ponto de referência\n';
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_entregas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Upload size={14} />
          Upload de Planilha
        </h3>
        <button
          onClick={downloadTemplate}
          className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800 cursor-pointer"
        >
          <Download size={12} />
          Template
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
          dragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"
        )}
      >
        <FileSpreadsheet size={40} className={cn("mx-auto mb-3", dragActive ? "text-indigo-500" : "text-slate-300")} />
        {selectedFile ? (
          <div>
            <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
            <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-600 mb-2">Arraste um arquivo .xlsx, .xls ou .csv aqui</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700">
              <Upload size={12} />
              Selecionar Arquivo
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={uploadMutation.isPending}
          className="w-full p-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer hover:bg-indigo-700"
        >
          {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploadMutation.isPending ? 'Enviando...' : 'Enviar Planilha'}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className={cn(
          "rounded-2xl border p-4",
          result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center gap-2 mb-3">
            {result.errors.length === 0 ? (
              <CheckCircle size={20} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={20} className="text-amber-600" />
            )}
            <h4 className="text-sm font-bold text-slate-900">Resultado do Upload</h4>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-emerald-600">{result.created}</p>
              <p className="text-[9px] text-slate-500 uppercase">Criadas</p>
            </div>
            <div className="bg-white rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-blue-600">{result.updated}</p>
              <p className="text-[9px] text-slate-500 uppercase">Atualizadas</p>
            </div>
            <div className="bg-white rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-slate-600">{result.skipped}</p>
              <p className="text-[9px] text-slate-500 uppercase">Ignoradas</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-700">Erros ({result.errors.length}):</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <XCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                    <span className="text-red-700">Linha {err.row}: {err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
