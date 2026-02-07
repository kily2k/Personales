import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Plus, Search, Clock, CheckCircle, Truck, Flame } from 'lucide-react';
import { formatCurrency } from '../utils/conversions';

const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-001', 
    customerId: 'CUST-001',
    customerName: 'María García', 
    items: [{ productId: 'Tarta de Chocolate', quantity: 1 }, { productId: 'Cupcakes Vainilla', quantity: 12 }], 
    totalPrice: 45.50, 
    status: 'En Proceso', 
    deliveryDate: '2023-10-24 10:30' 
  },
  { 
    id: 'ORD-002', 
    customerId: 'CUST-002',
    customerName: 'Restaurante El Sol', 
    items: [{ productId: 'Croissants', quantity: 20 }, { productId: 'Barras Pan Artesanal', quantity: 5 }], 
    totalPrice: 32.00, 
    status: 'Completado', 
    deliveryDate: '2023-10-24 09:15' 
  },
  { 
    id: 'ORD-003', 
    customerId: 'CUST-003',
    customerName: 'Juan Pérez', 
    items: [{ productId: 'Pastel de Bodas (3 Pisos)', quantity: 1 }], 
    totalPrice: 250.00, 
    status: 'Pendiente', 
    deliveryDate: '2023-10-25 14:00' 
  },
  { 
    id: 'ORD-004', 
    customerId: 'CUST-004',
    customerName: 'Café Central', 
    items: [{ productId: 'Galletas Avena', quantity: 30 }, { productId: 'Brownies', quantity: 10 }], 
    totalPrice: 55.00, 
    status: 'Entregado', 
    deliveryDate: '2023-10-23 16:45' 
  },
];

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [filter, setFilter] = useState('Todas');

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'En Proceso': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Completado': return 'bg-green-100 text-green-800 border-green-200';
      case 'Entregado': 
      case 'Pagado':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': return <Clock size={14} />;
      case 'En Proceso': return <Flame size={14} />;
      case 'Completado': return <CheckCircle size={14} />;
      case 'Entregado': 
      case 'Pagado':
        return <Truck size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const handleStatusChange = (id: string) => {
    setOrders(orders.map(o => {
      if (o.id === id) {
        // Simple cycle for demo
        const nextStatus: OrderStatus = 
          o.status === 'Pendiente' ? 'En Proceso' :
          o.status === 'En Proceso' ? 'Completado' :
          o.status === 'Completado' ? 'Entregado' : 'Entregado';
        return { ...o, status: nextStatus };
      }
      return o;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pedidos</h2>
          <p className="text-slate-500">Gestiona el flujo de trabajo de la pastelería.</p>
        </div>
        <button className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg shadow-md transition-all">
          <Plus size={18} />
          Nuevo Pedido
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-64">
            <Search size={18} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Buscar pedido o cliente..." 
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
          <div className="flex gap-2">
            {['Todas', 'Pendiente', 'En Proceso', 'Completado'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filter === f ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">ID Pedido</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Detalles</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{order.id}</td>
                  <td className="px-6 py-4">{order.customerName}</td>
                  <td className="px-6 py-4">
                    <ul className="list-disc list-inside text-xs text-slate-500">
                      {order.items.map((item, idx) => (
                        <li key={idx}>{item.quantity}x {item.productId}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(order.totalPrice)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {order.status !== 'Entregado' && order.status !== 'Pagado' && (
                      <button 
                        onClick={() => handleStatusChange(order.id)}
                        className="text-rose-600 hover:text-rose-800 font-medium text-xs hover:underline"
                      >
                        Avanzar Estado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
