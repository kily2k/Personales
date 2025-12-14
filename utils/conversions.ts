import { UnitType } from '../types';

/**
 * Converts a value TO the base unit for storage/calculation.
 * Base units: Grams, Milliliters, Units.
 */
export const toBaseUnit = (amount: number, unit: UnitType): number => {
  switch (unit) {
    case UnitType.KILOGRAMS: return amount * 1000;
    case UnitType.LITERS: return amount * 1000;
    default: return amount;
  }
};

/**
 * Converts a value FROM the base unit to a display unit.
 */
export const fromBaseUnit = (amount: number, targetUnit: UnitType): number => {
  switch (targetUnit) {
    case UnitType.KILOGRAMS: return amount / 1000;
    case UnitType.LITERS: return amount / 1000;
    default: return amount;
  }
};

/**
 * Smart formatter: e.g. 1500g -> "1.5 kg"
 */
export const formatStock = (amount: number, preferredUnit: UnitType): string => {
  // If the unit is grams but amount >= 1000, show as kg
  if (preferredUnit === UnitType.GRAMS && amount >= 1000) {
    return `${(amount / 1000).toFixed(2)} kg`;
  }
  // If unit is ml but amount >= 1000, show as L
  if (preferredUnit === UnitType.MILLILITERS && amount >= 1000) {
    return `${(amount / 1000).toFixed(2)} L`;
  }

  // Otherwise respect the preferred unit but handle the scaling if needed
  const val = fromBaseUnit(amount, preferredUnit);
  return `${val.toFixed(preferredUnit === UnitType.UNITS ? 0 : 1)} ${preferredUnit}`;
};

/**
 * Formats currency for Chile (CLP): No decimals, uses dots for thousands.
 * e.g. 1500 -> "$1.500"
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};