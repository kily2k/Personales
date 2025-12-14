import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Ingredient, Product, Order, OrderStatus, UnitType, Customer } from '../types';
import { toBaseUnit, fromBaseUnit } from '../utils/conversions';

// Initial Mock Data based on User Request
const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'Margarina', currentStock: 10000, unit: UnitType.KILOGRAMS, costPerUnit: 2490, minStock: 2000 }, // 10kg
  { id: '2', name: 'Harina', currentStock: 32000, unit: UnitType.KILOGRAMS, costPerUnit: 700, minStock: 5000 }, // 32kg
  { id: '3', name: 'Mantequilla', currentStock: 23000, unit: UnitType.KILOGRAMS, costPerUnit: 7600, minStock: 2000 }, // 23kg
  { id: '4', name: 'Azúcar blanca', currentStock: 18000, unit: UnitType.KILOGRAMS, costPerUnit: 860, minStock: 3000 }, // 18kg
  { id: '5', name: 'Huevos', currentStock: 59, unit: UnitType.UNITS, costPerUnit: 216, minStock: 12 }, // 59u
  { id: '6', name: 'Manjar', currentStock: 20000, unit: UnitType.KILOGRAMS, costPerUnit: 2050, minStock: 3000 }, // 20kg
  { id: '7', name: 'Crema chantilly', currentStock: 6000, unit: UnitType.LITERS, costPerUnit: 3690, minStock: 1000 }, // 6L
];

const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'p1', 
    name: 'Torta de Chocolate', 
    price: 35000, 
    description: 'Bizcocho húmedo con ganache.',
    recipe: [
      { ingredientId: '2', quantity: 500, unit: UnitType.GRAMS }, // Harina
      { ingredientId: '4', quantity: 400, unit: UnitType.GRAMS }, // Azúcar
      { ingredientId: '5', quantity: 4, unit: UnitType.UNITS },   // Huevos
      { ingredientId: '6', quantity: 200, unit: UnitType.GRAMS }, // Manjar (usado como ejemplo)
    ]
  },
  { 
    id: 'p2', 
    name: 'Docena de Medialunas', 
    price: 12000, 
    description: 'Clásicas de manteca.',
    recipe: [
      { ingredientId: '2', quantity: 600, unit: UnitType.GRAMS }, // Harina
      { ingredientId: '4', quantity: 200, unit: UnitType.GRAMS }, // Azúcar
      { ingredientId: '5', quantity: 2, unit: UnitType.UNITS },   // Huevos
      { ingredientId: '3', quantity: 250, unit: UnitType.GRAMS }, // Mantequilla
    ]
  }
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Juan Pérez', phone: '555-0101', email: 'juan@example.com', address: 'Calle Falsa 123' },
  { id: 'c2', name: 'Maria Gomez', phone: '555-0202', address: 'Av. Libertador 400' }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'o1',
    customerId: 'c1',
    customerName: 'Juan Pérez',
    deliveryDate: new Date().toISOString().split('T')[0], // Today
    status: 'Pendiente',
    totalPrice: 47000,
    items: [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 1 }
    ]
  }
];

interface BakeryContextType {
  ingredients: Ingredient[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
  
  addIngredient: (ing: Ingredient) => void;
  updateIngredientStock: (id: string, newAmount: number, newUnitCost?: number) => void;
  deleteIngredient: (id: string) => void;
  
  addProduct: (prod: Product) => void;
  updateProduct: (prod: Product) => void;
  deleteProduct: (id: string) => void;
  
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  deleteOrder: (orderId: string) => void;

  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;

  restoreDatabase: (data: any) => void;
}

const BakeryContext = createContext<BakeryContextType | undefined>(undefined);

// Helper to load from LocalStorage
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.error(`Error loading key ${key}`, e);
    return fallback;
  }
};

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage or Fallback
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => loadFromStorage('bakery_ingredients_v2', INITIAL_INGREDIENTS));
  const [products, setProducts] = useState<Product[]>(() => loadFromStorage('bakery_products_v2', INITIAL_PRODUCTS));
  const [orders, setOrders] = useState<Order[]>(() => loadFromStorage('bakery_orders_v2', INITIAL_ORDERS));
  const [customers, setCustomers] = useState<Customer[]>(() => loadFromStorage('bakery_customers_v2', INITIAL_CUSTOMERS));

  // Persistence Effects
  useEffect(() => { localStorage.setItem('bakery_ingredients_v2', JSON.stringify(ingredients)); }, [ingredients]);
  useEffect(() => { localStorage.setItem('bakery_products_v2', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('bakery_orders_v2', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('bakery_customers_v2', JSON.stringify(customers)); }, [customers]);

  /* --- INGREDIENTS --- */
  const addIngredient = (ing: Ingredient) => setIngredients(prev => [...prev, ing]);
  
  const updateIngredientStock = (id: string, newAmount: number, newUnitCost?: number) => {
    setIngredients(prev => prev.map(ing => {
      if (ing.id !== id) return ing;

      // Weighted Average Cost Logic
      if (newAmount > ing.currentStock && newUnitCost !== undefined && newUnitCost > 0) {
        const addedAmountBase = newAmount - ing.currentStock;
        const currentStockDisplay = fromBaseUnit(ing.currentStock, ing.unit);
        const addedAmountDisplay = fromBaseUnit(addedAmountBase, ing.unit);
        const newTotalDisplay = fromBaseUnit(newAmount, ing.unit);

        const oldValue = currentStockDisplay * ing.costPerUnit;
        const newValue = addedAmountDisplay * newUnitCost;
        
        const newAverageCost = newTotalDisplay > 0 ? (oldValue + newValue) / newTotalDisplay : ing.costPerUnit;
        
        return { 
          ...ing, 
          currentStock: newAmount,
          costPerUnit: Math.round(newAverageCost)
        };
      }
      return { ...ing, currentStock: newAmount };
    }));
  };

  const deleteIngredient = (id: string) => setIngredients(prev => prev.filter(i => i.id !== id));

  /* --- PRODUCTS --- */
  const addProduct = (prod: Product) => setProducts(prev => [...prev, prod]);
  const updateProduct = (updated: Product) => setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  
  /* --- CUSTOMERS --- */
  const addCustomer = (customer: Customer) => setCustomers(prev => [...prev, customer]);
  const updateCustomer = (updated: Customer) => setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
  const deleteCustomer = (id: string) => setCustomers(prev => prev.filter(c => c.id !== id));

  /* --- ORDERS --- */
  const addOrder = (order: Order) => setOrders(prev => [order, ...prev]);
  const deleteOrder = (id: string) => setOrders(prev => prev.filter(o => o.id !== id));

  const updateOrderStatus = useCallback((orderId: string, newStatus: OrderStatus) => {
    setOrders(prevOrders => {
      const orderIndex = prevOrders.findIndex(o => o.id === orderId);
      if (orderIndex === -1) return prevOrders;

      const order = prevOrders[orderIndex];
      const oldStatus = order.status;

      // Deduct stock only when moving TO Completed from a non-completed state
      if (newStatus === 'Completado' && oldStatus !== 'Completado') {
        deductStockForOrder(order);
      }

      const updatedOrders = [...prevOrders];
      updatedOrders[orderIndex] = { ...order, status: newStatus };
      return updatedOrders;
    });
  }, [products]); 

  const deductStockForOrder = (order: Order) => {
    const usageMap = new Map<string, number>(); 

    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;

      product.recipe.forEach(recipeItem => {
        const amountPerProduct = toBaseUnit(recipeItem.quantity, recipeItem.unit);
        const totalAmount = amountPerProduct * item.quantity;
        
        const currentUsage = usageMap.get(recipeItem.ingredientId) || 0;
        usageMap.set(recipeItem.ingredientId, currentUsage + totalAmount);
      });
    });

    setIngredients(prevIngredients => prevIngredients.map(ing => {
      const deduction = usageMap.get(ing.id);
      if (deduction) {
        return { ...ing, currentStock: Math.max(0, ing.currentStock - deduction) };
      }
      return ing;
    }));
  };

  /* --- DATABASE RESTORE --- */
  const restoreDatabase = (data: any) => {
    if (data.ingredients) setIngredients(data.ingredients);
    if (data.products) setProducts(data.products);
    if (data.orders) setOrders(data.orders);
    if (data.customers) setCustomers(data.customers);
  };

  return (
    <BakeryContext.Provider value={{
      ingredients,
      products,
      orders,
      customers,
      addIngredient,
      updateIngredientStock,
      deleteIngredient,
      addProduct,
      updateProduct,
      deleteProduct,
      addOrder,
      updateOrderStatus,
      deleteOrder,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      restoreDatabase
    }}>
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = () => {
  const context = useContext(BakeryContext);
  if (!context) throw new Error("useBakery must be used within BakeryProvider");
  return context;
};