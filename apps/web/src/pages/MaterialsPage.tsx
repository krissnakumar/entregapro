import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  Layers, Package, RefreshCw, BarChart3, Database, ShieldAlert,
  Clock, CheckCircle2, ChevronRight, FileSpreadsheet, Beaker, Flame, Thermometer, Search,
  LayoutGrid, List
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
  const [viewMode, setViewMode] = useState<'columns' | 'list'>('columns');

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
      
      {/* Header Panel (Compact) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
        <div className="pl-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase tracking-wider rounded border border-indigo-100/60">
              Controle Tecnológico
            </span>
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            Materiais & Ensaios Tecnológicos
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Homologação de slump test, temperatura, e rastreamento de corpos de prova (CP) na obra.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {/* View Mode Toggle inside header */}
          <div className="flex items-center bg-slate-100 border p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('columns')}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer outline-none",
                viewMode === 'columns' ? "bg-white text-indigo-600 shadow-3xs border border-slate-200/50" : "text-slate-500 hover:text-slate-900"
              )}
              title="Exibir como Colunas / Cards"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer outline-none",
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-3xs border border-slate-200/50" : "text-slate-500 hover:text-slate-900"
              )}
              title="Exibir como Lista / Tabela"
            >
              <List size={13} />
            </button>
          </div>

          <button 
            onClick={() => toast.success('Gerando laudo tecnológico consolidado em PDF...')}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-3xs flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Laudo Tecnológico
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center bg-slate-100 border p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('verification')}
          className={cn(
            "px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer outline-none",
            activeTab === 'verification' ? "bg-white text-indigo-600 shadow-2xs border" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Beaker size={14} />
          <span>Verificação de Lajes / Cargas</span>
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

          {viewMode === 'columns' ? (
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
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/70 border-b border-slate-100">
                      <th className="py-3.5 px-6">NF-e / Obra</th>
                      <th className="py-3.5 px-4">Material</th>
                      <th className="py-3.5 px-4 text-center">Volume</th>
                      <th className="py-3.5 px-4 text-center">Slump</th>
                      <th className="py-3.5 px-4 text-center">Temp</th>
                      <th className="py-3.5 px-4">Lote CP</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLoads.map((load) => {
                      const statusMap = {
                        CONFORME: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100/60', label: 'Conforme' },
                        SLUMP_FORA: { bg: 'bg-rose-50 text-rose-700 border-rose-100/60', label: 'Slump Fora' },
                        AGUARDANDO_RUPTURA: { bg: 'bg-amber-50 text-amber-700 border-amber-100/60', label: 'Aguardando' },
                        REJEITADO: { bg: 'bg-red-50 text-red-700 border-red-100/60', label: 'Rejeitado' },
                      };
                      const statusCfg = statusMap[load.verificationStatus] || statusMap.CONFORME;

                      return (
                        <tr key={load.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono text-[9px] font-black rounded border">
                                #{load.nfeNumber}
                              </span>
                              <span className="font-bold text-slate-800 text-xs">{load.jobsiteName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-500 text-[11px]">{load.materialType}</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">{load.volumeM3} m³</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">{load.slumpMm} mm</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">{load.temperaturaC}°C</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{load.cylinderTestCode}</td>
                          <td className="py-3.5 px-4">
                            <span className={cn("px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border", statusCfg.bg)}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            {load.verificationStatus === 'SLUMP_FORA' ? (
                              <div className="flex justify-end gap-1.5">
                                <button 
                                  onClick={() => handleVerifySlump(load.id, false)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all"
                                >
                                  Rejeitar
                                </button>
                                <button 
                                  onClick={() => handleVerifySlump(load.id, true)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all"
                                >
                                  Homologar
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">Registrado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
