import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { AlertTriangle, Package, Filter, ArrowUpDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'INV-1', name: 'Harina de Trigo', quantity: 45, unit: 'kg', threshold: 10, category: 'Ingrediente' },
  { id: 'INV-2', name: 'Azúcar Blanca', quantity: 8, unit: 'kg', threshold: 15, category: 'Ingrediente' },
  { id: 'INV-3', name: 'Chocolate 70%', quantity: 12, unit: 'kg', threshold: 5, category: 'Ingrediente' },
  { id: 'INV-4', name: 'Huevos', quantity: 24, unit: 'cartón', threshold: 10, category: 'Ingrediente' },
  { id: 'INV-5', name: 'Cajas 20x20', quantity: 5, unit: 'pza', threshold: 20, category: 'Empaque' },
  { id: 'INV-6', name: 'Vainilla Extracto', quantity: 2, unit: 'lt', threshold: 1, category: 'Ingrediente' },
  { id: 'INV-7', name: 'Fondant Blanco', quantity: 3, unit: 'kg', threshold: 5, category: 'Decoración' },
];

export const Inventory: React.FC = () => {
  const [items] = useState<InventoryItem[]>(MOCK_INVENTORY);
  
  // Data for chart: Top 5 items with lowest stock relative to threshold
  const chartData = [...items]
    .sort((a, b) => (a.quantity / a.threshold) - (b.quantity / b.threshold))
    .slice(0, 5)
    .map(item => ({
      name: item.name,
      stock: item.quantity,
      threshold: item.threshold
    }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Alerts & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Low Stock Alerts */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-orange-500" size={20} />
              <h3 className="font-semibold text-orange-800">Alertas de Stock Bajo</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.filter(i => i.quantity <= i.threshold).map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-orange-200 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-700">{item.name}</p>
                    <p className="text-xs text-slate-500">Categoría: {item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold">{item.quantity} {item.unit}</p>
                    <p className="text-[10px] text-slate-400">Mínimo: {item.threshold}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Inventory List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Package size={18} /> Todos los Items
                </h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <Filter size={18} />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <ArrowUpDown size={18} />
                  </button>
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase">
                   <tr>
                     <th className="px-4 py-3">Nombre</th>
                     <th className="px-4 py-3">Categoría</th>
                     <th className="px-4 py-3">Stock Actual</th>
                     <th className="px-4 py-3">Estado</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {items.map(item => (
                     <tr key={item.id} className="hover:bg-slate-50/50">
                       <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                       <td className="px-4 py-3 text-slate-500">{item.category}</td>
                       <td className="px-4 py-3">
                         {item.quantity} <span className="text-xs text-slate-400">{item.unit}</span>
                       </td>
                       <td className="px-4 py-3">
                         {item.quantity <= item.threshold ? (
                           <span className="inline-block px-2 py-1 bg-red-100 text-red-600 text-xs rounded-md font-medium">Reabastecer</span>
                         ) : (
                           <span className="inline-block px-2 py-1 bg-green-100 text-green-600 text-xs rounded-md font-medium">OK</span>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Right: Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-800 mb-6">Niveles Críticos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="stock" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.stock <= entry.threshold ? '#ef4444' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-indigo-50 rounded-xl text-sm text-indigo-800">
            <p className="font-medium">Tip del Chef:</p>
            <p className="opacity-90 mt-1">
              "Mantener el stock de harina siempre por encima de 20kg asegura que nunca pares la producción de fin de semana."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};