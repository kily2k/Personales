import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { ProductionRequirement, UnitType } from '../types';
import { toBaseUnit, formatStock } from '../utils/conversions';
import { Calendar, ClipboardList } from 'lucide-react';

export const Production: React.FC = () => {
  const { orders, products, ingredients } = useBakery();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // QUERY / LOGIC: Generate Production List
  const requirements = useMemo(() => {
    // 1. Filter orders for the date and exclude delivered ones (keep pending/in process)
    const dailyOrders = orders.filter(o => 
      o.deliveryDate === selectedDate && o.status !== 'Entregado' && o.status !== 'Completado'
    );

    const map = new Map<string, number>(); // ingredientId -> totalBaseAmount

    // 2. Iterate orders -> items -> product recipes
    dailyOrders.forEach(order => {
      order.items.forEach(orderItem => {
        const product = products.find(p => p.id === orderItem.productId);
        if(!product) return;

        product.recipe.forEach(recipeItem => {
           // Normalize to base unit (e.g. g or ml)
           const amountBase = toBaseUnit(recipeItem.quantity, recipeItem.unit);
           const totalNeeded = amountBase * orderItem.quantity;
           
           const current = map.get(recipeItem.ingredientId) || 0;
           map.set(recipeItem.ingredientId, current + totalNeeded);
        });
      });
    });

    // 3. Transform to view model
    const result: ProductionRequirement[] = [];
    map.forEach((totalNeeded, ingId) => {
      const ing = ingredients.find(i => i.id === ingId);
      if(ing) {
        result.push({
          ingredientId: ingId,
          ingredientName: ing.name,
          totalNeeded: totalNeeded,
          currentStock: ing.currentStock,
          unit: ing.unit,
          missing: Math.max(0, totalNeeded - ing.currentStock)
        });
      }
    });

    return result;
  }, [orders, products, ingredients, selectedDate]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <ClipboardList /> Planificación de Producción
           </h2>
           <p className="text-slate-500 text-sm">Calcula la materia prima necesaria para los pedidos del día.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
           <Calendar size={18} className="text-indigo-600" />
           <input 
             type="date" 
             value={selectedDate}
             onChange={(e) => setSelectedDate(e.target.value)}
             className="outline-none text-slate-700 font-medium bg-transparent"
           />
        </div>
      </header>

      {requirements.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-slate-200 text-slate-400">
          No hay pedidos pendientes de producción para esta fecha.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-indigo-800 text-sm">
            <span className="font-bold">Resumen:</span> Se calculó el total de materia prima para {orders.filter(o => o.deliveryDate === selectedDate && o.status !== 'Entregado' && o.status !== 'Completado').length} pedidos pendientes.
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Materia Prima</th>
                <th className="px-6 py-4 text-right">Cantidad Total Necesaria</th>
                <th className="px-6 py-4 text-right">Stock Disponible</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirements.map(req => {
                const isEnough = req.currentStock >= req.totalNeeded;
                return (
                  <tr key={req.ingredientId} className={!isEnough ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 font-medium text-slate-800">{req.ingredientName}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">
                      {formatStock(req.totalNeeded, req.unit)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {formatStock(req.currentStock, req.unit)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isEnough ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Suficiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Faltan {formatStock(req.missing, req.unit)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="bg-slate-100 p-4 rounded-lg text-xs text-slate-500">
        <strong>Nota Técnica:</strong> Esta lista consolida todas las recetas de los pedidos "Pendientes" o "En Proceso" para la fecha seleccionada. No incluye pedidos ya marcados como "Completados".
      </div>
    </div>
  );
};