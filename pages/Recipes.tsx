import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Product, RecipeItem, UnitType, Ingredient } from '../types';
import { UNIT_OPTIONS } from '../constants';
import { Plus, Trash2, ChevronDown, ChevronUp, Calculator, DollarSign, Edit2, Save, X, Search, Layers, StickyNote } from 'lucide-react';
import { fromBaseUnit, formatCurrency } from '../utils/conversions';

export const Recipes: React.FC = () => {
  const { products, ingredients, addProduct, updateProduct } = useBakery();
  const [isCreating, setIsCreating] = useState(false);
  
  // State to track if we are editing an existing product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form State
  const [productName, setProductName] = useState('');
  const [productObservations, setProductObservations] = useState('');
  const [productPrice, setProductPrice] = useState<number | ''>('');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [isIntermediate, setIsIntermediate] = useState(false);
  
  // Costing Calculator State
  const [fixedCosts, setFixedCosts] = useState<number | ''>('');
  const [estimatedUnits, setEstimatedUnits] = useState<number | ''>('');
  
  // Ingredient Search & Add State
  // Search Logic now includes BOTH Ingredients AND Intermediate Products
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemType, setSelectedItemType] = useState<'INGREDIENT' | 'PRODUCT'>('INGREDIENT');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>(UnitType.GRAMS);

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Combined Suggestions: Ingredients + Intermediate Products
  // SORTED A-Z
  const combinedSuggestions = useMemo(() => {
     const rawIngs = ingredients.map(i => ({
         id: i.id,
         name: i.name,
         type: 'INGREDIENT' as const,
         unit: i.unit,
         cost: i.costPerUnit,
         isIntermediate: false
     }));

     // Only show products that ARE intermediate (Sub-recipes)
     // Prevent circular dependency (simplistic check: don't show self if editing)
     const subProds = products
        .filter(p => p.isIntermediate && p.id !== editingProduct?.id)
        .map(p => ({
            id: p.id,
            name: p.name,
            type: 'PRODUCT' as const,
            unit: UnitType.UNITS, // Default for sub-recipes usually
            cost: 0, // Calculated dynamically later
            isIntermediate: true
        }));

     return [...rawIngs, ...subProds]
        .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients, products, searchQuery, editingProduct]);

  const handleSelectItem = (item: typeof combinedSuggestions[0]) => {
    setSelectedItemId(item.id);
    setSelectedItemType(item.type);
    setSearchQuery(item.name);
    setSelectedUnit(item.unit);
    setShowSuggestions(false);
  };

  const handleAddItem = () => {
    if(!selectedItemId) {
        alert("Por favor selecciona un ingrediente o base.");
        return;
    }
    if(!amount || Number(amount) <= 0) {
        alert("Ingresa una cantidad válida.");
        return;
    }
    
    setRecipeItems([...recipeItems, {
      ingredientId: selectedItemId, // This stores either Ing ID or Prod ID
      type: selectedItemType,
      quantity: Number(amount),
      unit: selectedUnit
    }]);
    
    // Reset inputs
    setAmount('');
    setSelectedItemId('');
    setSelectedItemType('INGREDIENT');
    setSearchQuery('');
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
    setProductObservations(product.observations || '');
    setProductPrice(product.price);
    setIsIntermediate(!!product.isIntermediate);
    
    // Normalize recipe items (handle legacy data missing 'type')
    const normalizedItems = product.recipe.map(item => ({
        ...item,
        type: item.type || 'INGREDIENT' // Default for old data
    }));
    setRecipeItems(normalizedItems.map(item => ({...item}))); 
    
    setFixedCosts('');
    setEstimatedUnits('');
    
    setIsCreating(true);
  };

  const handleSaveProduct = async () => {
    // Validation
    if(!productName.trim()) {
        alert("El nombre del producto es obligatorio.");
        return;
    }
    if(recipeItems.length === 0) {
        alert("Debes agregar al menos un ingrediente a la receta.");
        return;
    }
    
    // If it's NOT intermediate, it needs a price. 
    // If it IS intermediate, price is optional (usually 0/internal).
    if(!isIntermediate && (productPrice === '' || Number(productPrice) < 0)) {
        alert("El precio de venta no es válido.");
        return;
    }
    
    try {
        const validItems = recipeItems.filter(item => item.quantity > 0);
        const finalPrice = productPrice === '' ? 0 : Number(productPrice);

        const prodData: Product = {
            id: editingProduct ? editingProduct.id : Date.now().toString(),
            name: productName,
            price: finalPrice,
            recipe: validItems,
            isIntermediate: isIntermediate,
            observations: productObservations
        };

        if (editingProduct) {
            await updateProduct(prodData);
        } else {
            await addProduct(prodData);
        }
        
        closeForm();
    } catch (error) {
        console.error("Error al guardar producto:", error);
        alert("Hubo un error al guardar el producto.");
    }
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingProduct(null);
    resetForm();
  };

  const resetForm = () => {
    setProductName('');
    setProductObservations('');
    setProductPrice('');
    setRecipeItems([]);
    setFixedCosts('');
    setEstimatedUnits('');
    setEditingProduct(null);
    setSearchQuery('');
    setSelectedItemId('');
    setAmount('');
    setIsIntermediate(false);
  };

  // --- RECURSIVE COST CALCULATOR ---
  const getProductCost = (prodId: string): number => {
      const prod = products.find(p => p.id === prodId);
      if(!prod) return 0;
      return calculateVariableCost(prod.recipe);
  };

  const calculateVariableCost = (items: RecipeItem[]) => {
    return items.reduce((acc, item) => {
      const type = item.type || 'INGREDIENT';
      
      if (type === 'INGREDIENT') {
          const ing = ingredients.find(i => i.id === item.ingredientId);
          if(!ing) return acc;
          
          if (item.unit === ing.unit) {
              return acc + (item.quantity * ing.costPerUnit);
          }
          let itemBase = 0;
          switch(item.unit) {
              case UnitType.KILOGRAMS: itemBase = item.quantity * 1000; break;
              case UnitType.LITERS: itemBase = item.quantity * 1000; break;
              default: itemBase = item.quantity;
          }
          const itemQtyInIngUnit = fromBaseUnit(itemBase, ing.unit);
          return acc + (itemQtyInIngUnit * ing.costPerUnit);

      } else {
          // It's a SUB-PRODUCT (Intermediate)
          // Assumption: Cost is calculated per 1 Unit of that recipe (Batch)
          // Ideally we need yield, but for now we assume 1 Unit = 1 Batch Cost.
          const subCost = getProductCost(item.ingredientId);
          
          // If unit is UNITS, it's a direct multiplier. 
          // If unit is Weight, we are in trouble without yield. We fallback to direct multiplier logic.
          // Usually sub-recipes are added as "0.5 Units" (half batch).
          
          let multiplier = item.quantity;
          // Very simple fallback if they try to measure a recipe in grams (assuming 1 unit = 1 kg for lack of better data)
          // Ideally: Prevent non-unit measures for sub-products in UI, or assume 1 Unit.
          
          return acc + (subCost * multiplier);
      }
    }, 0);
  };

  const cvu = calculateVariableCost(recipeItems);

  // Suggested Price Formula
  const calculateSuggestedPrice = () => {
      const cft = Number(fixedCosts) || 0;
      const q = Number(estimatedUnits) || 1; 
      const fixedCostPerUnit = cft / q;
      const totalUnitCost = cvu + fixedCostPerUnit;
      const price = totalUnitCost / (1 - 0.60);
      return Math.round(price);
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
        <button 
          onClick={toggleCreate}
          className="hidden md:flex bg-indigo-600 text-white px-4 py-2 rounded-lg items-center gap-2 hover:bg-indigo-700 shadow-sm"
        >
          {isCreating ? 'Cancelar' : <><Plus size={18} /> Nuevo Producto</>}
        </button>
      </div>

      <button 
        onClick={toggleCreate}
        className={`md:hidden fixed bottom-20 right-4 p-4 rounded-full shadow-lg z-40 transition-colors ${isCreating ? 'bg-slate-500 hover:bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
      >
        {isCreating ? <X size={24} /> : <Plus size={24} />}
      </button>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-start border-b pb-2">
            <h3 className="font-bold text-lg text-slate-800">
                {editingProduct ? 'Editar Receta' : 'Crear Nueva Receta'}
            </h3>
            {/* Intermediate Switch */}
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
               <input 
                 type="checkbox" 
                 id="isIntermediate"
                 checked={isIntermediate}
                 onChange={e => setIsIntermediate(e.target.checked)}
                 className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
               />
               <label htmlFor="isIntermediate" className="text-xs font-bold text-amber-800 cursor-pointer select-none">
                 Es Preparado Base / Intermedio
               </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                  <label className="label text-sm font-medium text-slate-700 mb-1">Nombre {isIntermediate ? 'del Preparado' : 'del Producto'}</label>
                  <input 
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    value={productName} 
                    onChange={e => setProductName(e.target.value)} 
                    placeholder={isIntermediate ? "Ej: Masa Madre, Relleno de Limón" : "Ej: Tarta de Frutilla"}
                  />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-medium text-slate-700 mb-3 text-sm uppercase tracking-wide">Fórmula (Ingredientes y Bases)</h4>
                    
                    <div className="flex flex-col gap-2 mb-4 bg-white p-3 rounded border border-slate-200 shadow-sm relative" ref={suggestionsRef}>
                      <label className="text-xs font-bold text-slate-500">Agregar Ítem</label>
                      <div className="grid grid-cols-12 gap-2 items-end">
                          
                          {/* Autocomplete Input */}
                          <div className="col-span-12 sm:col-span-5 relative">
                             <div className="flex items-center border rounded bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                <Search size={16} className="ml-2 text-slate-400" />
                                <input 
                                    className="w-full p-2 text-sm outline-none"
                                    placeholder="Buscar ingrediente o base..."
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        setSelectedItemId(''); 
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                />
                             </div>
                             
                             {/* Combined Suggestions Dropdown */}
                             {showSuggestions && combinedSuggestions.length > 0 && (
                                 <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                    {combinedSuggestions.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelectItem(item)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 text-slate-700 border-b border-slate-50 last:border-none flex justify-between items-center"
                                        >
                                            <span className="flex items-center gap-2">
                                                {item.isIntermediate && <Layers size={12} className="text-amber-500" />}
                                                {item.name}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {item.isIntermediate ? 'Receta' : `${formatCurrency(item.cost)}/${item.unit}`}
                                            </span>
                                        </button>
                                    ))}
                                 </div>
                             )}
                          </div>
                          
                          <div className="col-span-4 sm:col-span-3">
                              <input 
                                type="number" 
                                className="w-full p-2 border rounded text-sm outline-none focus:border-indigo-500" 
                                placeholder="Cant."
                                value={amount}
                                onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                onKeyDown={(e) => { if(e.key === 'Enter') handleAddItem() }}
                              />
                          </div>
                          
                          <div className="col-span-6 sm:col-span-3">
                              <select 
                                className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedUnit}
                                onChange={e => setSelectedUnit(e.target.value as UnitType)}
                              >
                                {UNIT_OPTIONS.map(u => (
                                  <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                              </select>
                          </div>
                          
                          <div className="col-span-2 sm:col-span-1">
                              <button 
                                onClick={handleAddItem}
                                className={`w-full text-white p-2 rounded flex items-center justify-center transition-colors h-[38px] ${selectedItemId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
                                disabled={!selectedItemId}
                              >
                                <Plus size={18} />
                              </button>
                          </div>
                      </div>
                    </div>

                    {recipeItems.length > 0 ? (
                       <div className="space-y-2 mb-2">
                         <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-2">
                            <div className="col-span-5">Ítem</div>
                            <div className="col-span-5 text-right">Cantidad</div>
                            <div className="col-span-2 text-center"></div>
                         </div>
                         {recipeItems.map((item, idx) => {
                           let name = 'Desconocido';
                           let isSub = false;
                           
                           if (item.type === 'PRODUCT') {
                               name = products.find(p => p.id === item.ingredientId)?.name || 'Base eliminada';
                               isSub = true;
                           } else {
                               name = ingredients.find(i => i.id === item.ingredientId)?.name || 'Ingrediente eliminado';
                           }

                           return (
                             <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 border rounded shadow-sm text-sm ${isSub ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-200'}`}>
                               <div className="col-span-5 truncate font-medium text-slate-700 flex items-center gap-1" title={name}>
                                 {isSub && <Layers size={12} className="text-amber-500 flex-shrink-0" />}
                                 {name}
                                </div>
                               <div className="col-span-5 flex justify-end items-center gap-1">
                                 <input 
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-20 p-1 border border-slate-200 rounded text-right focus:border-indigo-500 outline-none bg-white"
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
                        <p className="text-xs text-slate-400 italic text-center py-4">Agrega ingredientes o bases para calcular el costo.</p>
                    )}
                </div>
            </div>
            
            <div className="space-y-4">
               {/* Pricing Calculator - Hide/Dim if Intermediate */}
               <div className={`bg-indigo-50 p-5 rounded-xl border border-indigo-100 ${isIntermediate ? 'opacity-60 grayscale' : ''}`}>
                  <div className="flex items-center gap-2 mb-4 text-indigo-800">
                     <Calculator size={20} />
                     <h4 className="font-bold">Calculadora {isIntermediate ? '(No requerida)' : 'de Precios'}</h4>
                  </div>
                  
                  {!isIntermediate && (
                    <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Costos Fijos Asignados (CFT)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-indigo-200 rounded text-sm"
                                placeholder="0"
                                value={fixedCosts}
                                onChange={e => setFixedCosts(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                            </div>
                            <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Ventas Estimadas (Q)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-indigo-200 rounded text-sm"
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
                  )}

                  <div>
                    <label className="label text-sm font-bold text-slate-700 mb-1 block">
                        {isIntermediate ? 'Costo/Valor Interno (Opcional)' : 'Precio de Venta Final'}
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="number" 
                            className="w-full pl-9 p-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-800" 
                            value={productPrice} 
                            onChange={e => setProductPrice(e.target.value === '' ? '' : Number(e.target.value))} 
                            placeholder={isIntermediate ? "0" : "0"}
                        />
                    </div>
                  </div>
               </div>
            </div>
          </div>
          
          {/* Observation Field Moved to Bottom Full Width */}
          <div className="mt-2">
              <label className="label text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                 <StickyNote size={16} className="text-indigo-500" /> Observaciones / Instrucciones de Preparación
              </label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm" 
                value={productObservations} 
                onChange={e => setProductObservations(e.target.value)} 
                placeholder="Ej: Instrucciones paso a paso, temperatura de horno, tips de decoración..."
                rows={4}
              />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
             <button 
                type="button"
                onClick={handleSaveProduct}
                className="bg-green-600 text-white py-3 px-8 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
             >
                {editingProduct ? 'Actualizar' : 'Guardar'} {isIntermediate ? 'Base' : 'Producto'} <Save size={18} />
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
            products={products}
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
    products: Product[],
    onEdit: (p: Product) => void 
}> = ({ product, ingredients, products, onEdit }) => {
    const [expanded, setExpanded] = useState(false);
    const { deleteProduct } = useBakery();

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(window.confirm(`¿Estás seguro que deseas eliminar "${product.name}"?`)) {
            deleteProduct(product.id);
        }
    };

    return (
        <div className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${product.isIntermediate ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="p-4 flex justify-between items-center hover:bg-opacity-80">
                <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center gap-2">
                        {product.isIntermediate && <Layers size={18} className="text-amber-600" />}
                        <h3 className="font-bold text-slate-800 text-lg">{product.name}</h3>
                    </div>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                        {product.isIntermediate ? 'Receta Base / Preparado' : `${product.recipe.length} componentes`}
                    </p>
                </div>
                <div className="flex items-center gap-3 pl-4">
                    {!product.isIntermediate && (
                        <span className="font-bold text-emerald-600 text-lg bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 whitespace-nowrap">
                            {formatCurrency(product.price)}
                        </span>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
                <div className="p-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 bg-white/50">
                    
                    {/* Observations Display */}
                    {product.observations && (
                        <div className="mb-4 bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100 flex gap-2">
                            <StickyNote size={14} className="flex-shrink-0 mt-0.5" />
                            <p className="whitespace-pre-wrap">{product.observations}</p>
                        </div>
                    )}

                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Fórmula</h4>
                    <ul className="space-y-2 text-sm">
                        {product.recipe.map((r, i) => {
                            const isSub = r.type === 'PRODUCT';
                            let name = 'Desconocido';
                            
                            if (isSub) {
                                name = products.find(p => p.id === r.ingredientId)?.name || 'Base eliminada';
                            } else {
                                name = ingredients.find(ing => ing.id === r.ingredientId)?.name || 'Ingrediente desconocido';
                            }

                            return (
                                <li key={i} className="flex justify-between items-center text-slate-700 p-2 bg-white rounded border border-slate-100">
                                    <span className="font-medium flex items-center gap-2">
                                        {isSub && <Layers size={12} className="text-amber-500" />}
                                        {name}
                                    </span>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-600">{r.quantity} {r.unit}</div>
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