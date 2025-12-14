import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { AlertTriangle, ShoppingBag, Clock, DollarSign, CheckCircle2, X, ChevronRight, CreditCard, Banknote } from 'lucide-react';
import { formatStock, formatCurrency } from '../utils/conversions';
import { STATUS_COLORS } from '../constants';

type DetailViewType = 'pending' | 'today' | 'lowStock' | null;

export const Dashboard: React.FC = () => {
  const { ingredients, orders, products } = useBakery();
  const [viewDetails, setViewDetails] = useState<DetailViewType>(null);

  // Low Stock Logic
  const lowStockItems = ingredients.filter(ing => ing.currentStock <= ing.minStock);

  // Order Stats
  const pendingOrdersList = orders.filter(o => o.status === 'Pendiente');
  const pendingOrdersCount = pendingOrdersList.length;

  const today = new Date().toISOString().split('T')[0];
  const todayOrdersList = orders.filter(o => o.deliveryDate === today);
  const todayOrdersCount = todayOrdersList.length;

  // Financial Stats
  // 1. Pagado: Dinero ingresado efectivamente.
  const paidOrders = orders.filter(o => o.status === 'Pagado');
  const revenueCollected = paidOrders.reduce((acc, order) => acc + order.totalPrice, 0);

  // 2. Entregado (Por Cobrar): Producto entregado pero no marcado como pagado aún.
  const deliveredOrders = orders.filter(o => o.status === 'Entregado');
  const revenueReceivable = deliveredOrders.reduce((acc, order) => acc + order.totalPrice, 0);

  // Total Sales Value (Collected + Receivable)
  const totalSalesValue = revenueCollected + revenueReceivable;
  
  // Progress Bar: Percentage of sales actually collected vs receivable
  const collectionRate = totalSalesValue > 0 ? (revenueCollected / totalSalesValue) * 100 : 0;

  const renderDetailContent = () => {
    if (viewDetails === 'lowStock') {
      return (
        <div className="space-y-3">
          {lowStockItems.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No hay ítems con stock bajo.</p>
          ) : (
            lowStockItems.map(item => {
              const max = item.minStock * 2;
              const pct = Math.min(100, (item.currentStock / max) * 100);
              return (
                <div key={item.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="font-bold text-red-600">{formatStock(item.currentStock, item.unit)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">Mínimo: {formatStock(item.minStock, item.unit)}</div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.max(5, pct)}%` }}></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    const orderList = viewDetails === 'pending' ? pendingOrdersList : todayOrdersList;
    const emptyMsg = viewDetails === 'pending' ? 'No hay pedidos pendientes.' : 'No hay pedidos para hoy.';

    return (
      <div className="space-y-3">
        {orderList.length === 0 ? (
          <p className="text-center text-slate-500 py-4">{emptyMsg}</p>
        ) : (
          orderList.map(order => (
            <div key={order.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-slate-800">{order.customerName}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> Entrega: {order.deliveryDate}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <ul className="text-sm text-slate-600 space-y-1 mb-2 bg-slate-50 p-2 rounded">
                {order.items.map((item, idx) => {
                  const pName = products.find(p => p.id === item.productId)?.name || 'Producto';
                  return (
                    <li key={idx} className="flex justify-between">
                      <span>{item.quantity}x {pName}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="text-right font-bold text-slate-800 text-sm">
                Total: {formatCurrency(order.totalPrice)}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const getModalTitle = () => {
    switch (viewDetails) {
      case 'pending': return 'Pedidos Pendientes';
      case 'today': return 'Pedidos Para Hoy';
      case 'lowStock': return 'Alertas de Stock Bajo';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>
        <p className="text-slate-500">Resumen operativo y financiero.</p>
      </header>

      {/* Financial Summary Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4 opacity-80">
          <DollarSign className="text-emerald-400" />
          <span className="uppercase tracking-wider text-sm font-semibold">Balance de Ventas</span>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <div>
             <p className="text-sm text-slate-300 mb-1">Total Pagado (Caja)</p>
             <p className="text-3xl font-bold text-emerald-400">{formatCurrency(revenueCollected)}</p>
             <div className="flex items-center gap-1 mt-1 text-xs text-emerald-200/70">
                <Banknote size={12} /> {paidOrders.length} pedidos cobrados
             </div>
          </div>
          
          <div className="border-l border-white/10 pl-8">
             <p className="text-sm text-slate-300 mb-1">Por Cobrar (Entregados)</p>
             <p className="text-2xl font-bold text-slate-200">{formatCurrency(revenueReceivable)}</p>
             <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                <CreditCard size={12} /> {deliveredOrders.length} pendientes de pago
             </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between text-xs mb-1">
            <span>Progreso de Cobranza</span>
            <span>{collectionRate.toFixed(0)}% cobrado</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 flex overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 transition-all"
              style={{ width: `${collectionRate}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-right mt-1 text-slate-400">Total Ventas (Pagado + Entregado): {formatCurrency(totalSalesValue)}</p>
        </div>
      </div>

      {/* Operational KPI Cards - Clickable */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <button 
          onClick={() => setViewDetails('pending')}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="p-2 bg-yellow-100 rounded-full text-yellow-600 mb-2 group-hover:scale-110 transition-transform"><ShoppingBag size={20} /></div>
          <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600">Pendientes</span>
          <p className="text-xl font-bold text-slate-800">{pendingOrdersCount}</p>
          <span className="text-[10px] text-indigo-500 mt-1 opacity-0 group-hover:opacity-100 flex items-center">Ver lista <ChevronRight size={10}/></span>
        </button>
        
        <button 
          onClick={() => setViewDetails('today')}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="p-2 bg-blue-100 rounded-full text-blue-600 mb-2 group-hover:scale-110 transition-transform"><Clock size={20} /></div>
          <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600">Para Hoy</span>
          <p className="text-xl font-bold text-slate-800">{todayOrdersCount}</p>
          <span className="text-[10px] text-indigo-500 mt-1 opacity-0 group-hover:opacity-100 flex items-center">Ver lista <ChevronRight size={10}/></span>
        </button>

        <button 
          onClick={() => setViewDetails('lowStock')}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="p-2 bg-red-100 rounded-full text-red-600 mb-2 group-hover:scale-110 transition-transform"><AlertTriangle size={20} /></div>
          <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600">Stock Bajo</span>
          <p className="text-xl font-bold text-slate-800">{lowStockItems.length}</p>
          <span className="text-[10px] text-indigo-500 mt-1 opacity-0 group-hover:opacity-100 flex items-center">Ver lista <ChevronRight size={10}/></span>
        </button>
      </div>

      {/* Low Stock Alerts Section (Inline Preview) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Alertas de Stock
          </h3>
          {lowStockItems.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
              {lowStockItems.length}
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center text-slate-400">
              <CheckCircle2 size={32} className="mb-2 text-emerald-100" />
              <p>Todo el inventario está bajo control.</p>
            </div>
          ) : (
            // Only show top 5 here to encourage using the detail view if list is long
            lowStockItems.slice(0, 5).map(item => {
               const max = item.minStock * 2;
               const pct = Math.min(100, (item.currentStock / max) * 100);
               return (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="text-sm font-bold text-red-600">{formatStock(item.currentStock, item.unit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                    <span>Mínimo requerido: {formatStock(item.minStock, item.unit)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(5, pct)}%` }}
                    ></div>
                  </div>
                </div>
               );
            })
          )}
          {lowStockItems.length > 5 && (
             <button 
               onClick={() => setViewDetails('lowStock')}
               className="w-full py-3 text-sm text-indigo-600 font-medium hover:bg-slate-50"
             >
                Ver todos ({lowStockItems.length})
             </button>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {viewDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white rounded-t-xl">
              <h3 className="font-bold">{getModalTitle()}</h3>
              <button onClick={() => setViewDetails(null)} className="hover:bg-white/20 rounded-full p-1"><X size={20} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {renderDetailContent()}
            </div>
            
            <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <button 
                onClick={() => setViewDetails(null)}
                className="w-full py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};