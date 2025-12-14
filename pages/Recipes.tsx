import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Product, RecipeItem, UnitType, Ingredient } from '../types';
import { UNIT_OPTIONS } from '../constants';
import { Plus, Trash2, ChevronDown, ChevronUp, Calculator, DollarSign, ArrowRight, Edit2, Save, X } from 'lucide-react';
import { formatStock, fromBaseUnit, formatCurrency } from '../utils/conversions';

export const Recipes: React.FC = () => {
  const { products, ingredients, addProduct, updateProduct, deleteProduct } = useBakery();
  const [isCreating, setIsCreating] = useState(false);
  
  // State to track if we are editing an existing product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form State
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState<number | ''>('');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  
  // Costing Calculator State
  const [fixedCosts, setFixedCosts] = useState<number | ''>('');
  const [estimatedUnits, setEstimatedUnits] = useState<number | ''>('');
  
  // Temp state for adding ingredient to recipe
  const [selectedIngId, setSelectedIngId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>(UnitType.GRAMS);

  const handleAddIngredient = () => {
    if(!selectedIngId || !amount || Number(amount) <= 0) return;
    
    setRecipeItems([...recipeItems, {
      ingredientId: selectedIngId,
      quantity: Number(amount),
      unit: selectedUnit
    }]);
    
    setAmount('');
    setSelectedIngId('');
  };

  const handleUpdateItemQuantity = (index: number, newQty: string) => {
    const val = newQty === '' ? 0 : parseFloat(newQty);
    const updatedItems = [...recipeItems];
    updatedItems[index].quantity = val;
    setRecipeItems(updatedItems);
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = recipeItems.filter((_, i) => i !== index);
    setRecipeItems(updatedItems);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price);
    // Clone array to allow editing without mutating original until save
    setRecipeItems(product.recipe.map(item => ({...item}))); 
    
    // Reset calculator fields as they are transient
    setFixedCosts('');
    setEstimatedUnits('');
    
    setIsCreating(true);
  };

  const handleSaveProduct = () => {
    if(!productName || recipeItems.length === 0 || !productPrice) return;
    
    // Filter out items with 0 quantity just in case
    const validItems = recipeItems.filter(item => item.quantity > 0);

    if (editingProduct) {
        // Update Existing
        const updatedProd: Product = {
            ...editingProduct,
            name: productName,
            price: Number(productPrice),
            recipe: validItems
        };
        updateProduct(updatedProd);
    } else {
        // Create New
        const newProd: Product = {
            id: Date.now().toString(),
            name: productName,
            price: Number(productPrice),
            recipe: validItems
        };
        addProduct(newProd);
    }
    
    closeForm();
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingProduct(null);
    resetForm();
  };

  const resetForm = () => {
    setProductName('');
    setProductPrice('');
    setRecipeItems([]);
    setFixedCosts('');
    setEstimatedUnits('');
    setEditingProduct(null);
  };

  // Cost Estimation
  const calculateVariableCost = (items: RecipeItem[]) => {
    return items.reduce((acc, item) => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      if(!ing) return acc;
      
      // Cost is stored per ing.unit (Display unit).
      // We need to match item.quantity (item.unit) to ing.unit.
      
      // Case 1: Same unit
      if (item.unit === ing.unit) {
          return acc + (item.quantity * ing.costPerUnit);
      }
      
      // Case 2: Different units (e.g. g vs kg)
      
      // 1. Get Base Quantity of Item
      let itemBase = 0;
      switch(item.unit) {
          case UnitType.KILOGRAMS: itemBase = item.quantity * 1000; break;
          case UnitType.LITERS: itemBase = item.quantity * 1000; break;
          default: itemBase = item.quantity;
      }
      
      // 2. Convert Base Quantity to Ing Unit
      const itemQtyInIngUnit = fromBaseUnit(itemBase, ing.unit);
      
      return acc + (itemQtyInIngUnit * ing.costPerUnit);
    }, 0);
  };

  const cvu = calculateVariableCost(recipeItems);

  // Suggested Price Formula
  // Price = (CVU + (CFT / Q)) / (1 - 0.60)
  // Margin 60%
  const calculateSuggestedPrice = () => {
      const cft = Number(fixedCosts) || 0;
      const q = Number(estimatedUnits) || 1; // avoid div by 0
      
      const fixedCostPerUnit = cft / q;
      const totalUnitCost = cvu + fixedCostPerUnit;
      
      // Margin 60% -> Cost is 40% of price
      const price = totalUnitCost / (1 - 0.60);
      return Math.round(price); // Round to integer for CLP
  };

  const suggestedPrice = calculateSuggestedPrice();

  const toggleCreate = () => {
    if(isCreating) {
        closeForm();
    } else {
        resetForm();
        setIsCreating(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Recetas y Productos</h2>
        {/* Desktop Button */}
        <button 
          onClick={toggleCreate}
          className="hidden md:flex bg-indigo-600 text-white px-4 py-2 rounded-lg items-center gap-2 hover:bg-indigo-700 shadow-sm"
        >
          {isCreating ? 'Cancelar' : <><Plus size={18} /> Nuevo Producto</>}
        </button>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={toggleCreate}
        className={`md:hidden fixed bottom-20 right-4 p-4 rounded-full shadow-lg z-40 transition-colors ${isCreating ? 'bg-slate-500 hover:bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
        aria-label={isCreating ? "Cancelar" : "Nuevo Producto"}
      >
        {isCreating ? <X size={24} /> : <Plus size={24} />}
      </button>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-lg text-slate-800 border-b pb-2">
              {editingProduct ? 'Editar Receta' : 'Crear Nueva Receta'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                  <label className="label text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
                  <input 
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    value={productName} 
                    onChange={e => setProductName(e.target.value)} 
                    placeholder="Ej: Tarta de Frutilla"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-medium text-slate-700 mb-3 text-sm uppercase tracking-wide">Ingredientes (Costo Variable)</h4>
                    
                    <div className="flex flex-col gap-2 mb-4 bg-white p-3 rounded border border-slate-200 shadow-sm">
                      <label className="text-xs font-bold text-slate-500">Agregar Ingrediente</label>
                      <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-12 sm:col-span-5">
                            <select 
                                className="w-full p-2 border rounded text-sm outline-none focus:border-indigo-500 bg-white"
                                value={selectedIngId}
                                onChange={e => {
                                const ing = ingredients.find(i => i.id === e.target.value);
                                setSelectedIngId(e.target.value);
                                if(ing) setSelectedUnit(ing.unit);
                                }}
                            >
                                <option value="">-- Seleccionar --</option>
                                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({formatCurrency(i.costPerUnit)}/{i.unit})</option>)}
                            </select>
                          </div>
                          
                          <div className="col-span-4 sm:col-span-3">
                              <input 
                                type="number" 
                                className="w-full p-2 border rounded text-sm outline-none focus:border-indigo-500" 
                                placeholder="Cant."
                                value={amount}
                                onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              />
                          </div>
                          
                          <div className="col-span-6 sm:col-span-3">
                              <select 
                                className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedUnit}
                                onChange={e => setSelectedUnit(e.target.value as UnitType)}
                              >
                                {/* Show all units to allow flexibility */}
                                {UNIT_OPTIONS.map(u => (
                                  <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                              </select>
                          </div>
                          
                          <div className="col-span-2 sm:col-span-1">
                              <button 
                                onClick={handleAddIngredient}
                                disabled={!selectedIngId}
                                className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:bg-slate-300 flex items-center justify-center transition-colors h-[38px]"
                              >
                                <Plus size={18} />
                              </button>
                          </div>
                      </div>
                    </div>

                    {recipeItems.length > 0 ? (
                       <div className="space-y-2 mb-2">
                         <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-2">
                            <div className="col-span-5">Ingrediente</div>
                            <div className="col-span-5 text-right">Cantidad</div>
                            <div className="col-span-2 text-center"></div>
                         </div>
                         {recipeItems.map((item, idx) => {
                           const ingName = ingredients.find(i => i.id === item.ingredientId)?.name || 'Ingrediente eliminado';
                           return (
                             <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 border rounded shadow-sm text-sm">
                               <div className="col-span-5 truncate font-medium text-slate-700" title={ingName}>
                                 {ingName}
                                </div>
                               <div className="col-span-5 flex justify-end items-center gap-1">
                                 <input 
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-20 p-1 border border-slate-200 rounded text-right focus:border-indigo-500 outline-none"
                                    value={item.quantity === 0 ? '' : item.quantity}
                                    onChange={(e) => handleUpdateItemQuantity(idx, e.target.value)}
                                 />
                                 <span className="text-xs text-slate-500 w-8">{item.unit}</span>
                               </div>
                               <div className="col-span-2 text-center">
                                 <button 
                                    onClick={() => handleDeleteItem(idx)} 
                                    className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                               </div>
                             </div>
                           )
                         })}
                         <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-3">
                            <span className="text-slate-500 font-medium text-sm">Costo Variable Total (CVU):</span>
                            <span className="text-slate-800 font-bold text-lg">{formatCurrency(cvu)}</span>
                         </div>
                       </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic text-center py-4">Agrega ingredientes para calcular el costo.</p>
                    )}
                </div>
            </div>
            
            <div className="space-y-4">
               {/* Pricing Calculator */}
               <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-4 text-indigo-800">
                     <Calculator size={20} />
                     <h4 className="font-bold">Calculadora de Precios</h4>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-xs font-semibold text-slate-500 block mb-1">Costos Fijos Asignados (CFT)</label>
                           <div className="relative">
                               <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                               <input 
                                 type="number" 
                                 className="w-full pl-5 p-2 border border-indigo-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                 placeholder="0"
                                 value={fixedCosts}
                                 onChange={e => setFixedCosts(e.target.value === '' ? '' : Number(e.target.value))}
                               />
                           </div>
                        </div>
                        <div>
                           <label className="text-xs font-semibold text-slate-500 block mb-1">Ventas Estimadas (Q)</label>
                           <input 
                             type="number" 
                             className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                             placeholder="Unidades/mes"
                             value={estimatedUnits}
                             onChange={e => setEstimatedUnits(e.target.value === '' ? '' : Number(e.target.value))}
                           />
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-indigo-100 space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                              <span>Costo Variable (CVU):</span>
                              <span>{formatCurrency(cvu)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                              <span>Costo Fijo Unitario (CFT/Q):</span>
                              <span>{formatCurrency((Number(fixedCosts) && Number(estimatedUnits)) ? (Number(fixedCosts)/Number(estimatedUnits)) : 0)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-800 font-semibold pt-1 border-t border-slate-100">
                              <span>Costo Total Unitario:</span>
                              <span>{formatCurrency(cvu + ((Number(fixedCosts) && Number(estimatedUnits)) ? (Number(fixedCosts)/Number(estimatedUnits)) : 0))}</span>
                          </div>
                      </div>

                      <div className="flex justify-between items-center bg-indigo-100 p-3 rounded-lg">
                          <div>
                              <span className="text-xs text-indigo-600 font-bold uppercase block">Precio Sugerido</span>
                              <span className="text-[10px] text-indigo-400">Margen 60%</span>
                          </div>
                          <div className="text-xl font-bold text-indigo-800">
                              {formatCurrency(suggestedPrice)}
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => setProductPrice(suggestedPrice)}
                        disabled={!isFinite(suggestedPrice) || suggestedPrice <= 0}
                        className="w-full py-1.5 text-xs bg-indigo-200 text-indigo-800 rounded font-semibold hover:bg-indigo-300 transition-colors disabled:opacity-50"
                      >
                         Usar Precio Sugerido
                      </button>
                  </div>

                  <div>
                    <label className="label text-sm font-bold text-slate-700 mb-1 block">Precio de Venta Final</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="number" 
                            className="w-full pl-9 p-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-800" 
                            value={productPrice} 
                            onChange={e => setProductPrice(e.target.value === '' ? '' : Number(e.target.value))} 
                            placeholder="0"
                        />
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
             <button 
                onClick={handleSaveProduct}
                className="bg-green-600 text-white py-3 px-8 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
             >
                {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'} <Save size={18} />
             </button>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            ingredients={ingredients} 
            onEdit={handleEditClick}
          />
        ))}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ 
    product: Product, 
    ingredients: Ingredient[], 
    onEdit: (p: Product) => void 
}> = ({ product, ingredients, onEdit }) => {
    const [expanded, setExpanded] = useState(false);
    const { deleteProduct } = useBakery();

    const handleDelete = (e: React.MouseEvent) => {
        // e.stopPropagation() is less critical now that buttons are structurally separated, 
        // but kept for safety.
        e.stopPropagation();
        if(window.confirm(`¿Estás seguro que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`)) {
            deleteProduct(product.id);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <h3 className="font-bold text-slate-800 text-lg">{product.name}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                        {product.recipe.length} ingredientes
                    </p>
                </div>
                <div className="flex items-center gap-3 pl-4">
                    <span className="font-bold text-emerald-600 text-lg bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 whitespace-nowrap">
                        {formatCurrency(product.price)}
                    </span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Editar receta"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Eliminar receta"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 text-slate-400"
                    >
                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 animate-in fade-in slide-in-from-top-1">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Fórmula (Unitario)</h4>
                    <ul className="space-y-2 text-sm">
                        {product.recipe.map((r, i) => {
                            const ing = ingredients.find(ing => ing.id === r.ingredientId);
                            // Calculate simple cost share for display
                            let costShare = 0;
                            if(ing) {
                                let itemBase = 0;
                                switch(r.unit) {
                                    case UnitType.KILOGRAMS: itemBase = r.quantity * 1000; break;
                                    case UnitType.LITERS: itemBase = r.quantity * 1000; break;
                                    default: itemBase = r.quantity;
                                }
                                const itemQtyInIngUnit = fromBaseUnit(itemBase, ing.unit);
                                costShare = itemQtyInIngUnit * ing.costPerUnit;
                            }

                            return (
                                <li key={i} className="flex justify-between items-center text-slate-700 p-2 bg-white rounded border border-slate-100">
                                    <span className="font-medium">{ing?.name || 'Desconocido'}</span>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-600">{r.quantity} {r.unit}</div>
                                        <div className="text-[10px] text-slate-400">~{formatCurrency(costShare)}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}