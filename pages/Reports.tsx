import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Printer, TrendingUp, Package, Calendar, DollarSign } from 'lucide-react';
import { formatStock, formatCurrency } from '../utils/conversions';

export const Reports: React.FC = () => {
  const { orders, products, ingredients } = useBakery();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Filter orders by month. Include both 'Entregado' and 'Pagado' as valid sales.
  const monthlyOrders = orders.filter(o => 
    o.deliveryDate.startsWith(month) && (o.status === 'Entregado' || o.status === 'Pagado')
  );
  
  // Stats
  const totalSales = monthlyOrders.reduce((acc, o) => acc + o.totalPrice, 0);
  const totalOrders = monthlyOrders.length;
  const paidOrdersCount = monthlyOrders.filter(o => o.status === 'Pagado').length;
  
  // Product Popularity
  const productStats: Record<string, {name: string, qty: number, revenue: number}> = {};
  monthlyOrders.forEach(o => {
    o.items.forEach(item => {
      if (!productStats[item.productId]) {
        const p = products.find(prod => prod.id === item.productId);
        productStats[item.productId] = { name: p?.name || 'Unknown', qty: 0, revenue: 0 };
      }
      const pPrice = products.find(prod => prod.id === item.productId)?.price || 0;
      productStats[item.productId].qty += item.quantity;
      productStats[item.productId].revenue += item.quantity * pPrice;
    });
  });

  const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Generador de Informes</h2>
        <div className="flex gap-4">
           <input 
             type="month" 
             value={month} 
             onChange={e => setMonth(e.target.value)}
             className="border border-slate-300 rounded-lg p-2 text-sm"
           />
           <button 
             onClick={handlePrint}
             className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm"
           >
             <Printer size={18} /> Imprimir Reporte
           </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-8 border-b border-slate-100 pb-6">
           <h1 className="text-3xl font-bold text-slate-900 mb-1">PasteleríaPRO</h1>
           <p className="text-slate-500 uppercase tracking-widest text-sm">Reporte Mensual de Gestión</p>
           <h3 className="text-xl font-semibold text-indigo-600 mt-2">{month}</h3>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center print:border-slate-300">
              <span className="text-xs text-slate-500 uppercase font-semibold">Ventas Totales</span>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalSales)}</p>
           </div>
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center print:border-slate-300">
              <span className="text-xs text-slate-500 uppercase font-semibold">Pedidos Entregados</span>
              <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
              <span className="text-[10px] text-slate-400">({paidOrdersCount} Pagados)</span>
           </div>
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center print:border-slate-300">
              <span className="text-xs text-slate-500 uppercase font-semibold">Ticket Promedio</span>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(totalOrders > 0 ? (totalSales / totalOrders) : 0)}
              </p>
           </div>
        </div>

        <div className="mb-8">
           <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <TrendingUp size={18} className="text-indigo-600"/> Rendimiento de Productos
           </h4>
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-y border-slate-200">
               <tr>
                 <th className="py-2 px-3">Producto</th>
                 <th className="py-2 px-3 text-right">Cant. Vendida</th>
                 <th className="py-2 px-3 text-right">Ingresos Generados</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {topProducts.length > 0 ? topProducts.map((p, i) => (
                 <tr key={i}>
                   <td className="py-2 px-3 font-medium">{p.name}</td>
                   <td className="py-2 px-3 text-right">{p.qty}</td>
                   <td className="py-2 px-3 text-right font-bold">{formatCurrency(p.revenue)}</td>
                 </tr>
               )) : (
                 <tr><td colSpan={3} className="py-4 text-center text-slate-500">Sin ventas registradas este mes.</td></tr>
               )}
             </tbody>
           </table>
        </div>

        <div className="mb-8 break-inside-avoid">
           <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Package size={18} className="text-indigo-600"/> Estado de Inventario Crítico
           </h4>
           <table className="w-full text-left text-sm border-collapse">
             <thead className="bg-slate-50 border-y border-slate-200">
               <tr>
                 <th className="py-2 px-3">Ingrediente</th>
                 <th className="py-2 px-3 text-right">Stock Actual</th>
                 <th className="py-2 px-3 text-right">Mínimo Req.</th>
                 <th className="py-2 px-3 text-center">Estado</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {ingredients.filter(i => i.currentStock <= i.minStock).map(i => (
                  <tr key={i.id}>
                    <td className="py-2 px-3">{i.name}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">{formatStock(i.currentStock, i.unit)}</td>
                    <td className="py-2 px-3 text-right">{formatStock(i.minStock, i.unit)}</td>
                    <td className="py-2 px-3 text-center text-red-600 font-bold text-xs uppercase">Reponer</td>
                  </tr>
                ))}
                {ingredients.filter(i => i.currentStock <= i.minStock).length === 0 && (
                   <tr><td colSpan={4} className="py-4 text-center text-slate-500">Inventario saludable.</td></tr>
                )}
             </tbody>
           </table>
        </div>

        <div className="text-xs text-slate-400 text-center mt-12 pt-4 border-t border-slate-100 print:block hidden">
          Generado automáticamente por PasteleríaPRO el {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};