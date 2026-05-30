import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Camera, 
  Truck, 
  ShieldCheck, 
  FileCheck, 
  UserCheck, 
  Sparkles, 
  Send,
  Lock,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface LoadingVerificationScreenProps {
  deliveryId?: string;
  deliveryNumber?: string;
  onComplete?: () => void;
}

export const LoadingVerificationScreen: React.FC<LoadingVerificationScreenProps> = ({ 
  deliveryId = 'DEV-LIVE-001', 
  deliveryNumber = 'DEL-2026-8891',
  onComplete 
}) => {
  const [step, setStep] = useState<number>(1);
  const [checklist, setChecklist] = useState({
    materialCount: false,
    invoiceMapped: false,
    packageQuantity: false,
    truckCapacity: false,
  });

  const [photos, setPhotos] = useState({
    emptyTruck: null as string | null,
    materialsLoaded: null as string | null,
    sealedCargo: null as string | null,
    invoiceVerification: null as string | null,
  });

  const [confirmed, setConfirmed] = useState(false);

  const simulatePhotoUpload = (key: keyof typeof photos) => {
    // Beautiful photo placeholder simulation
    const simulatedUrls: Record<string, string> = {
      emptyTruck: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60',
      materialsLoaded: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600&auto=format&fit=crop&q=60',
      sealedCargo: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&auto=format&fit=crop&q=60',
      invoiceVerification: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
    };
    setPhotos(prev => ({ ...prev, [key]: simulatedUrls[key] }));
    toast.success(`Photo snapshot successfully authenticated & verified.`);
  };

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isChecklistComplete = Object.values(checklist).every(Boolean);
  const arePhotosComplete = Object.values(photos).every(Boolean);

  const handleFinalConfirm = () => {
    setConfirmed(true);
    toast.success('Warehouse dispatch integrity sealed. Live payload broadcasted to Admins.');
    if (onComplete) {
      setTimeout(onComplete, 1500);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[3rem] shadow-xl p-8 max-w-4xl mx-auto space-y-8">
      {/* Header Workflow Title */}
      <div className="flex items-center justify-between border-b pb-6 border-slate-100">
        <div>
          <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
            Warehouse Loading & Dispatch Security
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1 tracking-tight flex items-center gap-2">
            Unit Verification Protocol <span className="text-primary font-mono text-base">({deliveryNumber})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div key={s} className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all",
              step === s ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" :
              step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
            )}>
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Truck Arrives */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <Truck size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Step 1: Transport Asset Alignment</h3>
            <p className="text-xs font-bold text-slate-500 max-w-md mx-auto">
              The physical vehicle has approached the assigned bay. Validate license mapping before opening the digital loading bay lock.
            </p>
          </div>
          <button 
            onClick={() => setStep(2)}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
          >
            Acknowledge Arrival & Proceed <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2 & 3: Warehouse Verifies Checklist */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 className="text-base font-black text-slate-900">Step 2 & 3: Mandatory Parameter Audit</h3>
            <p className="text-xs font-bold text-slate-400">Physically count and electronically verify load compatibility.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'materialCount', title: 'Accurate Material Quantity Count', desc: 'Matches the strict ERP outbound load itemization' },
              { id: 'invoiceMapped', title: 'Invoice Identity Binding', desc: 'Secure barcode mapping validated via internal ledger' },
              { id: 'packageQuantity', title: 'Package Integrity & Fasteners', desc: 'Tightly strapped and pre-secured on pallets' },
              { id: 'truckCapacity', title: 'Axle Load & Maximum Weight Rating', desc: 'Within safe local structural weight requirements' },
            ].map(item => {
              const checked = checklist[item.id as keyof typeof checklist];
              return (
                <div 
                  key={item.id}
                  onClick={() => toggleCheck(item.id as keyof typeof checklist)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4",
                    checked ? "bg-emerald-50/50 border-emerald-500" : "bg-white border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5",
                    checked ? "bg-emerald-500" : "bg-slate-200"
                  )}>
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{item.title}</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            disabled={!isChecklistComplete}
            onClick={() => setStep(3)}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              isChecklistComplete ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Confirm Integrity Verification <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 4: Upload Loading Pictures */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 className="text-base font-black text-slate-900">Step 4: Non-Repudiation Visual Capture</h3>
            <p className="text-xs font-bold text-slate-400">Capture visual telemetry to satisfy warehouse outbound audit requirements.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'emptyTruck', label: '1. Completely Empty Transport Bay' },
              { id: 'materialsLoaded', label: '2. Fully Secured Material Load' },
              { id: 'sealedCargo', label: '3. Cargo Fastener Fastened & Sealed' },
              { id: 'invoiceVerification', label: '4. Signed Outbound Manifest & Invoice' },
            ].map(photoObj => {
              const url = photos[photoObj.id as keyof typeof photos];
              return (
                <div key={photoObj.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 p-3 flex flex-col justify-between aspect-video relative group">
                  <span className="text-[11px] font-black text-slate-700 z-10 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg self-start">
                    {photoObj.label}
                  </span>
                  
                  {url ? (
                    <img src={url} alt="Telemetry" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center my-4">
                      <Camera size={24} className="text-slate-300 mb-1" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Awaiting Capture</span>
                    </div>
                  )}

                  <button 
                    onClick={() => simulatePhotoUpload(photoObj.id as keyof typeof photos)}
                    className="mt-2 w-full py-2 bg-white/90 hover:bg-white text-slate-900 font-black text-[10px] uppercase rounded-xl transition-all shadow-sm z-10"
                  >
                    {url ? 'Retake Snapshot' : 'Trigger Camera'}
                  </button>
                </div>
              );
            })}
          </div>

          <button 
            disabled={!arePhotosComplete}
            onClick={() => setStep(4)}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              arePhotosComplete ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Photos Complete - Proceed to Cryptographic Seal <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 5 & 6: Confirmation & Live Broadcast */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden space-y-6">
             <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
             
             <div className="flex items-center gap-3">
               <div className="p-3 bg-emerald-500 text-white rounded-xl">
                 <Lock size={24} />
               </div>
               <div>
                 <h3 className="text-lg font-black tracking-tight">Step 5: Master Dispatch Certification</h3>
                 <p className="text-xs text-slate-400">Verify authorization signatures and trigger immediate fleet notification.</p>
               </div>
             </div>

             <div className="space-y-3 pt-2">
               <div className="flex items-center justify-between border-b border-white/10 pb-3">
                 <span className="text-xs font-medium text-slate-400">Loading Bay Validation</span>
                 <span className="text-xs font-black text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> 100% Cleared</span>
               </div>
               <div className="flex items-center justify-between border-b border-white/10 pb-3">
                 <span className="text-xs font-medium text-slate-400">Non-Repudiation Telemetry</span>
                 <span className="text-xs font-black text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> 4 Pictures Authenticated</span>
               </div>
               <div className="flex items-center justify-between pb-1">
                 <span className="text-xs font-medium text-slate-400">Real-Time Trigger Status</span>
                 <span className="text-xs font-black text-amber-400 flex items-center gap-1"><Sparkles size={12} /> Ready for Broadcast</span>
               </div>
             </div>

             {!confirmed ? (
               <button 
                 onClick={handleFinalConfirm}
                 className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2"
               >
                 <Send size={16} /> Seal Container & Broadcast Live Notification
               </button>
             ) : (
               <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                 <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Step 6 Active: Admin Control Informed</p>
                 <p className="text-[10px] text-slate-400 mt-1">Vehicle cleared for physical departure with optimized OSRM routes loaded.</p>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
