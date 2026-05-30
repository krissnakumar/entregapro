import React, { useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { Eraser, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

const SignaturePad = ({ onSave, onClose }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Assinatura Digital (Canhoto)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            className="w-full bg-slate-50 rounded-2xl border-2 border-slate-100 touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">Utilize o dedo ou caneta touch para assinar dentro do quadro</p>
        </div>
        <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
          <button onClick={clear} className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 text-slate-700 transition-colors">
            <Eraser size={16} /> Limpar
          </button>
          <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all">
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
