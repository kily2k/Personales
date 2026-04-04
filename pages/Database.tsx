import React, { useRef, useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Download, Upload, Database as DatabaseIcon, AlertTriangle, CheckCircle, Trash2, RefreshCw, Archive } from 'lucide-react';

export const Database: React.FC = () => {
  const { ingredients, products, orders, customers, restoreDatabase, clearCollectionData, resetInventoryToZero } = useBakery();
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

  /* --- Maintenance Actions --- */
  const handleClearOrders = async () => {
    if (window.confirm('⚠️ ¿Estás seguro de ELIMINAR TODOS LOS PEDIDOS?\n\nEsto borrará todo el historial de ventas y pedidos pendientes. La caja actual volverá a $0.\n\nEsta acción no se puede deshacer.')) {
        try {
            await clearCollectionData('orders');
            setMessage({ type: 'success', text: 'Todos los pedidos han sido eliminados.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Error al eliminar pedidos.' });
        }
    }
  };

  const handleClearClosures = async () => {
    if (window.confirm('⚠️ ¿Estás seguro de ELIMINAR EL HISTORIAL DE CIERRES?\n\nEsto borrará todos los reportes de meses anteriores.\n\nEsta acción no se puede deshacer.')) {
        try {
            await clearCollectionData('month_closures');
            setMessage({ type: 'success', text: 'Historial de cierres eliminado.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Error al eliminar historial.' });
        }
    }
  };

  const handleResetStock = async () => {
    if (window.confirm('⚠️ ¿Reiniciar STOCK A CERO?\n\nSe pondrá la cantidad de todos los ingredientes en 0, pero se mantendrán los nombres y costos.\n\nIdeal si tu inventario virtual se desincronizó del real.')) {
        try {
            await resetInventoryToZero();
            setMessage({ type: 'success', text: 'Stock de todos los ingredientes reiniciado a 0.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Error al reiniciar stock.' });
        }
    }
  };

  const handleClearCustomers = async () => {
    if (window.confirm('⚠️ ¿Eliminar TODOS los clientes?\n\nSe borrará la base de datos de clientes.\n\nEsta acción no se puede deshacer.')) {
        try {
            await clearCollectionData('customers');
            setMessage({ type: 'success', text: 'Base de datos de clientes eliminada.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Error al eliminar clientes.' });
        }
    }
  };


  return (
    <div className="space-y-8 pb-12">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DatabaseIcon className="text-indigo-600" /> Administración de Datos
        </h2>
        <p className="text-slate-500">Gestiona respaldos y mantenimiento del sistema.</p>
      </header>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            {message.text}
        </div>
      )}

      {/* Backup Section */}
      <div>
         <h3 className="text-lg font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">Respaldos</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                    <Download size={24} />
                </div>
                <h3 className="font-bold text-slate-800 mb-1">Exportar Datos</h3>
                <p className="text-slate-500 mb-4 text-xs">
                    Descarga un archivo JSON seguro con toda la información.
                </p>
                <button 
                    onClick={handleExport}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                    <Download size={16} /> Descargar Copia
                </button>
            </div>

            {/* Import Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-3">
                    <Upload size={24} />
                </div>
                <h3 className="font-bold text-slate-800 mb-1">Restaurar Datos</h3>
                <p className="text-slate-500 mb-4 text-xs">
                    Sobrescribe el sistema con una copia previa.
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
                    className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium hover:border-indigo-600 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    <Upload size={16} /> Subir Archivo
                </button>
            </div>
         </div>
      </div>

      {/* Maintenance Section - Danger Zone */}
      <div>
         <div className="flex items-center gap-2 mb-4 border-b border-red-100 pb-2">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="text-lg font-bold text-red-900">Zona de Mantenimiento y Limpieza</h3>
         </div>
         <p className="text-sm text-slate-500 mb-6">
            Utiliza estas herramientas para corregir errores de pruebas. <span className="font-bold">Estas acciones son irreversibles.</span>
         </p>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <button 
                onClick={handleClearOrders}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors text-left group"
            >
                <div className="bg-white p-2 rounded-full text-red-500 group-hover:text-red-600 shadow-sm">
                    <Trash2 size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-red-900 text-sm">Eliminar Todos los Pedidos</h4>
                    <p className="text-xs text-red-700 mt-1">Borra ventas pendientes y el historial diario. Reinicia el contador de caja actual.</p>
                </div>
            </button>

            <button 
                onClick={handleResetStock}
                className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-colors text-left group"
            >
                <div className="bg-white p-2 rounded-full text-orange-500 group-hover:text-orange-600 shadow-sm">
                    <RefreshCw size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-orange-900 text-sm">Reiniciar Inventario a Cero</h4>
                    <p className="text-xs text-orange-700 mt-1">Mantiene los ingredientes pero pone el stock en 0. Útil tras errores de descuento.</p>
                </div>
            </button>

            <button 
                onClick={handleClearClosures}
                className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-left group"
            >
                <div className="bg-white p-2 rounded-full text-slate-500 group-hover:text-slate-600 shadow-sm">
                    <Archive size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">Eliminar Historial de Cierres</h4>
                    <p className="text-xs text-slate-600 mt-1">Borra los reportes de meses anteriores (revenue histórico).</p>
                </div>
            </button>

            <button 
                onClick={handleClearCustomers}
                className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-left group"
            >
                <div className="bg-white p-2 rounded-full text-slate-500 group-hover:text-slate-600 shadow-sm">
                    <Trash2 size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">Eliminar Clientes</h4>
                    <p className="text-xs text-slate-600 mt-1">Limpia la base de datos de clientes registrados.</p>
                </div>
            </button>

         </div>
      </div>
    </div>
  );
};