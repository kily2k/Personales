import { UnitType } from './types';

// Normalized Base Units:
// g -> g
// kg -> 1000g
// ml -> ml
// L -> 1000ml
// u -> u

export const BASE_UNITS = {
  [UnitType.GRAMS]: 'g',
  [UnitType.KILOGRAMS]: 'g',
  [UnitType.MILLILITERS]: 'ml',
  [UnitType.LITERS]: 'ml',
  [UnitType.UNITS]: 'u',
};

export const UNIT_OPTIONS = [
  { value: UnitType.GRAMS, label: 'Gramos (g)' },
  { value: UnitType.KILOGRAMS, label: 'Kilogramos (kg)' },
  { value: UnitType.MILLILITERS, label: 'Mililitros (ml)' },
  { value: UnitType.LITERS, label: 'Litros (L)' },
  { value: UnitType.UNITS, label: 'Unidades (u)' },
];

export const STATUS_COLORS = {
  'Pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'En Proceso': 'bg-blue-100 text-blue-800 border-blue-200',
  'Completado': 'bg-indigo-100 text-indigo-800 border-indigo-200', // Ready/Stock Deducted
  'Entregado': 'bg-slate-100 text-slate-700 border-slate-300', // Delivered (Receivable)
  'Pagado': 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold', // Paid (Cash in hand)
};