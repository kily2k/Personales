import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Product, Customer, Order, OrderItem } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Calendar, CheckCircle2, AlertCircle, ChevronRight, Package } from 'lucide-react';
import { formatCurrency } from '../utils/conversions';

export const Ventas: React.FC = () => {
  const { products, customers, families, addOrder, addCustomer } = useBakery();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form State
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});

  const customerSuggestionsRef = useRef<HTMLDivElement>(null);

  // --- Logic ---
  const filteredProducts = useMemo(() => {
    const filtered = products
      .filter(p => !p.isIntermediate)
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a, b) => a.name.localeCompare(b.name));

    // Group by family
    const grouped: { [key: string]: Product[] } = {};
    
    filtered.forEach(p => {
      const familyName = families.find(f => f.id === p.familyId)?.name || 'Otros';
      if (!grouped[familyName]) grouped[familyName] = [];
      grouped[familyName].push(p);
    });

    return grouped;
  }, [products, searchTerm, families]);

  const familyOrder = useMemo(() => {
    const names = Object.keys(filteredProducts).sort();
    // Move 'Otros' to the end if it exists
    const index = names.indexOf('Otros');
    if (index > -1) {
      names.splice(index, 1);
      names.push('Otros');
    }
    return names;
  }, [filteredProducts]);

  const customerSuggestions = useMemo(() => {
    if (!customerSearchInput) return [];
    return customers
      .filter(c => c.name.toLowerCase().includes(customerSearchInput.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [customers, customerSearchInput]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cart]);

  // --- Handlers ---
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const toggleFamily = (familyName: string) => {
    setExpandedFamilies(prev => ({
      ...prev,
      [familyName]: !prev[familyName]
    }));
  };

  const handleSelectCustomer = (c: Customer) => {
    setCustomerSearchInput(c.name);
    setSelectedCustomerId(c.id);
    setShowCustomerSuggestions(false);
  };

  const handleConfirmSale = async () => {
    setError('');
    if (cart.length === 0) {
      setError('El carrito está vacío.');
      return;
    }
    if (!customerSearchInput.trim()) {
      setError('Por favor selecciona o ingresa un cliente.');
      return;
    }

    try {
      let finalCustomerId = selectedCustomerId;
      let finalCustomerName = customerSearchInput.trim();

      // Create customer if it doesn't exist
      if (!finalCustomerId) {
        const existing = customers.find(c => c.name.toLowerCase() === finalCustomerName.toLowerCase());
        if (existing) {
          finalCustomerId = existing.id;
        } else {
          finalCustomerId = await addCustomer({ id: '', name: finalCustomerName });
        }
      }

      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price
      }));

      const newOrder: Order = {
        id: Date.now().toString(),
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        deliveryDate: deliveryDate,
        status: 'Pendiente',
        items: orderItems,
        totalPrice: cartTotal
      };

      await addOrder(newOrder);
      
      // Reset
      setCart([]);
      setCustomerSearchInput('');
      setSelectedCustomerId(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Error al procesar la venta.');
    }
  };

  // Click outside listener for customer suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSuggestionsRef.current && !customerSuggestionsRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Column: Product Catalog */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="text-indigo-600" /> Catálogo
            </h2>
            <p className="text-slate-500 text-sm">Selecciona los productos para el nuevo pedido.</p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Product Grid Grouped by Family */}
        <div className="space-y-4">
          {familyOrder.map(familyName => {
            const isExpanded = expandedFamilies[familyName] || searchTerm.length > 0;
            return (
              <div key={familyName} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleFamily(familyName)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{familyName}</h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {filteredProducts[familyName].length}
                    </span>
                  </div>
                  <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight size={20} />
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                      {filteredProducts[familyName].map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all text-left flex flex-col h-full group"
                        >
                          <div className="w-full aspect-square bg-white rounded-xl mb-3 flex items-center justify-center text-slate-200 group-hover:text-indigo-100 transition-colors">
                            <Package size={40} />
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2 flex-1">{product.name}</h3>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="font-bold text-indigo-600 text-sm">{formatCurrency(product.price)}</span>
                            <div className="bg-white text-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-100">
                              <Plus size={14} />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {familyOrder.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Package size={48} className="mx-auto mb-3 opacity-20" />
              <p>No se encontraron productos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Shopping Cart */}
      <div className="w-full lg:w-96 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-6 flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart size={18} className="text-indigo-600" /> Carrito
              {cart.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </h3>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Vaciar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-10" />
                <p className="text-sm">Tu carrito está vacío</p>
                <p className="text-[10px] mt-1">Agrega productos del catálogo</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{item.product.name}</h4>
                    <p className="text-xs text-slate-500">{formatCurrency(item.product.price)} c/u</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1 hover:bg-slate-50 text-slate-500"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-1 hover:bg-slate-50 text-slate-500"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Section */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl space-y-4">
            {/* Customer Selection */}
            <div className="relative" ref={customerSuggestionsRef}>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Cliente</label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                <User size={16} className="text-slate-400 mr-2" />
                <input 
                  type="text"
                  placeholder="Nombre del cliente..."
                  value={customerSearchInput}
                  onChange={(e) => {
                    setCustomerSearchInput(e.target.value);
                    setSelectedCustomerId(null);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  className="w-full text-sm outline-none bg-transparent"
                />
                {selectedCustomerId && <CheckCircle2 size={16} className="text-emerald-500 ml-2" />}
              </div>

              {showCustomerSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute bottom-full mb-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                  {customerSuggestions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-none"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Fecha de Entrega</label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2">
                <Calendar size={16} className="text-slate-400 mr-2" />
                <input 
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full text-sm outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Total & Confirm */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-500 font-medium">Total a pagar:</span>
                <span className="text-2xl font-bold text-indigo-600">{formatCurrency(cartTotal)}</span>
              </div>

              {error && (
                <div className="mb-4 p-2 bg-red-50 text-red-600 text-[10px] rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-2 bg-emerald-50 text-emerald-600 text-[10px] rounded-lg flex items-center gap-2 border border-emerald-100">
                  <CheckCircle2 size={14} /> Venta registrada con éxito
                </div>
              )}

              <button
                onClick={handleConfirmSale}
                disabled={cart.length === 0 || !customerSearchInput.trim()}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                Confirmar Venta <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
