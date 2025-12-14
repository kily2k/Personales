// Enums for Units to ensure consistency
export enum UnitType {
  GRAMS = 'g',
  KILOGRAMS = 'kg',
  MILLILITERS = 'ml',
  LITERS = 'L',
  UNITS = 'u'
}

// Entity: Ingrediente (Raw Material)
export interface Ingredient {
  id: string;
  name: string;
  currentStock: number; // Stored in base units (g, ml, u)
  unit: UnitType; // Preferred display unit, though storage is normalized
  costPerUnit: number;
  minStock: number; // Reorder point
}

// Entity: Receta (Recipe Line Item)
export interface RecipeItem {
  ingredientId: string;
  quantity: number; // Amount needed for 1 unit of product
  unit: UnitType;
}

// Entity: Producto (Final Product)
export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  recipe: RecipeItem[];
}

// Entity: Cliente
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

// Entity: Pedido (Order)
export interface OrderItem {
  productId: string;
  quantity: number;
}

export type OrderStatus = 'Pendiente' | 'En Proceso' | 'Completado' | 'Entregado' | 'Pagado';

export interface Order {
  id: string;
  customerId: string; // Link to Customer ID if available
  customerName: string; // Fallback or snapshot name
  deliveryDate: string; // ISO Date string YYYY-MM-DD
  status: OrderStatus;
  items: OrderItem[];
  totalPrice: number;
}

// Helper type for Production Planning
export interface ProductionRequirement {
  ingredientName: string;
  ingredientId: string;
  totalNeeded: number;
  currentStock: number;
  unit: UnitType;
  missing: number; // If totalNeeded > currentStock
}