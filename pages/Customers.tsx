import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Customer, Order } from '../types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Phone, 
  MapPin, 
  X, 
  FileText, 
  Copy, 
  CheckCircle2, 
  Clock, 
  ExternalLink
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/conversions';

export const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, orders, products, updateOrderStatus } = useBakery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData(customer);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (window.confirm('¿Seguro que deseas eliminar este cliente? Se mantendrá el historial de pedidos.')) {
      deleteCustomer(id);
    }
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingId) {
      updateCustomer({ ...formData, id: editingId } as Customer);
    } else {
      addCustomer({
        ...formData,
        id: Date.now().toString()
      } as Customer);
    }
    setIsModalOpen(false);
  };

  const getCustomerData = (customerId: string) => {
    const customerOrders = orders.filter(o => o.customerId === customerId);
    const unpaidOrders = customerOrders.filter(o => o.status === 'Entregado');
    const pendingAmount = unpaidOrders.reduce((acc, o) => acc + o.totalPrice, 0);
    const totalSpent = customerOrders
      .filter(o => o.status === 'Entregado' || o.status === 'Pagado')
      .reduce((acc, o) => acc + o.totalPrice, 0);

    return {
      count: customerOrders.length,
      spent: totalSpent,
      pendingAmount,
      unpaidOrders
    };
  };

  const handleOpenStatement = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsStatementOpen(true);
  };

  const copyToClipboard = (customer: Customer, unpaidOrders: Order[]) => {
    const header = `*Resumen de Cuenta - Pastelería PRO*\nHola ${customer.name}, te comparto el detalle de tus pedidos pendientes:\n\n`;
    const body = unpaidOrders.map(o => {
      const itemsStr = o.items.map(i => {
        const p = products.find(prod => prod.id === i.productId);
        return `${i.quantity}x ${p?.name || 'Producto'}`;
      }).join(', ');
      return `📅 ${formatDate(o.deliveryDate)}\n🍰 ${itemsStr}\n💰 *${formatCurrency(o.totalPrice)}*\n-------------------`;
    }).join('\n');
    
    const total = unpaidOrders.reduce((acc, o) => acc + o.totalPrice, 0);
    const footer = `\n*TOTAL PENDIENTE: ${formatCurrency(total)}*`;
    const fullText = header + body + footer;
    
    navigator.clipboard.writeText(fullText);
    alert('¡Resumen copiado! Ya puedes pegarlo en WhatsApp.');
  };

  const handleMarkAsPaid = async (orderId: string) => {
    if (window.confirm('¿Confirmar que este pedido ya fue pagado?')) {
      await updateOrderStatus(orderId, 'Pagado');
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes y Cobranza</h2>
          <p className="text-slate-500 text-sm">Gestiona tu cartera de clientes y saldos pendientes.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-colors text-sm font-medium"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o teléfono..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(customer => {
          const { count, spent, pendingAmount } = getCustomerData(customer.id);
          const hasDebt = pendingAmount > 0;

          return (
            <div key={customer.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${hasDebt ? 'border-l-4 border-l-amber-500 border-y-slate-200 border-r-slate-200' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${hasDebt ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{customer.name}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      <Clock size={10} /> {count} Pedidos totales
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(customer)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => handleDelete(customer.id, e)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600 mb-5 border-b border-slate-50 pb-4">
                {customer.phone && <div className="flex items-center gap-2 font-medium"><Phone size={14} className="text-slate-300"/> {customer.phone}</div>}
                {customer.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-300"/> <span className="truncate">{customer.address}</span></div>}
              </div>

              {hasDebt ? (
                <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase">Por Cobrar</span>
                    <span className="text-sm font-black text-amber-700">{formatCurrency(pendingAmount)}</span>
                  </div>
                  <button onClick={() => handleOpenStatement(customer)} className="w-full mt-2 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-700 transition-colors shadow-sm">
                    <FileText size={14} /> Ver Detalle de Cobro
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Historial Pagado</span>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(spent)}</span>
                </div>
              )}

              <button onClick={() => handleOpenStatement(customer)} className="w-full py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
                Historial de Pedidos <ExternalLink size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {isStatementOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-lg"><FileText size={20} /></div>
                <div>
                  <h3 className="font-bold text-lg leading-none">{selectedCustomer.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Estado de Cuenta</p>
                </div>
              </div>
              <button onClick={() => setIsStatementOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const { pendingAmount, unpaidOrders } = getCustomerData(selectedCustomer.id);
                return (
                  <>
                    {pendingAmount > 0 && (
                      <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex justify-between items-center shadow-inner">
                        <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Total Pendiente</p>
                          <h4 className="text-3xl font-black text-amber-700">{formatCurrency(pendingAmount)}</h4>
                        </div>
                        <button onClick={() => copyToClipboard(selectedCustomer, unpaidOrders)} className="bg-white text-amber-600 p-3 rounded-xl shadow-sm border border-amber-200 flex flex-col items-center gap-1 active:scale-95">
                          <Copy size={20} />
                          <span className="text-[9px] font-bold uppercase">Copiar WhatsApp</span>
                        </button>
                      </div>
                    )}
                    <div className="space-y-4">
                      {unpaidOrders.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 italic bg-slate-50 rounded-xl">Sin deudas pendientes.</div>
                      ) : (
                        unpaidOrders.map(order => (
                          <div key={order.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-slate-700">{formatDate(order.deliveryDate)}</span>
                              <span className="text-sm font-black text-slate-800">{formatCurrency(order.totalPrice)}</span>
                            </div>
                            <button onClick={() => handleMarkAsPaid(order.id)} className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-600 hover:text-white flex items-center justify-center gap-2 transition-colors">
                              <CheckCircle2 size={14} /> Marcar Pagado
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
               <button onClick={() => setIsStatementOpen(false)} className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Completo *</label>
                <input className="w-full p-3 border border-slate-200 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                  <input className="w-full p-3 border border-slate-200 rounded-xl" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                  <input className="w-full p-3 border border-slate-200 rounded-xl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};