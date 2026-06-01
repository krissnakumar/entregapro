import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  Layers, Package, RefreshCw, BarChart3, Database, ShieldAlert,
  Clock, CheckCircle2, ChevronRight, FileSpreadsheet, Beaker, Flame, Thermometer
} from 'lucide-react';

interface MaterialStock {
  id: string;
  name: string;
  category: 'CIMENTO' | 'AREIA' | 'BRITA' | 'ADITIVO' | 'AGUA';
  currentStock: number;
  maxCapacity: number;
  unit: string;
  siloNumber?: string;
  status: 'ESTÁVEL' | 'ALERTA_BAIXO' | 'ALERTA_CRÍTICO';
}

interface WorksLoadVerify {
  id: string;
  nfeNumber: string;
  jobsiteName: string;
  materialType: string;
  volumeM3: number;
  slumpMm: number; // slump consistency test
  temperaturaC: number;
  cylinderTestCode: string;
  dischargeStart: string;
  dischargeEnd: string;
  verificationStatus: 'CONFORME' | 'SLUMP_FORA' | 'AGUARDANDO_RUPTURA' | 'REJEITADO';
  verifiedBy: string;
}

export function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<'verification' | 'stocks'>('verification');
  const [search, setSearch] = useState('');

  // Local Mocked Silo Telemetry & stocks (with high-end aesthetics)
  const stocks: MaterialStock[] = [
    { id: 'silo-1', name: 'Cimento CP II-F 32', category: 'CIMENTO', currentStock: 82.5, maxCapacity: 120, unit: 't', siloNumber: 'Silo 01', status: 'ESTÁVEL' },
    { id: 'silo-2', name: 'Areia Média Lavada', category: 'AREIA', currentStock: 145.0, maxCapacity: 300, unit: 'm³', siloNumber: 'Pátio Areia A', status: 'ESTÁVEL' },
    { id: 'silo-3', name: 'Brita 1 (Granito)', category: 'BRITA', currentStock: 28.0, maxCapacity: 250, unit: 'm³', siloNumber: 'Pátio Brita B', status: 'ALERTA_BAIXO' },
    { id: 'silo-4', name: 'Aditivo Plastificante H-10', category: 'ADITIVO', currentStock: 450, maxCapacity: 5000, unit: 'L', siloNumber: 'Tanque 03', status: 'ALERTA_CRÍTICO' },
  ];

  // Works load concrete discharge & cylinder verification logs
  const [loads, setLoads] = useState<WorksLoadVerify[]>([
    {
      id: 'load-1',
      nfeNumber: '12480',
      jobsiteName: 'Obra Residencial Alphaville T12',
      materialType: 'Concreto Dosado FCK 30 B1',
      volumeM3: 8.0,
      slumpMm: 120,
      temperaturaC: 24.5,
      cylinderTestCode: 'CP-12480-A',
      dischargeStart: '08:15',
      dischargeEnd: '08:45',
      verificationStatus: 'CONFORME',
      verifiedBy: 'Eng. Roberto Silva'
    },
    {
      id: 'load-2',
      nfeNumber: '12481',
      jobsiteName: 'Edifício Infinity Tower - Laje L4',
      materialType: 'Concreto Autoadensável FCK 40',
      volumeM3: 10.0,
      slumpMm: 180,
      temperaturaC: 26.2,
      cylinderTestCode: 'CP-12481-A',
      dischargeStart: '09:20',
      dischargeEnd: '09:55',
      verificationStatus: 'AGUARDANDO_RUPTURA',
      verifiedBy: 'Tec. Marcelo Ramos'
    },
    {
      id: 'load-3',
      nfeNumber: '12482',
      jobsiteName: 'Viaduto Acesso Km 24 - Viga V3',
      materialType: 'Concreto Estrutural FCK 35 B2',
      volumeM3: 8.0,
      slumpMm: 60, // slump standard is 120+-20mm. 60 is dry/rejection hazard
      temperaturaC: 28.9,
      cylinderTestCode: 'CP-12482-B',
      dischargeStart: '10:40',
      dischargeEnd: '11:15',
      verificationStatus: 'SLUMP_FORA',
      verifiedBy: 'Eng. Roberto Silva'
    }
  ]);

  const handleVerifySlump = (id: string, approve: boolean) => {
    setLoads(prev => prev.map(l => {
      if (l.id === id) {
        return {
          ...l,
          verificationStatus: approve ? 'CONFORME' : 'REJEITADO'
        };
      }
      return l;
    }));
    toast.success(approve ? 'Carga homologada na obra.' : 'Carga rejeitada e retornada à central.');
  };

  const filteredLoads = useMemo(() => {
    return loads.filter(l => 
      l.jobsiteName.toLowerCase().includes(search.toLowerCase()) ||
      l.nfeNumber.includes(search) ||
      l.cylinderTestCode.toLowerCase().includes(search.toLowerCase())
    );
  }, [loads, search]);

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500">
      
      {/* Header Panel */}
      <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600" />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg border border-indigo-100">
              Controle Tecnológico do Concreto
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-lg border">
              Verificação de Carga na Obra (Slump & CP)
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Módulo de Materiais & Ensaios Tecnológicos
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl leading-relaxed">
            Faça a homologação de slump test, temperatura, e rastreamento de corpos de prova (CP) para ruptura e auditoria do traço dos materiais expedidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => toast.success('Gerando laudo tecnológico consolidado em PDF...')}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-2xs flex items-center gap-2"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" /> Laudo Tecnológico
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center bg-slate-100 border p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('verification')}
          className={cn(
            "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
            activeTab === 'verification' ? "bg-white text-indigo-600 shadow-2xs border" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Beaker size={14} />
          <span>Verificação de Lajes / Cargas na Obra</span>
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={cn(
            "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
            activeTab === 'stocks' ? "bg-white text-indigo-600 shadow-2xs border" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Database size={14} />
          <span>Silos & Pátio de Agregados</span>
        </button>
      </div>

      {/* Verification Tab Contents */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por Obra, Cupom / NF-e, Lote de Ruptura..."
              className="w-full pl-9 pr-3 py-3 bg-white border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" 
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredLoads.map((load) => {
              const statusMap = {
                CONFORME: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Conforme' },
                SLUMP_FORA: { bg: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Slump Fora da Faixa' },
                AGUARDANDO_RUPTURA: { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Aguardando Ruptura' },
                REJEITADO: { bg: 'bg-red-50 text-red-700 border-red-100', label: 'Rejeitado' },
              };
              const statusCfg = statusMap[load.verificationStatus] || statusMap.CONFORME;

              return (
                <div key={load.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] font-black rounded border">
                        NF-e #{load.nfeNumber}
                      </span>
                      <span className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border", statusCfg.bg)}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{load.jobsiteName}</h4>
                      <p className="text-xs text-slate-500 font-bold">{load.materialType} — Volume: {load.volumeM3} m³</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t text-xs">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">SLUMP TEST CONSISTÊNCIA</span>
                        <span className={cn("font-bold font-mono", load.slumpMm < 80 ? "text-rose-600 font-black animate-pulse" : "text-slate-800")}>
                          {load.slumpMm} mm
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">TEMPERATURA DESCARGA</span>
                        <span className="font-bold text-slate-800 font-mono flex items-center gap-1">
                          <Thermometer size={12} className="text-slate-400" /> {load.temperaturaC}°C
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">RASTREABILIDADE CP</span>
                        <span className="font-bold text-indigo-600 font-mono flex items-center gap-1">
                          <Flame size={12} className="text-slate-400" /> {load.cylinderTestCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">TEMPOS DESCARGA</span>
                        <span className="font-bold text-slate-800 font-mono flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" /> {load.dischargeStart} - {load.dischargeEnd}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {load.verificationStatus === 'SLUMP_FORA' && (
                      <>
                        <button 
                          onClick={() => handleVerifySlump(load.id, false)}
                          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                          Rejeitar Carga
                        </button>
                        <button 
                          onClick={() => handleVerifySlump(load.id, true)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10"
                        >
                          Homologar c/ Aditivo
                        </button>
                      </>
                    )}
                    {load.verificationStatus === 'CONFORME' && (
                      <span className="text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={16} /> Homologado
                      </span>
                    )}
                    {load.verificationStatus === 'REJEITADO' && (
                      <span className="text-rose-600 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                        <ShieldAlert size={16} /> Retornado à Usina
                      </span>
                    )}
                    {load.verificationStatus === 'AGUARDANDO_RUPTURA' && (
                      <span className="text-amber-600 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                        <Clock size={16} /> Aguardando Ruptura
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Silos stock Monitoring */}
      {activeTab === 'stocks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stocks.map((stock) => {
            const fillPercent = (stock.currentStock / stock.maxCapacity) * 100;
            return (
              <div key={stock.id} className="bg-white border rounded-[2.5rem] p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-64 border-l-4"
                style={{
                  borderLeftColor: stock.status === 'ESTÁVEL' ? '#10b981' : stock.status === 'ALERTA_BAIXO' ? '#f59e0b' : '#ef4444'
                }}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono text-[9px] font-black rounded border uppercase">
                      {stock.siloNumber}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                      stock.status === 'ESTÁVEL' ? "bg-emerald-50 text-emerald-700" :
                      stock.status === 'ALERTA_BAIXO' ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                    )}>
                      {stock.status}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base mt-3 leading-tight">{stock.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Categoria: {stock.category}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">Estoque Atual</span>
                    <span className="font-bold text-slate-900">{stock.currentStock} {stock.unit}</span>
                  </div>

                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        stock.status === 'ESTÁVEL' ? "bg-emerald-500" :
                        stock.status === 'ALERTA_BAIXO' ? "bg-amber-500" : "bg-rose-500"
                      )} 
                      style={{ width: `${fillPercent}%` }} 
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>Ocupação: {fillPercent.toFixed(0)}%</span>
                    <span>Capacidade: {stock.maxCapacity} {stock.unit}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
