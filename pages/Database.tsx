import React, { useRef, useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Download, Upload, Database as DatabaseIcon, AlertTriangle, CheckCircle } from 'lucide-react';

export const Database: React.FC = () => {
  const { ingredients, products, orders, customers, restoreDatabase } = useBakery();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleExport = () => {
    try {
      const data = {
        ingredients,
        products,
        orders,
        customers,
        backupDate: new Date().toISOString(),
        version: "1.0"
      };

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `pasteleria_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ type: 'success', text: 'Respaldo generado y descargado correctamente.' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error al generar el respaldo.' });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);

        // Basic validation
        if (!parsedData.ingredients || !parsedData.products || !parsedData.orders) {
          throw new Error("El archivo no tiene el formato correcto.");
        }

        if (window.confirm("¿Estás seguro de restaurar esta copia de seguridad? Se reemplazarán todos los datos actuales.")) {
            restoreDatabase(parsedData);
            setMessage({ type: 'success', text: 'Base de datos restaurada correctamente.' });
        }
      } catch (error) {
        console.error(error);
        setMessage({ type: 'error', text: 'Error al leer el archivo. Asegúrate de que sea un respaldo válido.' });
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DatabaseIcon className="text-indigo-600" /> Base de Datos
        </h2>
        <p className="text-slate-500">Gestiona las copias de seguridad de tu sistema.</p>
      </header>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                <Download size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Exportar Respaldo</h3>
            <p className="text-slate-500 mb-6 text-sm">
                Descarga un archivo JSON con todos tus productos, ingredientes, clientes y pedidos.
                Guarda este archivo en un lugar seguro.
            </p>
            <button 
                onClick={handleExport}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2"
            >
                <Download size={18} /> Descargar Copia
            </button>
        </div>

        {/* Import Card */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-4">
                <Upload size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Restaurar Copia</h3>
            <p className="text-slate-500 mb-6 text-sm">
                Sube un archivo de respaldo previamente generado para recuperar tu información. 
                <span className="block text-amber-600 font-bold mt-1">¡Atención! Esto sobrescribirá los datos actuales.</span>
            </p>
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/json"
                className="hidden" 
            />
            <button 
                onClick={handleImportClick}
                className="w-full bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:border-indigo-600 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
                <Upload size={18} /> Subir Archivo
            </button>
        </div>
      </div>
    </div>
  );
};