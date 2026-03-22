import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { 
  TrendingUp, 
  Package, 
  History, 
  Calendar, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  AlertTriangle,
  ReceiptText,
  Printer,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { formatCurrency, toBaseUnit, fromBaseUnit } from '../utils/conversions';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export const Reports: React.FC = () => {
  const { orders, products, ingredients, monthClosures } = useBakery();
  const [activeTab, setActiveTab] = useState<'operativo' | 'contabilidad' | 'historial'>('operativo');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [zoomLevel, setZoomLevel] = useState<'month' | '3months' | '12months'>('3months');

  // --- LÓGICA DE CÁLCULO DE COSTOS ---

  // Calcula el costo de producción de 1 unidad de producto de forma recursiva
  const calculateProductCost = (prodId: string): number => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return 0;

    return prod.recipe.reduce((acc, item) => {
      const type = item.type || 'INGREDIENT';
      
      if (type === 'INGREDIENT') {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        if (!ing) return acc;
        
        // 1. Cantidad en base (g, ml, u)
        const amountInBase = toBaseUnit(item.quantity, item.unit);
        // 2. Proporción respecto a la unidad de costo del ingrediente
        const amountInIngUnit = fromBaseUnit(amountInBase, ing.unit);
        // 3. Multiplicar por el costo unitario
        return acc + (amountInIngUnit * ing.costPerUnit);
      } else {
        // Es un sub-producto (recursión)
        return acc + (calculateProductCost(item.ingredientId) * item.quantity);
      }
    }, 0);
  };

  // --- PROCESAMIENTO DE DATOS DEL MES ---

  const monthlyOrders = useMemo(() => orders.filter(o => 
    o.deliveryDate.startsWith(month) && (o.status === 'Entregado' || o.status === 'Pagado')
  ), [orders, month]);

  const stats = useMemo(() => {
    let revenue = 0;
    let totalCogs = 0; // CMV
    const productMap: Record<string, { name: string, qty: number, rev: number, cost: number }> = {};

    monthlyOrders.forEach(o => {
      revenue += o.totalPrice; // Ingreso real facturado
      
      o.items.forEach(item => {
        if (!productMap[item.productId]) {
          const p = products.find(prod => prod.id === item.productId);
          productMap[item.productId] = { 
            name: p?.name || 'Desconocido', 
            qty: 0, 
            rev: 0, 
            cost: calculateProductCost(item.productId) 
          };
        }
        
        // Precio unitario efectivo del pedido
        const effectivePrice = item.unitPrice !== undefined 
          ? item.unitPrice 
          : (products.find(p => p.id === item.productId)?.price || 0);
        
        productMap[item.productId].qty += item.quantity;
        productMap[item.productId].rev += item.quantity * effectivePrice;
        totalCogs += item.quantity * productMap[item.productId].cost;
      });
    });

    const grossProfit = revenue - totalCogs;
    const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const sortedProducts = Object.values(productMap).sort((a, b) => b.rev - a.rev);

    return {
      revenue,
      totalCogs,
      grossProfit,
      marginPct,
      topProducts: sortedProducts
    };
  }, [monthlyOrders, products, ingredients]);

  const lowStockAlertsCount = ingredients.filter(i => i.currentStock <= i.minStock).length;

  // --- DIAGNÓSTICOS DE DATOS ---
  const diagnostics = useMemo(() => {
    const productsWithoutRecipe = products.filter(p => !p.recipe || p.recipe.length === 0);
    const ingredientsWithZeroCost = ingredients.filter(i => !i.costPerUnit || i.costPerUnit === 0);
    const oldClosuresWithoutCost = monthClosures.filter(c => c.totalCost === undefined || c.totalCost === 0);
    
    return {
      productsWithoutRecipe,
      ingredientsWithZeroCost,
      oldClosuresWithoutCost,
      hasIssues: productsWithoutRecipe.length > 0 || ingredientsWithZeroCost.length > 0 || oldClosuresWithoutCost.length > 0
    };
  }, [products, ingredients, monthClosures]);

  const chartData = useMemo(() => {
    if (zoomLevel === 'month') {
      // Daily data for the selected month
      const [year, m] = month.split('-').map(Number);
      const daysInMonth = new Date(year, m, 0).getDate();
      const dailyData = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${month}-${String(i).padStart(2, '0')}`;
        const dayOrders = orders.filter(o => o.deliveryDate === dateStr && (o.status === 'Entregado' || o.status === 'Pagado'));
        const revenue = dayOrders.reduce((acc, o) => acc + o.totalPrice, 0);
        let cost = 0;
        dayOrders.forEach(o => {
          o.items.forEach(item => {
            cost += item.quantity * calculateProductCost(item.productId);
          });
        });
        dailyData.push({
          label: `${i}`,
          ingresos: revenue,
          costos: Math.round(cost),
          utilidad: revenue - Math.round(cost)
        });
      }
      return dailyData;
    } else {
      // Monthly closures data
      const limit = zoomLevel === '3months' ? 3 : 12;
      const sortedClosures = [...monthClosures].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // If we are in 3months view and have few closures, maybe include current month's partial data
      let data = sortedClosures.slice(-limit).map(c => ({
        label: c.periodLabel.split(' - ')[0],
        ingresos: c.totalRevenue,
        costos: c.totalCost || 0,
        utilidad: c.totalRevenue - (c.totalCost || 0)
      }));

      // If we don't have enough closures or want to see current progress
      if (data.length < limit && zoomLevel === '3months') {
         // Could add current month stats here if not already closed
      }

      return data;
    }
  }, [zoomLevel, month, orders, monthClosures, products, ingredients]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 pb-12">
      {/* Selector de Módulos */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Módulos de Reporte</h2>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
          <button 
            onClick={() => setActiveTab('operativo')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === 'operativo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package size={16} /> Gestión Operativa
          </button>
          <button 
            onClick={() => setActiveTab('contabilidad')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === 'contabilidad' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ReceiptText size={16} /> Contabilidad
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === 'historial' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <History size={16} /> Historial
          </button>
        </div>
      </div>

      {/* Selector de Mes */}
      <div className="flex justify-end gap-3 print:hidden">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Calendar size={16} className="text-slate-400" />
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            className="text-sm font-medium outline-none bg-transparent"
          />
        </div>
        <button 
          onClick={handlePrint}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 shadow-sm text-sm"
        >
          <Printer size={16} /> Imprimir
        </button>
      </div>

      {/* --- MÓDULO: GESTIÓN OPERATIVA --- */}
      {activeTab === 'operativo' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Pedidos Cerrados</p>
              <h4 className="text-3xl font-black text-slate-800">{monthlyOrders.length}</h4>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Más Vendido</p>
              <h4 className="text-xl font-bold text-indigo-600 truncate">{stats.topProducts[0]?.name || '---'}</h4>
              <p className="text-[10px] text-slate-500 mt-1">{stats.topProducts[0]?.qty || 0} unidades.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Alertas Stock</p>
              <h4 className={`text-3xl font-black ${lowStockAlertsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {lowStockAlertsCount}
              </h4>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" /> Movimiento de Productos
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4 text-center">Cant.</th>
                  <th className="px-6 py-4 text-right">Monto Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-6 py-4 text-center text-slate-600 font-mono">{p.qty}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(p.rev)}</td>
                  </tr>
                ))}
                {stats.topProducts.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No hay ventas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MÓDULO: CONTABILIDAD --- */}
      {activeTab === 'contabilidad' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Dashboard Financiero */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ventas Totales</p>
              <h4 className="text-2xl font-black text-indigo-600">{formatCurrency(stats.revenue)}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Costo Venta (CMV)</p>
              <h4 className="text-2xl font-black text-red-500">{formatCurrency(stats.totalCogs)}</h4>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Utilidad Bruta</p>
              <h4 className="text-2xl font-black text-emerald-700">{formatCurrency(stats.grossProfit)}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Margen Bruto</p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-black text-slate-800">{stats.marginPct.toFixed(1)}%</h4>
                {stats.marginPct > 45 ? <ArrowUpRight className="text-emerald-500" /> : <ArrowDownRight className="text-amber-500" />}
              </div>
            </div>
          </div>

          {/* Alertas de Integridad de Datos */}
          {diagnostics.hasIssues && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertTriangle size={18} /> 
                Atención: Detectamos datos incompletos que afectan los costos
              </div>
              <ul className="text-xs text-amber-700 space-y-1 ml-6 list-disc">
                {diagnostics.productsWithoutRecipe.length > 0 && (
                  <li>Hay <strong>{diagnostics.productsWithoutRecipe.length} productos</strong> sin receta definida (Costo = $0).</li>
                )}
                {diagnostics.ingredientsWithZeroCost.length > 0 && (
                  <li>Hay <strong>{diagnostics.ingredientsWithZeroCost.length} ingredientes</strong> con costo unitario $0.</li>
                )}
                {diagnostics.oldClosuresWithoutCost.length > 0 && (
                  <li>Hay <strong>{diagnostics.oldClosuresWithoutCost.length} cierres antiguos</strong> que no guardaron datos de costo (se muestran como $0 en el historial).</li>
                )}
              </ul>
              <p className="text-[10px] text-amber-600 italic ml-6">
                * Los costos solo se calculan correctamente para productos con recetas completas e ingredientes con precios válidos.
              </p>
            </div>
          )}

          {/* Gráficos de Tendencias Separados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Ingresos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tendencia de Ingresos</h3>
                  <p className="text-xs text-slate-500">
                    {zoomLevel === 'month' ? `Detalle diario de ${month}` : `Últimos ${zoomLevel === '3months' ? '3' : '12'} cierres`}
                  </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setZoomLevel('month')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${zoomLevel === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    <div className="flex items-center gap-1"><ZoomIn size={12} /> Mes</div>
                  </button>
                  <button 
                    onClick={() => setZoomLevel('3months')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${zoomLevel === '3months' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    3 Meses
                  </button>
                  <button 
                    onClick={() => setZoomLevel('12months')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${zoomLevel === '12months' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    <div className="flex items-center gap-1"><ZoomOut size={12} /> 12 Meses</div>
                  </button>
                </div>
              </div>

              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      tickFormatter={(value) => `$${value/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Ingresos']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ingresos" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorIngresos)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Costos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tendencia de Costos</h3>
                  <p className="text-xs text-slate-500">
                    {zoomLevel === 'month' ? `Detalle diario de ${month}` : `Últimos ${zoomLevel === '3months' ? '3' : '12'} cierres`}
                  </p>
                </div>
                {/* Los controles de zoom están sincronizados arriba, no los repetimos para no saturar si no es necesario, o los dejamos para independencia */}
              </div>

              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCostos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      tickFormatter={(value) => `$${value/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Costos']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="costos" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorCostos)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Estado de Resultados Simplificado */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden border-t-4 border-t-emerald-500">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Estado de Resultados</h3>
                <p className="text-xs text-slate-400">Simplificado - Base Insumos</p>
              </div>
              <PieChart size={32} className="text-emerald-400 opacity-50" />
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 text-slate-600">
                  <span className="font-medium">Ingresos Brutos (+)</span>
                  <span className="font-mono text-lg">{formatCurrency(stats.revenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-slate-600 border-b border-slate-100">
                  <span className="font-medium">Costo Variable (CMV) (-)</span>
                  <span className="font-mono text-lg text-red-500">({formatCurrency(stats.totalCogs)})</span>
                </div>
                <div className="flex justify-between items-center py-5 bg-emerald-50 px-6 rounded-2xl border border-emerald-100">
                  <span className="text-emerald-800 font-black text-xl tracking-tight">UTILIDAD BRUTA (=)</span>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-emerald-700">{formatCurrency(stats.grossProfit)}</span>
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Margen: {stats.marginPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <div className="flex items-center gap-2 text-slate-800 text-xs font-black uppercase mb-4 tracking-tighter">
                  <Wallet size={16} className="text-emerald-600" /> Rentabilidad por Producto
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.topProducts.map((p, idx) => {
                    const unitCost = p.cost;
                    const unitPrice = p.qty > 0 ? (p.rev / p.qty) : 0;
                    const unitProfit = unitPrice - unitCost;
                    const prodMargin = unitPrice > 0 ? (unitProfit / unitPrice) * 100 : 0;

                    return (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 hover:border-indigo-200 transition-colors">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate pr-2">{p.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                             C: {formatCurrency(unitCost)} | P: {formatCurrency(unitPrice)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-black text-sm ${unitProfit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            +{formatCurrency(unitProfit)}/u
                          </p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${prodMargin > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {prodMargin.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="bg-amber-50 p-4 text-[10px] text-amber-800 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>
                   <strong>Nota contable:</strong> Este reporte calcula la utilidad bruta basada solo en ingredientes de la receta. Gastos fijos (alquiler, luz) no están incluidos.
                </span>
            </div>
          </div>
        </div>
      )}

      {/* --- MÓDULO: HISTORIAL --- */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            Cierres de Caja Archivados
          </div>
          {monthClosures.length === 0 ? (
            <div className="p-16 text-center text-slate-400 italic">No hay cierres previos.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Periodo</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-center">Pedidos</th>
                  <th className="px-6 py-4 text-right">Ingresos</th>
                  <th className="px-6 py-4 text-right">Costos</th>
                  <th className="px-6 py-4 text-right">Utilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthClosures.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-700">{c.periodLabel}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(c.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">{c.totalOrders}</td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-600">{formatCurrency(c.totalRevenue)}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">{formatCurrency(c.totalCost || 0)}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600">{formatCurrency(c.totalRevenue - (c.totalCost || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};