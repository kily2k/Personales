import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Ingredient, Product, Order, OrderStatus, UnitType, Customer, MonthClosure } from '../types';
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
  query,
  orderBy,
  increment,
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
      { ingredientId: '2', quantity: 500, unit: UnitType.GRAMS, type: 'INGREDIENT' },
      { ingredientId: '4', quantity: 400, unit: UnitType.GRAMS, type: 'INGREDIENT' },
      { ingredientId: '5', quantity: 4, unit: UnitType.UNITS, type: 'INGREDIENT' },
      { ingredientId: '6', quantity: 200, unit: UnitType.GRAMS, type: 'INGREDIENT' },
    ]
  },
  { 
    id: 'p2', 
    name: 'Docena de Medialunas', 
    price: 12000, 
    description: 'Clásicas de manteca.',
    recipe: [
      { ingredientId: '2', quantity: 600, unit: UnitType.GRAMS, type: 'INGREDIENT' },
      { ingredientId: '4', quantity: 200, unit: UnitType.GRAMS, type: 'INGREDIENT' },
      { ingredientId: '5', quantity: 2, unit: UnitType.UNITS, type: 'INGREDIENT' },
      { ingredientId: '3', quantity: 250, unit: UnitType.GRAMS, type: 'INGREDIENT' },
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
  monthClosures: MonthClosure[];
  loading: boolean;
  
  addIngredient: (ing: Ingredient) => void;
  updateIngredientStock: (id: string, newAmount: number, newUnitCost?: number) => void;
  deleteIngredient: (id: string) => void;
  
  addProduct: (prod: Product) => void;
  updateProduct: (prod: Product) => void;
  deleteProduct: (id: string) => void;
  
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void; 
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  deleteOrder: (orderId: string) => void;

  addCustomer: (customer: Customer) => Promise<string>; 
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;

  performMonthClose: () => Promise<void>;
  restoreDatabase: (data: any) => void;
  
  // Maintenance Functions
  clearCollectionData: (collectionName: string) => Promise<void>;
  resetInventoryToZero: () => Promise<void>;
}

const BakeryContext = createContext<BakeryContextType | undefined>(undefined);

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [monthClosures, setMonthClosures] = useState<MonthClosure[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync with Firestore
  useEffect(() => {
    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snap) => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Ingredient));
      setIngredients(data);
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

    const qClosures = query(collection(db, 'month_closures'), orderBy('date', 'desc'));
    const unsubClosures = onSnapshot(qClosures, (snap) => {
      setMonthClosures(snap.docs.map(d => ({ ...d.data(), id: d.id } as MonthClosure)));
    });

    setLoading(false);

    return () => {
      unsubIngredients();
      unsubProducts();
      unsubOrders();
      unsubCustomers();
      unsubClosures();
    };
  }, []);

  const seedDatabase = async () => {
    try {
      localStorage.setItem('db_seeded', 'true'); // Prevent loop
      const batch = writeBatch(db);

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

  /* --- HELPERS --- */
  
  // RECURSIVE FUNCTION to get base ingredients from potentially nested products
  // Returns a Map of IngredientID -> TotalBaseAmount
  const getRecursiveIngredientUsage = (
      itemId: string, 
      type: 'INGREDIENT' | 'PRODUCT' = 'INGREDIENT', 
      qtyNeeded: number, 
      unitNeeded: UnitType,
      usageMap: Map<string, number>
  ) => {
      
      if (type === 'INGREDIENT' || !type) { // Default to Ingredient if undefined
          const baseQty = toBaseUnit(qtyNeeded, unitNeeded);
          usageMap.set(itemId, (usageMap.get(itemId) || 0) + baseQty);
          return;
      }

      // If it's a PRODUCT (Intermediate), we need to look up its recipe
      if (type === 'PRODUCT') {
          const subProduct = products.find(p => p.id === itemId);
          if (!subProduct) return; // Should not happen ideally

          // We need to calculate how many "units" of the subProduct we are making.
          // This is complex because "1 unit" of a subproduct (e.g. 1 Pie Crust) usually 
          // corresponds to the whole recipe.
          // Assumption: When you add a SubProduct to a recipe, the quantity/unit refers to 
          // a fraction of that SubProduct's Batch, OR the SubProduct recipe defines "1 Unit".
          
          // SIMPLIFICATION: We assume the SubProduct recipe produces "1 Unit" (or 1 batch).
          // If the recipe asks for 0.5 Units, we multiply all ingredients by 0.5.
          // If the recipe asks for 500g of "Pastry Cream", we need to know how much the whole recipe weighs.
          // THIS IS HARD without total weight.
          
          // PRACTICAL APPROACH FOR THIS APP:
          // We will assume "Units" for intermediate products.
          // Example: Recipe calls for "1 Unit" of "Pie Crust".
          // If the user uses Grams for a SubProduct (e.g. 500g of Ganache), we would need the yield.
          
          // Let's assume for now 1 Unit of SubProduct = The Entire SubProduct Recipe.
          // If user puts 0.5 Units, it's half recipe.
          // If user puts 500g, and unit is Grams, we just convert.
          
          // Note: Ideally Intermediate Products should define a "Yield". 
          // Here we will treat the quantity literally if Unit is UNITS.
          // If Unit is KG/G, we iterate assuming the subProduct definition is abstract (not supported well without yield).
          // We will stick to the multiplier logic relative to UNITS for now to be safe.
          
          // Logic: Treat 'quantity' as a multiplier of the base recipe.
          // In the UI we should encourage adding intermediate products as "Units" (e.g. 0.5 Receta de Crema).
          
          let multiplier = qtyNeeded;
          
          // If using weight for a product without defined weight, it's tricky. 
          // Let's assume the passed quantity IS the multiplier for simplicity (User enters 0.5 units).
          // If they enter 500g, it might break. We will handle UNIT based logic primarily for SubProducts.
          if (unitNeeded !== UnitType.UNITS) {
             // Fallback: Just treat it as 1-to-1 conversion if possible, or warn.
             // For robust recursion, we really need the user to say "0.5 of this recipe".
             // We will normalize to Units.
             if(unitNeeded === UnitType.GRAMS) multiplier = qtyNeeded / 1000; // Very rough guess: 1kg = 1 recipe? No.
             // Let's just use the quantity as raw multiplier.
             multiplier = qtyNeeded; 
          }

          subProduct.recipe.forEach(subItem => {
              // Recurse
              getRecursiveIngredientUsage(
                  subItem.ingredientId, 
                  subItem.type, 
                  subItem.quantity * multiplier, 
                  subItem.unit, 
                  usageMap
              );
          });
      }
  };

  const getIngredientUsage = (items: Order['items']) => {
     const usage = new Map<string, number>();
     
     items.forEach(orderItem => {
       const prod = products.find(p => p.id === orderItem.productId);
       if(!prod) return;
       
       // Calculate for 1 product * quantity ordered
       prod.recipe.forEach(r => {
          // r.quantity is what is needed for 1 Product.
          // totalNeeded is r.quantity * orderItem.quantity
          getRecursiveIngredientUsage(
              r.ingredientId, 
              r.type, 
              r.quantity * orderItem.quantity, 
              r.unit, 
              usage
          );
       });
     });
     return usage;
  };

  /* --- INGREDIENTS --- */
  const addIngredient = async (ing: Ingredient) => {
    const { id, ...rest } = ing; 
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
  const addCustomer = async (customer: Customer): Promise<string> => {
    const { id, ...rest } = customer;
    const docRef = await addDoc(collection(db, 'customers'), rest);
    return docRef.id;
  };
  
  const updateCustomer = async (updated: Customer) => {
    const { id, ...rest } = updated;
    await updateDoc(doc(db, 'customers', id), rest);
  };
  
  const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(db, 'customers', id));
  };

  /* --- ORDERS & STOCK MANAGEMENT --- */
  
  const addOrder = async (order: Order) => {
    const { id, ...rest } = order;
    const batch = writeBatch(db);

    // 1. Create Order
    // Use passed ID if available (from date stamp in UI)
    const refToUse = doc(db, 'orders', order.id);
    batch.set(refToUse, rest);

    // 2. Deduct Stock IMMEDIATELY (Stock management change)
    const usage = getIngredientUsage(order.items);
    usage.forEach((amount, ingId) => {
       const ingRef = doc(db, 'ingredients', ingId);
       batch.update(ingRef, { currentStock: increment(-amount) });
    });

    await batch.commit();
  };

  const updateOrder = async (updatedOrder: Order) => {
    const oldOrder = orders.find(o => o.id === updatedOrder.id);
    if (!oldOrder) return;

    const batch = writeBatch(db);

    // 1. Update Order Document
    const orderRef = doc(db, 'orders', updatedOrder.id);
    const { id, ...rest } = updatedOrder;
    batch.update(orderRef, rest);

    // 2. Adjust Stock
    // Revert Old
    const oldUsage = getIngredientUsage(oldOrder.items);
    oldUsage.forEach((amount, ingId) => {
        const ingRef = doc(db, 'ingredients', ingId);
        batch.update(ingRef, { currentStock: increment(amount) });
    });

    // Apply New
    const newUsage = getIngredientUsage(updatedOrder.items);
    newUsage.forEach((amount, ingId) => {
        const ingRef = doc(db, 'ingredients', ingId);
        batch.update(ingRef, { currentStock: increment(-amount) });
    });

    await batch.commit();
  };
  
  const deleteOrder = async (id: string) => {
    const orderToDelete = orders.find(o => o.id === id);
    if (!orderToDelete) return;

    const batch = writeBatch(db);
    
    // Delete Order Doc
    batch.delete(doc(db, 'orders', id));

    // Restore stock ALWAYS (Since we deduct on Pendiente now)
    const usage = getIngredientUsage(orderToDelete.items);
    usage.forEach((amount, ingId) => {
        const ingRef = doc(db, 'ingredients', ingId);
        batch.update(ingRef, { currentStock: increment(amount) });
    });

    await batch.commit();
  };

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    // Stock is already handled at creation. Changing status to "Completado" or "Entregado"
    // does NOT deduct stock again.
    // If we added a "Cancelado" status, we would need to restore stock here.
    // For now, only status update.
    await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
  }, []); 

  /* --- MONTH CLOSURE (CIERRE DE CAJA) --- */
  const performMonthClose = async () => {
    const openPaidOrders = orders.filter(o => o.status === 'Pagado' && !o.accountingClosed);
    if (openPaidOrders.length === 0) return;

    const batch = writeBatch(db);
    const totalRevenue = openPaidOrders.reduce((acc, o) => acc + o.totalPrice, 0);
    const totalOrders = openPaidOrders.length;
    const now = new Date();
    
    const closureData: Omit<MonthClosure, 'id'> = {
      date: now.toISOString(),
      periodLabel: `${now.toLocaleString('es-CL', { month: 'long', year: 'numeric' })} - Corte ${now.getDate()}`,
      totalRevenue,
      totalOrders
    };

    const closureRef = doc(collection(db, 'month_closures'));
    batch.set(closureRef, closureData);

    openPaidOrders.forEach(order => {
      const orderRef = doc(db, 'orders', order.id);
      batch.update(orderRef, { accountingClosed: true });
    });

    await batch.commit();
  };


  /* --- DATABASE RESTORE --- */
  const restoreDatabase = async (data: any) => {
    const batch = writeBatch(db);
    
    if (data.ingredients) {
      data.ingredients.forEach((item: any) => {
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

  /* --- MAINTENANCE TOOLS --- */
  const clearCollectionData = async (collectionName: string) => {
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  };

  const resetInventoryToZero = async () => {
    const q = query(collection(db, 'ingredients'));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { currentStock: 0 });
    });

    await batch.commit();
  };

  return (
    <BakeryContext.Provider value={{
      ingredients,
      products,
      orders,
      customers,
      monthClosures,
      loading,
      addIngredient,
      updateIngredientStock,
      deleteIngredient,
      addProduct,
      updateProduct,
      deleteProduct,
      addOrder,
      updateOrder,
      updateOrderStatus,
      deleteOrder,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      performMonthClose,
      restoreDatabase,
      clearCollectionData,
      resetInventoryToZero
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