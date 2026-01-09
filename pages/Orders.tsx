import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Order, OrderStatus, Customer, Product } from '../types';
import { Plus, Search, Calendar, AlertCircle, ArrowRight, CheckCircle2, Clock, PackageCheck, ChefHat, Truck, DollarSign, History, X, Edit2, Trash2, User, RotateCcw, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/conversions';

export const Orders: React.FC = () => {
  const { orders, products, customers, addOrder, updateOrder, updateOrderStatus, addCustomer, deleteOrder } = useBakery();
  
  // State
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('Pendiente');
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New/Edit Order Form State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  // Customer Smart Search State
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null); // If null, means new customer
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  
  // Product Smart Search State
  const [productSearchInput, setProductSearchInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(''); // Stores ID
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  const [date, setDate] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [customPrice, setCustomPrice] = useState<number | ''>(''); // NEW: Custom Price State

  const [cart, setCart] = useState<{productId: string, quantity: number, unitPrice: number}[]>([]);
  const [error, setError] = useState('');
  
  const customerSuggestionsRef = useRef<HTMLDivElement>(null);
  const productSuggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Customer Dropdown
      if (customerSuggestionsRef.current && !customerSuggestionsRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
      // Product Dropdown
      if (productSuggestionsRef.current && !productSuggestionsRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered customers for autocomplete
  const customerSuggestions = useMemo(() => {
    if (!customerSearchInput) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearchInput.toLowerCase())
    ).slice(0, 5); // Limit to 5
  }, [customers, customerSearchInput]);

  // Filtered products for autocomplete (Sorted Alphabetically)
  const productSuggestions = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(productSearchInput.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, productSearchInput]);

  const handleSelectCustomer = (c: Customer) => {
    setCustomerSearchInput(c.name);
    setSelectedCustomerId(c.id);
    setShowCustomerSuggestions(false);
  };

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearchInput(e.target.value);
    setSelectedCustomerId(null); // Reset ID implies potentially new customer
    setShowCustomerSuggestions(true);
  };

  const handleSelectProduct = (p: Product) => {
    setProductSearchInput(p.name);
    setSelectedProduct(p.id);
    setCustomPrice(p.price); // Set default price from catalog
    setShowProductSuggestions(false);
  };

  // --- Constants ---
  const WORKFLOW_STEPS: OrderStatus[] = ['Pendiente', 'En Proceso', 'Completado', 'Entregado'];
  const HISTORY_STEPS: OrderStatus[] = ['Pagado'];
  const FULL_FLOW: OrderStatus[] = ['Pendiente', 'En Proceso', 'Completado', 'Entregado', 'Pagado'];

  // --- Data Logic ---
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach(o => {
      c[o.status] = (c[o.status] || 0) + 1;
    });
    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    // 1. Filter by Mode (Active Workflow vs History)
    if (showHistory) {
      result = result.filter(o => HISTORY_STEPS.includes(o.status));
    } else {
      result = result.filter(o => o.status === activeStatus);
    }

    // 2. Filter by Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.customerName.toLowerCase().includes(lower) || 
        o.id.toLowerCase().includes(lower)
      );
    }

    // 3. Sort by Date
    return result.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  }, [orders, activeStatus, showHistory, searchTerm]);

  // --- Actions ---
  const advanceOrder = (order: Order) => {
    const currentIndex = FULL_FLOW.indexOf(order.status);
    if (currentIndex >= 0 && currentIndex < FULL_FLOW.length - 1) {
      updateOrderStatus(order.id, FULL_FLOW[currentIndex + 1]);
    }
  };

  const revertOrder = (order: Order) => {
    const currentIndex = FULL_FLOW.indexOf(order.status);
    // Safety check: Cannot revert if accounting is closed for this order
    if (order.accountingClosed) {
        alert("No se puede deshacer un pedido que ya forma parte de un Cierre de Mes contable.");
        return;
    }

    if (currentIndex > 0) {
      updateOrderStatus(order.id, FULL_FLOW[currentIndex - 1]);
    }
  };

  const handleDeleteOrder = (order: Order) => {
    if (window.confirm(`¿Estás seguro de eliminar el pedido de ${order.customerName}? Esto devolverá los ingredientes al inventario.`)) {
        deleteOrder(order.id);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    
    // Setup Customer Field
    setCustomerSearchInput(order.customerName);
    setSelectedCustomerId(order.customerId || null); // Keep ID if valid
    
    setDate(order.deliveryDate);
    
    // Setup Cart with stored prices or fallback to catalog price
    const mappedItems = order.items.map(i => {
       const p = products.find(prod => prod.id === i.productId);
       // Use stored unitPrice if available, otherwise catalog price, otherwise 0
       const effectivePrice = i.unitPrice !== undefined ? i.unitPrice : (p?.price || 0);
       
       return {
         productId: i.productId,
         quantity: i.quantity,
         unitPrice: effectivePrice
       };
    });
    setCart(mappedItems);

    setError('');
    setIsModalOpen(true);
  };

  // --- Modal Logic ---
  const addToCart = () => {
    if(!selectedProduct) return;
    const finalQty = qty === '' ? 1 : qty;
    const finalPrice = customPrice === '' ? 0 : customPrice;

    // Check if product already in cart with SAME price
    const existingIndex = cart.findIndex(i => i.productId === selectedProduct && i.unitPrice === finalPrice);
    
    if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += finalQty;
        setCart(newCart);
    } else {
        // If price is different, add as new line item (rare but possible) OR just push new item
        setCart([...cart, { productId: selectedProduct, quantity: finalQty, unitPrice: finalPrice }]);
    }
    
    // Reset Product Selection
    setSelectedProduct('');
    setProductSearchInput('');
    setQty(1);
    setCustomPrice('');
    setError('');
  };
  
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const handleCreateOrUpdateOrder = async () => {
    setError('');
    
    if (!customerSearchInput.trim()) { setError('Ingresa el nombre del cliente.'); return; }
    if(!date) { setError('Selecciona fecha de entrega.'); return; }
    if(cart.length === 0) { setError('Agrega al menos un producto.'); return; }

    let finalCustomerId = selectedCustomerId;
    let finalCustomerName = customerSearchInput.trim();

    // Logic: If no ID is selected, but name exists in text, create new customer
    if (!finalCustomerId) {
        // Double check if name matches an existing one exactly to avoid dupe
        const existingExact = customers.find(c => c.name.toLowerCase() === finalCustomerName.toLowerCase());
        if (existingExact) {
            finalCustomerId = existingExact.id;
        } else {
            // Create completely new customer
            try {
                finalCustomerId = await addCustomer({
                    id: '',
                    name: finalCustomerName
                });
            } catch (e) {
                setError('Error al crear nuevo cliente.');
                return;
            }
        }
    }

    // Calculate total based on custom unit prices
    let total = 0;
    cart.forEach(item => {
      total += item.unitPrice * item.quantity;
    });

    const orderData: Order = {
      id: editingOrderId || Date.now().toString(),
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      deliveryDate: date,
      status: editingOrderId ? (orders.find(o => o.id === editingOrderId)?.status || 'Pendiente') : 'Pendiente',
      items: cart,
      totalPrice: total
    };

    if (editingOrderId) {
        updateOrder(orderData);
    } else {
        addOrder(orderData);
    }
    closeModal();
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setCart([]);
    // Customer Reset
    setCustomerSearchInput('');
    setSelectedCustomerId(null);
    setShowCustomerSuggestions(false);
    // Product Reset
    setProductSearchInput('');
    setSelectedProduct('');
    setShowProductSuggestions(false);
    
    setDate('');
    setError('');
    setQty(1);
    setCustomPrice('');
    setEditingOrderId(null);
  };

  // --- UI Helpers ---
  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': 
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pendiente', next: 'En Proceso' };
      case 'En Proceso': 
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ChefHat, label: 'En Proceso', next: 'Completado' };
      case 'Completado': 
        return { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: PackageCheck, label: 'Completado', next: 'Entregado' };
      case 'Entregado': 
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck, label: 'Entregado', next: 'Pagado' };
      case 'Pagado': 
        return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: DollarSign, label: 'Pagado', next: '' };
      default: 
        return { color: 'bg-slate-100', icon: CheckCircle2, label: status, next: '' };
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <ChefHat className="text-indigo-600" /> Gestión de Pedidos
           </h2>
           <p className="text-slate-500 text-sm">Controla el flujo desde Pendiente hasta Pagado.</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm whitespace-nowrap font-medium text-sm"
           >
             <Plus size={18} /> <span className="hidden sm:inline">Crear Pedido</span>
           </button>
        </div>
      </div>

      {/* 2. Dynamic Status Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-200 pb-1">
        
        {/* Active Workflow Tabs */}
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
          {!showHistory && WORKFLOW_STEPS.map((status) => {
            const config = getStatusConfig(status);
            const isActive = activeStatus === status;
            const count = counts[status] || 0;
            const Icon = config.icon;

            return (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                  isActive 
                    ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-50' 
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {config.label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
          
          {/* History Mode Title Override */}
          {showHistory && (
             <div className="flex items-center gap-2 px-4 py-2 text-slate-800 font-bold">
                <History size={18} /> Historial (Pagados)
             </div>
          )}
        </div>

        {/* Toggle History */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`text-xs font-medium flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
            showHistory ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {showHistory ? <X size={14}/> : <History size={14}/>}
          {showHistory ? 'Volver al Flujo' : 'Ver Cerrados'}
        </button>
      </div>

      {/* 3. Order List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
             <PackageCheck size={48} className="mx-auto mb-3 opacity-20" />
             <p>No hay pedidos en esta sección.</p>
          </div>
        )}

        {filteredOrders.map(order => {
          const config = getStatusConfig(order.status);
          const isUrgent = order.deliveryDate <= new Date().toISOString().split('T')[0] && !showHistory;

          // Check if it's possible to revert (index > 0)
          const flowIndex = FULL_FLOW.indexOf(order.status);
          const canRevert = flowIndex > 0;
          const isClosed = order.accountingClosed;

          return (
            <div key={order.id} className={`bg-white rounded-xl p-5 shadow-sm border transition-all hover:shadow-md ${isUrgent ? 'border-l-4 border-l-red-500 border-y-slate-100 border-r-slate-100' : 'border-slate-200'}`}>
              
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                   <h3 className="font-bold text-slate-800 truncate pr-2">{order.customerName}</h3>
                   <div className={`flex items-center gap-1 text-xs mt-1 ${isUrgent ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                      <Calendar size={12} /> {formatDate(order.deliveryDate)}
                      {isUrgent && <span className="bg-red-100 text-red-600 px-1.5 rounded text-[10px] ml-1">HOY</span>}
                   </div>
                </div>
                
                {/* Edit/Delete Controls */}
                <div className="flex gap-1 ml-2">
                    <button 
                        onClick={() => handleEditOrder(order)} 
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
                        title="Editar Pedido"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => handleDeleteOrder(order)} 
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="Eliminar Pedido"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>

              {/* Status & Price Row */}
              <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${config.color}`}>
                     {order.status}
                  </span>
                  <span className="block font-bold text-slate-700">{formatCurrency(order.totalPrice)}</span>
              </div>

              {/* Items */}
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1 mb-4 border border-slate-100">
                 {order.items.slice(0, 3).map((item, idx) => {
                   const p = products.find(prod => prod.id === item.productId);
                   return (
                     <div key={idx} className="flex justify-between">
                       <span>{item.quantity}x {p?.name}</span>
                     </div>
                   );
                 })}
                 {order.items.length > 3 && (
                   <div className="text-xs text-slate-400 pt-1 text-center">+ {order.items.length - 3} ítems más...</div>
                 )}
              </div>

              {/* Action Footer */}
              {!showHistory ? (
                <div className="flex gap-2">
                   {canRevert && (
                      <button 
                         onClick={() => revertOrder(order)}
                         className="p-2.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                         title="Volver al estado anterior"
                      >
                         <RotateCcw size={16} />
                      </button>
                   )}
                   <button 
                    onClick={() => advanceOrder(order)}
                    className="flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white group"
                   >
                    {/* Dynamic Icon based on next step */}
                    {config.next === 'En Proceso' && <ChefHat size={16} />}
                    {config.next === 'Completado' && <PackageCheck size={16} />}
                    {config.next === 'Entregado' && <Truck size={16} />}
                    {config.next === 'Pagado' && <DollarSign size={16} />}
                    
                    {config.next === 'Pagado' ? 'Confirmar Pago' : `Avanzar a ${config.next}`}
                    
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                   </button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                    <div className="text-xs text-slate-400 italic flex items-center gap-1">
                        {isClosed ? (
                            <><Lock size={12} /> Contabilidad Cerrada</>
                        ) : (
                            <><CheckCircle2 size={12} /> Pago Registrado</>
                        )}
                    </div>
                    
                    {!isClosed && (
                         <button 
                            onClick={() => revertOrder(order)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors"
                            title="Revertir a Entregado (Por Cobrar)"
                         >
                            <RotateCcw size={12} /> Deshacer Pago
                         </button>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New/Edit Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white sticky top-0 z-10">
              <h3 className="font-bold">{editingOrderId ? 'Editar Pedido' : 'Nuevo Pedido'}</h3>
              <button onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
               
               {/* Smart Customer Search */}
               <div className="relative" ref={customerSuggestionsRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                    <div className="pl-3 text-slate-400"><User size={18} /></div>
                    <input 
                      className="w-full p-2.5 text-sm outline-none" 
                      value={customerSearchInput} 
                      onChange={handleCustomerInputChange} 
                      onFocus={() => setShowCustomerSuggestions(true)}
                      placeholder="Buscar o crear nuevo cliente..."
                      autoComplete="off"
                    />
                    {selectedCustomerId && (
                        <div className="pr-3 text-green-500"><CheckCircle2 size={18} /></div>
                    )}
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showCustomerSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full bg-white mt-1 border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div className="text-[10px] uppercase text-slate-400 font-semibold px-3 py-1 bg-slate-50">Sugerencias</div>
                        {customerSuggestions.map(c => (
                            <button
                                key={c.id}
                                onClick={() => handleSelectCustomer(c)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-none"
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                  )}
                  {showCustomerSuggestions && customerSearchInput && customerSuggestions.length === 0 && (
                     <div className="absolute z-20 w-full bg-white mt-1 border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-500">
                        <p>No se encontraron coincidencias. Se creará como <strong>nuevo cliente</strong>.</p>
                     </div>
                  )}
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Entrega</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Formato interno: dd/mm/yyyy (visualización automática por navegador)</p>
               </div>

               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <h4 className="font-bold text-slate-700 text-xs mb-3 uppercase flex items-center gap-2">
                    <PackageCheck size={14}/> Productos y Precios
                 </h4>
                 <div className="flex flex-col gap-2 mb-3">
                    <div className="flex flex-col sm:flex-row gap-2" ref={productSuggestionsRef}>
                        
                        {/* Product Search Input (Autocomplete) */}
                        <div className="relative flex-1">
                          <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                            <Search size={16} className="ml-2 text-slate-400" />
                            <input 
                                className="w-full p-2 text-sm outline-none"
                                placeholder="Buscar producto..."
                                value={productSearchInput}
                                onChange={e => {
                                    setProductSearchInput(e.target.value);
                                    setSelectedProduct(''); // Clear selection on type
                                    setCustomPrice('');
                                    setShowProductSuggestions(true);
                                }}
                                onFocus={() => setShowProductSuggestions(true)}
                            />
                          </div>

                          {/* Product Suggestions Dropdown */}
                          {showProductSuggestions && (
                            <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto left-0">
                                {productSuggestions.length > 0 ? (
                                    productSuggestions.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelectProduct(p)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-none flex justify-between items-center"
                                        >
                                            <span>{p.name}</span>
                                            <span className="text-xs text-slate-500 font-medium">{formatCurrency(p.price)}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-slate-400 text-center">No encontrado</div>
                                )}
                            </div>
                          )}
                        </div>

                        {/* Quantity and Price Inputs */}
                        <div className="flex gap-2">
                           <div className="w-20">
                             <input 
                               type="number" 
                               min="1" 
                               placeholder="Cant."
                               className="w-full p-2 border border-slate-300 rounded text-sm text-center outline-none focus:border-indigo-500" 
                               value={qty} 
                               onChange={e => setQty(Number(e.target.value))} 
                             />
                           </div>
                           <div className="w-28 relative">
                             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                             <input 
                               type="number" 
                               min="0"
                               placeholder="Precio"
                               className="w-full pl-5 pr-2 p-2 border border-slate-300 rounded text-sm text-right outline-none focus:border-indigo-500" 
                               value={customPrice} 
                               onChange={e => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))} 
                             />
                           </div>
                        </div>
                    </div>
                    <button 
                      onClick={addToCart} 
                      className={`w-full text-white p-2 rounded flex items-center justify-center gap-1 text-sm font-medium transition-colors ${selectedProduct ? 'bg-slate-800 hover:bg-slate-900' : 'bg-slate-300 cursor-not-allowed'}`}
                      disabled={!selectedProduct}
                    >
                        <Plus size={16} /> Agregar al Pedido
                    </button>
                 </div>
                 
                 <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cart.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-200 shadow-sm">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">{item.quantity}x {products.find(p => p.id === item.productId)?.name}</span>
                              <span className="text-xs text-slate-500">{formatCurrency(item.unitPrice)} c/u</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800">{formatCurrency(item.quantity * item.unitPrice)}</span>
                              <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><X size={16}/></button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Lista vacía</p>}
                 </div>
               </div>

               {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-red-100"><AlertCircle size={16}/>{error}</div>}

               {/* Total Display */}
               <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-600">Total Estimado:</span>
                  <span className="text-xl font-bold text-indigo-700">
                    {formatCurrency(cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0))}
                  </span>
               </div>

               <button onClick={handleCreateOrUpdateOrder} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                   {editingOrderId ? 'Guardar Cambios' : 'Confirmar Pedido'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};