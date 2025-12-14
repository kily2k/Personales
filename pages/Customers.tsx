import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Customer } from '../types';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, X } from 'lucide-react';
import { formatCurrency } from '../utils/conversions';

export const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, orders } = useBakery();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    // Prevent any potential parent click handlers from firing
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

  const getCustomerStats = (customerId: string) => {
    const customerOrders = orders.filter(o => o.customerId === customerId);
    const totalSpent = customerOrders.filter(o => o.status === 'Entregado').reduce((acc, o) => acc + o.totalPrice, 0);
    return {
      count: customerOrders.length,
      spent: totalSpent
    };
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        {/* Desktop Button */}
        <button 
          onClick={handleAdd}
          className="hidden md:flex bg-indigo-600 text-white px-4 py-2 rounded-lg items-center gap-2 hover:bg-indigo-700 shadow-sm"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={handleAdd}
        className="md:hidden fixed bottom-20 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg z-40 hover:bg-indigo-700 transition-colors"
        aria-label="Nuevo Cliente"
      >
        <Plus size={24} />
      </button>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o teléfono..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(customer => {
          const stats = getCustomerStats(customer.id);
          return (
            <div key={customer.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{customer.name}</h3>
                    <span className="text-xs text-slate-500">{stats.count} pedidos realizados</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEdit(customer)} 
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(customer.id, e)} 
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                {customer.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {customer.phone}</div>}
                {customer.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {customer.email}</div>}
                {customer.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {customer.address}</div>}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-xs text-slate-500">Inversión Total</span>
                 <span className="font-bold text-emerald-600">{formatCurrency(stats.spent)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white rounded-t-xl">
              <h3 className="font-bold">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre Completo *</label>
                <input className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                  <input className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Dirección</label>
                <input className="w-full p-2 border rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Notas Adicionales</label>
                <textarea className="w-full p-2 border rounded" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">Guardar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};