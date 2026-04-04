import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  X, 
  Image as ImageIcon,
  RefreshCcw,
  Sticker,
  ZoomIn,
  ZoomOut,
  Maximize,
  Scissors,
  Palette,
  Type as TypeIcon,
  Loader2,
  Sparkles
} from 'lucide-react';

const FONTS = [
  { id: 'inter', name: 'Moderna (Inter)', family: "'Inter', sans-serif" },
  { id: 'serif', name: 'Elegante (Serif)', family: "serif" },
  { id: 'cursive', name: 'Manuscrita', family: "cursive" },
  { id: 'fantasy', name: 'Decorativa', family: "fantasy" },
  { id: 'system', name: 'Clásica (Arial)', family: "Arial, sans-serif" }
];

export const TopperDesigner: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#4f46e5');
  const [fontFamily, setFontFamily] = useState(FONTS[0].family);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !image) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Función para dibujar el texto circular
  const drawCircularText = (ctx: CanvasRenderingContext2D, text: string, centerX: number, centerY: number, radius: number) => {
    if (!text) return;
    ctx.font = `bold ${radius * 0.15}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const characters = text.split('');
    const totalAngle = Math.PI * 0.8; // Ángulo total que ocupa el texto (aprox 144 grados)
    const anglePerChar = totalAngle / (characters.length - 1 || 1);
    
    // Centrar el texto en el arco superior (centrado en -PI/2)
    const initialAngle = -Math.PI / 2 - (totalAngle / 2);

    characters.forEach((char, i) => {
      const charAngle = initialAngle + (i * anglePerChar);
      ctx.save();
      ctx.translate(centerX + radius * Math.cos(charAngle), centerY + radius * Math.sin(charAngle));
      ctx.rotate(charAngle + Math.PI / 2);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  };

  const renderTopper = () => {
    if (!image) return;
    setLoading(true);

    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // 1. Limpiar fondo
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Dibujar imagen de usuario con su encuadre
      ctx.save();
      // Crear máscara circular
      ctx.beginPath();
      ctx.arc(1000, 1000, 980, 0, Math.PI * 2);
      ctx.clip();

      const imgRatio = img.width / img.height;
      let drawW, drawH;
      if (imgRatio > 1) {
        drawH = 2000 * zoom;
        drawW = drawH * imgRatio;
      } else {
        drawW = 2000 * zoom;
        drawH = drawW / imgRatio;
      }

      // El factor de escala del contenedor al canvas de 2000px
      const scale = 2000 / (containerRef.current?.offsetWidth || 500);
      const drawX = 1000 + (position.x * scale) - (drawW / 2);
      const drawY = 1000 + (position.y * scale) - (drawH / 2);

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // 3. Dibujar Texto Circular (con un radio ligeramente menor para que esté dentro)
      drawCircularText(ctx, text, 1000, 1000, 850);

      // 4. Guía de puntos (opcional para el resultado interno, obligatoria para descarga)
      setResult(canvas.toDataURL('image/png'));
      setLoading(false);
    };
    img.src = image;
  };

  const downloadImage = () => {
    if (!result) return;
    
    // Crear canvas final con guía de corte
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 2000;
    finalCanvas.height = 2000;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 2000, 2000);
      ctx.drawImage(img, 0, 0);
      
      // Borde de corte punteado
      ctx.beginPath();
      ctx.arc(1000, 1000, 980, 0, Math.PI * 2);
      ctx.strokeStyle = '#cccccc'; 
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 20]); 
      ctx.stroke();
      
      const link = document.createElement('a');
      link.href = finalCanvas.toDataURL('image/png');
      link.download = `topper_20cm_${text.replace(/\s+/g, '_') || 'diseno'}.png`;
      link.click();
    };
    img.src = result;
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setText('');
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setTextColor('#4f46e5');
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sticker className="text-indigo-600" /> Diseñador de Toppers Pro
          </h2>
          <p className="text-slate-500 text-sm">Crea diseños circulares de 20cm personalizados.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-indigo-500" /> 1. Imagen y Encuadre
            </h3>
            
            {!image ? (
              <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <Upload className="w-10 h-10 mb-3 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-500 font-bold">Selecciona una foto para el centro</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">
                    JPG o PNG de alta resolución recomendado
                  </p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative group">
                  <div 
                    ref={containerRef}
                    className="relative w-full aspect-square bg-slate-200 rounded-2xl border border-slate-300 overflow-hidden cursor-move touch-none shadow-inner"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  >
                    <img 
                      ref={imageRef}
                      src={image} 
                      alt="Ref" 
                      className="absolute max-w-none transition-transform duration-75 pointer-events-none select-none"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        left: '50%', top: '50%', marginLeft: '-50%', marginTop: '-50%',
                        width: '100%', height: '100%', objectFit: 'contain'
                      }}
                    />
                    
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-[85%] aspect-square rounded-full border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] flex items-center justify-center">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                          <Scissors size={10} /> Línea de Corte (20cm)
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => setImage(null)} className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-1 hover:bg-slate-200 rounded transition-colors"><ZoomOut size={20} className="text-slate-500" /></button>
                    <input type="range" min="0.5" max="4" step="0.01" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <button onClick={() => setZoom(Math.min(4, zoom + 0.1))} className="p-1 hover:bg-slate-200 rounded transition-colors"><ZoomIn size={20} className="text-slate-500" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <TypeIcon size={18} className="text-indigo-500" /> 2. Personalización de Texto
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contenido del texto</label>
                <input 
                  type="text"
                  placeholder="Ej: ¡Feliz Cumpleaños Martín!"
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold bg-slate-50"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Palette size={10} /> Color letra
                  </label>
                  <input 
                    type="color"
                    className="w-full h-11 p-1 rounded-xl border border-slate-200 cursor-pointer bg-white"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <TypeIcon size={10} /> Fuente
                  </label>
                  <select 
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                  >
                    {FONTS.map(font => (
                      <option key={font.id} value={font.family}>{font.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={renderTopper}
            disabled={!image || loading}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
              !image || loading 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Previsualizar Diseño
          </button>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden shadow-2xl border border-slate-800">
          {!result && !loading && (
            <div className="text-center z-10 opacity-30 flex flex-col items-center">
              <div className="w-64 h-64 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center mb-6">
                 <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={48} className="text-slate-700" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Diseño Final</span>
                 </div>
              </div>
              <p className="text-slate-600 text-sm font-medium px-8 leading-relaxed">Configura los parámetros de la izquierda y presiona "Previsualizar" para ver el resultado.</p>
            </div>
          )}

          {loading && (
            <div className="text-center space-y-6 z-10 animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-56 h-56 rounded-full border-4 border-slate-800 flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.2)]">
                  <Loader2 size={64} className="text-indigo-500 animate-spin" />
                </div>
              </div>
              <p className="text-white font-bold animate-pulse tracking-widest uppercase text-xs">Renderizando Topper...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-8 w-full text-center z-10 animate-in zoom-in duration-500">
               <div className="relative inline-block">
                  <img 
                    src={result} 
                    alt="Topper Final" 
                    className="w-full aspect-square object-contain rounded-full shadow-[0_0_40px_rgba(255,255,255,0.1)] border-8 border-white bg-white mx-auto max-w-sm" 
                  />
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-300 opacity-50 pointer-events-none"></div>
               </div>
               
               <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-500/30 flex items-center gap-2 justify-center max-w-xs mx-auto">
                  <Maximize size={16} className="text-indigo-400" />
                  <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider">Listo para imprimir en 20cm Ø</p>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={downloadImage} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/40 hover:-translate-y-1">
                    <Download size={20} /> Descargar con Guía
                  </button>
                  <button onClick={reset} className="bg-slate-800 text-slate-300 px-6 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-700 transition-all border border-slate-700 hover:-translate-y-1">
                    <RefreshCcw size={18} /> Nuevo Diseño
                  </button>
               </div>
               <div className="flex flex-col gap-1">
                 <p className="text-[10px] text-slate-500 italic leading-relaxed">El archivo descargado incluye un margen blanco y <br/>guía punteada para facilitar el recorte.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
