import React, { useState, useEffect } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Ingredient, UnitType } from '../types';
import { UNIT_OPTIONS, BASE_UNITS } from '../constants';
import { formatStock, toBaseUnit, fromBaseUnit, formatCurrency } from '../utils/conversions';
import { Plus, Search, Edit2, Save, X, RefreshCw, TrendingUp, Trash2 } from 'lucide-react';

// Local interface to handle form inputs allowing empty strings
interface IngredientForm {
  name: string;
  unit: UnitType;
  currentStock: number | '';
  minStock: number | '';
  costPerUnit: number | '';
}

export const Inventory: React.FC = () => {
  const { ingredients, addIngredient, updateIngredientStock, deleteIngredient } = useBakery();
  
  // State for Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for Edit (Adjust) Modal
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [editStockValue, setEditStockValue] = useState<string>('');
  const [newPurchasePrice, setNewPurchasePrice] = useState<string>(''); // For WAC

  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State for New Ingredient - Initialized with empty strings for numbers
  const [newIng, setNewIng] = useState<IngredientForm>({
    name: '',
    unit: UnitType.GRAMS,
    currentStock: '',
    minStock: '',
    costPerUnit: ''
  });

  // Handler: Create New
  const handleAdd = () => {
    if (!newIng.name || newIng.currentStock === '') return;
    
    // Default to 0 if empty string (though validation above checks currentStock)
    // Note: TypeScript narrows currentStock to 'number' due to the check above, so strict comparison with '' is invalid.
    const stockVal = newIng.currentStock;
    const minStockVal = newIng.minStock === '' ? 0 : newIng.minStock;
    const costVal = newIng.costPerUnit === '' ? 0 : newIng.costPerUnit;

    const stockInBase = toBaseUnit(stockVal, newIng.unit);
    const minStockInBase = toBaseUnit(minStockVal, newIng.unit);

    const ingredient: Ingredient = {
      id: Date.now().toString(),
      name: newIng.name,
      unit: newIng.unit,
      currentStock: stockInBase,
      minStock: minStockInBase,
      costPerUnit: costVal
    };

    addIngredient(ingredient);
    setIsModalOpen(false);
    // Reset form
    setNewIng({ name: '', unit: UnitType.GRAMS, currentStock: '', minStock: '', costPerUnit: '' });
  };

  // Handler: Open Edit Modal
  const handleEditClick = (ing: Ingredient) => {
    setEditingItem(ing);
    // Show value in preferred unit
    const val = fromBaseUnit(ing.currentStock, ing.unit);
    setEditStockValue(val.toString());
    setNewPurchasePrice(''); // Reset price
  };

  // Handler: Delete
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro que deseas eliminar "${name}" del inventario? Esto podría afectar las recetas que lo utilizan.`)) {
      deleteIngredient(id);
    }
  };

  // Handler: Save Edit
  const handleSaveEdit = () => {
    if (!editingItem) return;
    const val = parseFloat(editStockValue);
    if (isNaN(val) || val < 0) return;

    // Convert back to base unit for storage
    const newStockBase = toBaseUnit(val, editingItem.unit);
    
    // Check if price is provided for WAC
    const priceVal = newPurchasePrice ? parseFloat(newPurchasePrice) : undefined;

    updateIngredientStock(editingItem.id, newStockBase, priceVal);
    
    setEditingItem(null);
    setEditStockValue('');
    setNewPurchasePrice('');
  };

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Calculate if we are adding stock (to show price input)
  const isAddingStock = editingItem && !isNaN(parseFloat(editStockValue)) 
    ? toBaseUnit(parseFloat(editStockValue), editingItem.unit) > editingItem.currentStock 
    : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
        {/* Desktop Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="hidden md:flex bg-indigo-600 text-white px-4 py-2 rounded-lg items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Nuevo Ingrediente
        </button>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-20 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg z-40 hover:bg-indigo-700 transition-colors"
        aria-label="Nuevo Ingrediente"
      >
        <Plus size={24} />
      </button>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar materia prima..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Ingrediente</th>
                <th className="px-6 py-4">Stock Actual</th>
                <th className="px-6 py-4">Costo Prom. Unit</th>
                <th className="px-6 py-4">Unidad Base</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(ing => {
                const isLow = ing.currentStock <= ing.minStock;
                return (
                  <tr key={ing.id} className={`hover:bg-slate-50 ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">{ing.name}</td>
                    <td className={`px-6 py-4 font-bold ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                      {formatStock(ing.currentStock, ing.unit)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatCurrency(ing.costPerUnit)} / {ing.unit}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {BASE_UNITS[ing.unit]}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(ing)}
                          className="text-indigo-600 hover:text-indigo-800 p-2 rounded hover:bg-indigo-50 transition-colors"
                          title="Ajustar Stock"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(ing.id, ing.name)}
                          className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                          title="Eliminar Ingrediente"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <h3 className="font-bold">Nuevo Ingrediente</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input 
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={newIng.name}
                  onChange={e => setNewIng({...newIng, name: e.target.value})}
                  placeholder="Ej: Harina 0000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unidad de Medida</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    value={newIng.unit}
                    onChange={e => setNewIng({...newIng, unit: e.target.value as UnitType})}
                  >
                    {UNIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario ($)</label>
                   <input 
                    type="number"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    value={newIng.costPerUnit}
                    onChange={e => setNewIng({...newIng, costPerUnit: e.target.value === '' ? '' : Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Inicial</label>
                  <input 
                    type="number"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    value={newIng.currentStock}
                    onChange={e => setNewIng({...newIng, currentStock: e.target.value === '' ? '' : Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Punto Reposición</label>
                  <input 
                    type="number"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    value={newIng.minStock}
                    onChange={e => setNewIng({...newIng, minStock: e.target.value === '' ? '' : Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="pt-2 text-xs text-slate-500">
                * Las cantidades ingresadas se guardarán en la unidad seleccionada y se convertirán internamente si es necesario.
              </div>
              <button 
                onClick={handleAdd}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 mt-2"
              >
                Guardar Ingrediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
              <h3 className="font-bold flex items-center gap-2">
                <RefreshCw size={18} /> Ajustar Stock
              </h3>
              <button onClick={() => setEditingItem(null)}><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-center mb-2">
                <h4 className="text-lg font-semibold text-slate-800">{editingItem.name}</h4>
                <p className="text-sm text-slate-500">Actualiza la cantidad física disponible</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nuevo Stock Total ({editingItem.unit})
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    step="any"
                    className="w-full p-3 border border-slate-300 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editStockValue}
                    onChange={e => setEditStockValue(e.target.value)}
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    {editingItem.unit}
                  </span>
                </div>
              </div>

              {/* Purchase Price Input (Conditional) */}
              {isAddingStock && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-2 mb-2">
                     <TrendingUp className="text-green-600 mt-0.5" size={16} />
                     <label className="block text-sm font-medium text-green-800 leading-tight">
                       Detectamos una entrada de stock.<br/>
                       <span className="text-xs font-normal opacity-80">¿A qué precio compraste las nuevas unidades?</span>
                     </label>
                  </div>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                     <input 
                      type="number"
                      step="1"
                      placeholder={`Costo por ${editingItem.unit}`}
                      className="w-full pl-7 pr-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
                      value={newPurchasePrice}
                      onChange={e => setNewPurchasePrice(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-green-700 mt-1">
                    Esto actualizará el costo promedio ponderado.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};