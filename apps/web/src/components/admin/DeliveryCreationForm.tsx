import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { X, Plus, Loader2, Truck, MapPin, User, FileText, Package } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DeliveryCreationFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const emptyForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  recipientName: '',
  recipientPhone: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  referencePoint: '',
  latitude: '',
  longitude: '',
  scheduledDate: '',
  scheduledTimeWindowStart: '',
  scheduledTimeWindowEnd: '',
  invoiceNumber: '',
  invoiceValue: '',
  paymentMethod: 'COD' as string,
  products: [{ description: '', quantity: '1', unitPrice: '', weight: '' }],
  notes: '',
};

export function DeliveryCreationForm({ onClose, onSuccess }: DeliveryCreationFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createDelivery = useMutation({
    mutationFn: (data: any) => api.post('/deliveries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] });
      toast.success('Entrega criada com sucesso!');
      setForm(emptyForm);
      onSuccess?.();
      onClose?.();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar entrega');
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.customerName.trim()) errs.customerName = 'Nome do cliente obrigatório';
    if (!form.street.trim()) errs.street = 'Rua obrigatória';
    if (!form.number.trim()) errs.number = 'Número obrigatório';
    if (!form.city.trim()) errs.city = 'Cidade obrigatória';
    if (!form.state.trim()) errs.state = 'Estado obrigatório';
    if (!form.zipCode.trim()) errs.zipCode = 'CEP obrigatório';
    if (!form.invoiceNumber.trim()) errs.invoiceNumber = 'Número da nota fiscal obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createDelivery.mutate({
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || undefined,
      customerEmail: form.customerEmail.trim() || undefined,
      recipientName: form.recipientName.trim() || undefined,
      recipientPhone: form.recipientPhone.trim() || undefined,
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement.trim() || undefined,
      neighborhood: form.neighborhood.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      zipCode: form.zipCode.trim(),
      referencePoint: form.referencePoint.trim() || undefined,
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      scheduledDate: form.scheduledDate || undefined,
      scheduledTimeWindowStart: form.scheduledTimeWindowStart || undefined,
      scheduledTimeWindowEnd: form.scheduledTimeWindowEnd || undefined,
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceValue: form.invoiceValue ? parseFloat(form.invoiceValue) : undefined,
      paymentMethod: form.paymentMethod,
      products: form.products
        .filter((p) => p.description.trim())
        .map((p) => ({
          description: p.description.trim(),
          quantity: parseInt(p.quantity) || 1,
          unitPrice: p.unitPrice ? parseFloat(p.unitPrice) : undefined,
          weight: p.weight ? parseFloat(p.weight) : undefined,
        })),
      notes: form.notes.trim() || undefined,
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const addProduct = () => {
    setForm((prev) => ({
      ...prev,
      products: [...prev.products, { description: '', quantity: '1', unitPrice: '', weight: '' }],
    }));
  };

  const updateProduct = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const removeProduct = (index: number) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Plus size={20} className="text-indigo-600" />
          Criar Entrega
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl cursor-pointer">
            <X size={18} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Customer Section */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <User size={14} /> Cliente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Nome do Cliente *" value={form.customerName} onChange={(v) => updateField('customerName', v)} error={errors.customerName} />
          <InputField label="Telefone" value={form.customerPhone} onChange={(v) => updateField('customerPhone', v)} placeholder="(11) 99999-9999" />
          <InputField label="Email" value={form.customerEmail} onChange={(v) => updateField('customerEmail', v)} type="email" />
          <InputField label="Recebedor" value={form.recipientName} onChange={(v) => updateField('recipientName', v)} placeholder="Quem vai receber?" />
          <InputField label="Tel. Recebedor" value={form.recipientPhone} onChange={(v) => updateField('recipientPhone', v)} />
        </div>
      </div>

      {/* Address Section */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <MapPin size={14} /> Endereço
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Rua *" value={form.street} onChange={(v) => updateField('street', v)} error={errors.street} className="sm:col-span-2" />
          <InputField label="Número *" value={form.number} onChange={(v) => updateField('number', v)} error={errors.number} />
          <InputField label="Complemento" value={form.complement} onChange={(v) => updateField('complement', v)} />
          <InputField label="Bairro" value={form.neighborhood} onChange={(v) => updateField('neighborhood', v)} />
          <InputField label="Cidade *" value={form.city} onChange={(v) => updateField('city', v)} error={errors.city} />
          <InputField label="Estado *" value={form.state} onChange={(v) => updateField('state', v)} error={errors.state} placeholder="SP" />
          <InputField label="CEP *" value={form.zipCode} onChange={(v) => updateField('zipCode', v)} error={errors.zipCode} placeholder="01234-567" />
          <InputField label="Ponto de Referência" value={form.referencePoint} onChange={(v) => updateField('referencePoint', v)} />
        </div>
      </div>

      {/* Schedule Section */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <FileText size={14} /> Agendamento e Nota Fiscal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField label="Data" value={form.scheduledDate} onChange={(v) => updateField('scheduledDate', v)} type="date" />
          <InputField label="Hora Início" value={form.scheduledTimeWindowStart} onChange={(v) => updateField('scheduledTimeWindowStart', v)} type="time" />
          <InputField label="Hora Fim" value={form.scheduledTimeWindowEnd} onChange={(v) => updateField('scheduledTimeWindowEnd', v)} type="time" />
          <InputField label="Nº Nota Fiscal *" value={form.invoiceNumber} onChange={(v) => updateField('invoiceNumber', v)} error={errors.invoiceNumber} />
          <InputField label="Valor NF (R$)" value={form.invoiceValue} onChange={(v) => updateField('invoiceValue', v)} type="number" step="0.01" />
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pagamento</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => updateField('paymentMethod', e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="COD">Pagamento na Entrega</option>
              <option value="PREPAID">Pré-pago</option>
              <option value="CREDIT">Credito</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Package size={14} /> Produtos
          </h3>
          <button type="button" onClick={addProduct} className="text-xs text-indigo-600 font-bold flex items-center gap-1 cursor-pointer hover:text-indigo-800">
            <Plus size={12} /> Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {form.products.map((product, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-4 gap-2">
                <input
                  placeholder="Descrição"
                  value={product.description}
                  onChange={(e) => updateProduct(idx, 'description', e.target.value)}
                  className="col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                />
                <input
                  placeholder="Qtd"
                  value={product.quantity}
                  onChange={(e) => updateProduct(idx, 'quantity', e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  type="number"
                  min="1"
                />
                <input
                  placeholder="Peso (kg)"
                  value={product.weight}
                  onChange={(e) => updateProduct(idx, 'weight', e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  type="number"
                  step="0.1"
                />
              </div>
              {form.products.length > 1 && (
                <button type="button" onClick={() => removeProduct(idx)} className="p-2 text-red-400 hover:text-red-600 cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações</label>
        <textarea
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Instruções especiais, observações..."
          className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm min-h-[80px] resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        {onClose && (
          <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold cursor-pointer">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={createDelivery.isPending}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer hover:bg-indigo-700 transition-all"
        >
          {createDelivery.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Criar Entrega
        </button>
      </div>
    </form>
  );
}

function InputField({ label, value, onChange, error, type = 'text', placeholder, className }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "mt-1 w-full px-3 py-2 bg-white border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
          error ? "border-red-300" : "border-slate-200"
        )}
      />
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
