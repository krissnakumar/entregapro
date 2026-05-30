import React, { useRef, useState } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const PhotoCapture = ({ onCapture, onClose }: PhotoCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera principal:", err);
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Captura de Lacre / Canhoto</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        
        <div className="aspect-square bg-black relative overflow-hidden">
          {!capturedImage ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Comprovante capturado" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {!capturedImage && (
            <div className="absolute inset-0 border-2 border-white/20 m-8 rounded-3xl pointer-events-none flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-white/40 rounded-full animate-ping opacity-20" />
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
          {!capturedImage ? (
            <button 
              onClick={takePhoto} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Camera size={20} /> Capturar Fotografia
            </button>
          ) : (
            <>
              <button 
                onClick={() => setCapturedImage(null)} 
                className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 text-slate-700 transition-colors"
              >
                <RotateCcw size={16} /> Repetir
              </button>
              <button 
                onClick={handleConfirm} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Check size={16} /> Confirmar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoCapture;
