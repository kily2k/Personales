import React, { useMemo, useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Order, Customer } from '../types';
import { formatCurrency, formatDate } from '../utils/conversions';
import { 
  DollarSign, 
  MessageCircle, 
  CheckCircle2, 
  Search, 
  Clock, 
  AlertCircle
} from 'lucide-react';

export const Receivables: React.FC = () => {
  const { orders, customers, products, updateOrderStatus } = useBakery();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(null);

  // Group orders by customer, but ONLY for 'Entregado' (Delivered but unpaid)
  const debtors = useMemo(() => {
    const unpaidOrders = orders.filter(o => o.status === 'Entregado');
    const customerDebtMap = new Map<string, { customer: Customer; orders: Order[]; total: number }>();

    unpaidOrders.forEach(order => {
      const customer = customers.find(c => c.id === order.customerId) || { 
        id: order.customerId, 
        name: order.customerName 
      } as Customer;
      
      const current = customerDebtMap.get(customer.id) || { customer, orders: [], total: 0 };
      current.orders.push(order);
      current.total += order.totalPrice;
      customerDebtMap.set(customer.id, current);
    });

    return Array.from(customerDebtMap.values())
      .filter(d => d.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [orders, customers, searchTerm]);

  const totalOwed = useMemo(() => {
    return debtors.reduce((acc, d) => acc + d.total, 0);
  }, [debtors]);

  const handleMarkAsPaid = async (orderId: string) => {
    if (window.confirm('¿Confirmas que recibiste el pago de este pedido?')) {
      await updateOrderStatus(orderId, 'Pagado');
    }
  };

  const copyToWhatsApp = (debtor: { customer: Customer; orders: Order[]; total: number }) => {
    const header = `*Resumen de Cuenta*\nHola ${debtor.customer.name}, te envío el detalle de tus pedidos pendientes de pago:\n\n`;
    const body = debtor.orders.map(o => {
      const itemsStr = o.items.map(i => {
        const p = products.find(prod => prod.id === i.productId);
        return `${i.quantity}x ${p?.name || 'Producto'}`;
      }).join(', ');
      return `📅 *Fecha:* ${formatDate(o.deliveryDate)}\n🍰 *Detalle:* ${itemsStr}\n💰 *Monto:* ${formatCurrency(o.totalPrice)}\n-------------------`;
    }).join('\n');
    
    const footer = `\n*TOTAL A PAGAR: ${formatCurrency(debtor.total)}*`;
    const fullText = header + body + footer;
    
    navigator.clipboard.writeText(fullText);
    alert('¡Resumen copiado! Ya puedes pegarlo en WhatsApp.');
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-emerald-600" /> Cuentas por Cobrar
          </h2>
          <p className="text-slate-500 text-sm">Gestiona cobros de pedidos ya entregados.</p>
        </div>
        <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-emerald-100">
           <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Total Pendiente</p>
           <p className="text-2xl font-black">{formatCurrency(totalOwed)}</p>
        </div>
      </header>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar deudor..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {debtors.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
             <CheckCircle2 size={48} className="mx-auto mb-3 opacity-20 text-emerald-500" />
             <p className="text-lg font-medium">¡No hay deudas pendientes!</p>
             <p className="text-sm">Todos los pedidos entregados han sido pagados.</p>
          </div>
        ) : (
          debtors.map(debtor => (
            <div 
              key={debtor.customer.id} 
              className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${selectedDebtorId === debtor.customer.id ? 'border-emerald-500 ring-2 ring-emerald-50' : 'border-slate-200'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                    {debtor.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{debtor.customer.name}</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{debtor.orders.length} pedidos pendientes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600 leading-none">{formatCurrency(debtor.total)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Saldos vencidos</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => copyToWhatsApp(debtor)}
                  className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                <button 
                  onClick={() => setSelectedDebtorId(selectedDebtorId === debtor.customer.id ? null : debtor.customer.id)}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-200"
                >
                  {selectedDebtorId === debtor.customer.id ? 'Ocultar Detalle' : 'Ver Pedidos'}
                </button>
              </div>

              {/* Expansion Detail */}
              {selectedDebtorId === debtor.customer.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                  {debtor.orders.map(order => (
                    <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
                          <Clock size={12} className="text-slate-400" /> {formatDate(order.deliveryDate)}
                        </div>
                        <ul className="text-[10px] text-slate-500 list-disc list-inside">
                          {order.items.map((item, idx) => (
                            <li key={idx}>{item.quantity}x {products.find(p => p.id === item.productId)?.name}</li>
                          ))}
                        </ul>
                        <p className="text-sm font-black text-slate-800 mt-2">{formatCurrency(order.totalPrice)}</p>
                      </div>
                      <button 
                        onClick={() => handleMarkAsPaid(order.id)}
                        className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                        title="Marcar como Pagado"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-xs text-amber-800 items-start">
        <AlertCircle size={18} className="text-amber-600 shrink-0" />
        <p>
          <strong>Recordatorio:</strong> Los pedidos aparecen aquí automáticamente al cambiar su estado a <strong>"Entregado"</strong>. Una vez que marques un pedido como <strong>"Pagado"</strong>, saldrá de esta lista y se incluirá en tu flujo de caja real.
        </p>
      </div>
    </div>
  );
};