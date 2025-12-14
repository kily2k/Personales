import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Ingredient, Product, Order, OrderStatus, UnitType, Customer } from '../types';
import { toBaseUnit, fromBaseUnit } from '../utils/conversions';
import { db } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  writeBatch,
  getDocs
} from 'firebase/firestore';

// Initial Mock Data (Used for seeding DB if empty)
const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'Margarina', currentStock: 10000, unit: UnitType.KILOGRAMS, costPerUnit: 2490, minStock: 2000 },
  { id: '2', name: 'Harina', currentStock: 32000, unit: UnitType.KILOGRAMS, costPerUnit: 700, minStock: 5000 },
  { id: '3', name: 'Mantequilla', currentStock: 23000, unit: UnitType.KILOGRAMS, costPerUnit: 7600, minStock: 2000 },
  { id: '4', name: 'Azúcar blanca', currentStock: 18000, unit: UnitType.KILOGRAMS, costPerUnit: 860, minStock: 3000 },
  { id: '5', name: 'Huevos', currentStock: 59, unit: UnitType.UNITS, costPerUnit: 216, minStock: 12 },
  { id: '6', name: 'Manjar', currentStock: 20000, unit: UnitType.KILOGRAMS, costPerUnit: 2050, minStock: 3000 },
  { id: '7', name: 'Crema chantilly', currentStock: 6000, unit: UnitType.LITERS, costPerUnit: 3690, minStock: 1000 },
];

const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'p1', 
    name: 'Torta de Chocolate', 
    price: 35000, 
    description: 'Bizcocho húmedo con ganache.',
    recipe: [
      { ingredientId: '2', quantity: 500, unit: UnitType.GRAMS },
      { ingredientId: '4', quantity: 400, unit: UnitType.GRAMS },
      { ingredientId: '5', quantity: 4, unit: UnitType.UNITS },
      { ingredientId: '6', quantity: 200, unit: UnitType.GRAMS },
    ]
  },
  { 
    id: 'p2', 
    name: 'Docena de Medialunas', 
    price: 12000, 
    description: 'Clásicas de manteca.',
    recipe: [
      { ingredientId: '2', quantity: 600, unit: UnitType.GRAMS },
      { ingredientId: '4', quantity: 200, unit: UnitType.GRAMS },
      { ingredientId: '5', quantity: 2, unit: UnitType.UNITS },
      { ingredientId: '3', quantity: 250, unit: UnitType.GRAMS },
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
  loading: boolean;
  
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

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync with Firestore
  useEffect(() => {
    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snap) => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Ingredient));
      setIngredients(data);
      // Seed if empty on first load
      if (data.length === 0 && !localStorage.getItem('db_seeded')) {
        seedDatabase();
      }
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer)));
    });

    setLoading(false);

    return () => {
      unsubIngredients();
      unsubProducts();
      unsubOrders();
      unsubCustomers();
    };
  }, []);

  const seedDatabase = async () => {
    try {
      localStorage.setItem('db_seeded', 'true'); // Prevent loop
      const batch = writeBatch(db);

      // We need to maintain ID relationships for recipes.
      // Firestore creates random IDs on add(), so we use set() with specific IDs for seeding to keep relationships intact.
      
      INITIAL_INGREDIENTS.forEach(ing => {
        const ref = doc(db, 'ingredients', ing.id);
        batch.set(ref, ing);
      });
      
      INITIAL_PRODUCTS.forEach(prod => {
        const ref = doc(db, 'products', prod.id);
        batch.set(ref, prod);
      });

      INITIAL_CUSTOMERS.forEach(cust => {
        const ref = doc(db, 'customers', cust.id);
        batch.set(ref, cust);
      });

      INITIAL_ORDERS.forEach(ord => {
        const ref = doc(db, 'orders', ord.id);
        batch.set(ref, ord);
      });

      await batch.commit();
      console.log('Database seeded with initial data');
    } catch (e) {
      console.error('Error seeding database:', e);
    }
  };

  /* --- INGREDIENTS --- */
  const addIngredient = async (ing: Ingredient) => {
    const { id, ...rest } = ing; // Let Firestore handle ID or use addDoc
    await addDoc(collection(db, 'ingredients'), rest);
  };
  
  const updateIngredientStock = async (id: string, newAmount: number, newUnitCost?: number) => {
    const ing = ingredients.find(i => i.id === id);
    if (!ing) return;

    let updates: Partial<Ingredient> = { currentStock: newAmount };

    // Weighted Average Cost Logic
    if (newAmount > ing.currentStock && newUnitCost !== undefined && newUnitCost > 0) {
      const addedAmountBase = newAmount - ing.currentStock;
      const currentStockDisplay = fromBaseUnit(ing.currentStock, ing.unit);
      const addedAmountDisplay = fromBaseUnit(addedAmountBase, ing.unit);
      const newTotalDisplay = fromBaseUnit(newAmount, ing.unit);

      const oldValue = currentStockDisplay * ing.costPerUnit;
      const newValue = addedAmountDisplay * newUnitCost;
      
      const newAverageCost = newTotalDisplay > 0 ? (oldValue + newValue) / newTotalDisplay : ing.costPerUnit;
      updates.costPerUnit = Math.round(newAverageCost);
    }

    const ref = doc(db, 'ingredients', id);
    await updateDoc(ref, updates);
  };

  const deleteIngredient = async (id: string) => {
    await deleteDoc(doc(db, 'ingredients', id));
  };

  /* --- PRODUCTS --- */
  const addProduct = async (prod: Product) => {
    const { id, ...rest } = prod;
    await addDoc(collection(db, 'products'), rest);
  };
  
  const updateProduct = async (updated: Product) => {
    const { id, ...rest } = updated;
    await updateDoc(doc(db, 'products', id), rest);
  };
  
  const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, 'products', id));
  };
  
  /* --- CUSTOMERS --- */
  const addCustomer = async (customer: Customer) => {
    const { id, ...rest } = customer;
    await addDoc(collection(db, 'customers'), rest);
  };
  
  const updateCustomer = async (updated: Customer) => {
    const { id, ...rest } = updated;
    await updateDoc(doc(db, 'customers', id), rest);
  };
  
  const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(db, 'customers', id));
  };

  /* --- ORDERS --- */
  const addOrder = async (order: Order) => {
    const { id, ...rest } = order;
    await addDoc(collection(db, 'orders'), rest);
  };
  
  const deleteOrder = async (id: string) => {
    await deleteDoc(doc(db, 'orders', id));
  };

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;

    // Deduct stock only when moving TO Completed from a non-completed state
    if (newStatus === 'Completado' && oldStatus !== 'Completado') {
      await deductStockForOrder(order);
    }

    await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
  }, [orders, products, ingredients]); 

  const deductStockForOrder = async (order: Order) => {
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

    const batch = writeBatch(db);
    
    usageMap.forEach((amountToDeduct, ingId) => {
      const ing = ingredients.find(i => i.id === ingId);
      if (ing) {
        const newStock = Math.max(0, ing.currentStock - amountToDeduct);
        const ref = doc(db, 'ingredients', ingId);
        batch.update(ref, { currentStock: newStock });
      }
    });

    await batch.commit();
  };

  /* --- DATABASE RESTORE --- */
  const restoreDatabase = async (data: any) => {
    const batch = writeBatch(db);
    
    // Helper to batch adds. 
    // Note: This replaces data by adding new docs. 
    // Ideally, one would clear the collection first, but that requires listing all docs.
    // For simplicity in this context, we will add/merge.
    
    if (data.ingredients) {
      data.ingredients.forEach((item: any) => {
         // Create a new ref to avoid ID collision or use existing ID if provided
         const ref = item.id ? doc(db, 'ingredients', item.id) : doc(collection(db, 'ingredients'));
         batch.set(ref, item);
      });
    }
    if (data.products) {
      data.products.forEach((item: any) => {
         const ref = item.id ? doc(db, 'products', item.id) : doc(collection(db, 'products'));
         batch.set(ref, item);
      });
    }
    if (data.orders) {
      data.orders.forEach((item: any) => {
         const ref = item.id ? doc(db, 'orders', item.id) : doc(collection(db, 'orders'));
         batch.set(ref, item);
      });
    }
    if (data.customers) {
      data.customers.forEach((item: any) => {
         const ref = item.id ? doc(db, 'customers', item.id) : doc(collection(db, 'customers'));
         batch.set(ref, item);
      });
    }

    await batch.commit();
  };

  return (
    <BakeryContext.Provider value={{
      ingredients,
      products,
      orders,
      customers,
      loading,
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