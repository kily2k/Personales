import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { suggestRecipe, analyzeProductionData, AiRecipeResult } from '../services/geminiService';
import { Sparkles, MessageSquare, Loader2, BarChart2, AlertCircle, ChevronLeft, ChevronRight, Save, CheckCircle2, AlertTriangle, Layers, Divide } from 'lucide-react';
import { UnitType, Product } from '../types';

export const AiAssistant: React.FC = () => {
  const { ingredients, orders, addProduct } = useBakery();
  const [activeTab, setActiveTab] = useState<'recipe' | 'analysis'>('recipe');
  
  // Recipe State
  const [prompt, setPrompt] = useState('');
  const [recipeSuggestions, setRecipeSuggestions] = useState<AiRecipeResult[]>([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  
  // Analysis State
  const [analysisResponse, setAnalysisResponse] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper for friendly error messages
  const getFriendlyErrorMessage = (error: any) => {
    let msg = '';
    if (typeof error === 'string') msg = error;
    else if (error.message) msg = error.message;
    else msg = JSON.stringify(error);

    // Detect specific Google API errors
    if (msg.includes('leaked') || msg.includes('API key')) {
      return '⛔ Tu API Key ha sido revocada. Ve a Vercel > Settings > Environment Variables, actualiza "API_KEY" con la nueva llave y realiza un Redeploy.';
    }
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        return '⛔ Permiso denegado. Verifica en Vercel que tu variable de entorno API_KEY sea correcta.';
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return '⚠️ Has excedido la cuota de uso de la API. Intenta más tarde.';
    }
    
    return `Error de conexión: ${msg.substring(0, 150)}...`;
  };

  const handleRecipeSuggest = async () => {
    if (!prompt) return;
    setLoading(true);
    setErrorMsg(null);
    setRecipeSuggestions([]);
    setSaveSuccess(false);
    
    try {
      const results = await suggestRecipe(ingredients, prompt);
      if (results && results.length > 0) {
        setRecipeSuggestions(results);
        setCurrentRecipeIndex(0);
      } else {
        setErrorMsg('El Chef no pudo generar recetas válidas. Intenta ser más específico.');
      }
    } catch (error: any) {
      console.error("AiAssistant Error:", error);
      setErrorMsg(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysis = async () => {
    setLoading(true);
    setErrorMsg(null);
    setAnalysisResponse('');
    try {
      const result = await analyzeProductionData(orders, ingredients);
      setAnalysisResponse(result || 'Sin datos suficientes.');
    } catch (error: any) {
      console.error("AiAssistant Error:", error);
      setErrorMsg(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // --- Recipe Matching Logic ---
  
  // Helper to normalize strings for comparison
  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Logic to check if recipe ingredients exist in DB
  const validateIngredients = (recipe: AiRecipeResult) => {
    const missing: string[] = [];
    const matched = recipe.ingredients.map(aiIng => {
      // Find match in DB
      const dbIng = ingredients.find(i => 
        normalize(i.name).includes(normalize(aiIng.name)) || 
        normalize(aiIng.name).includes(normalize(i.name))
      );

      if (!dbIng) {
        missing.push(aiIng.name);
        return null;
      }

      // Map Unit string to Enum
      let unit = UnitType.GRAMS; // Default
      const u = aiIng.unit.toLowerCase();
      if (u === 'kg') unit = UnitType.KILOGRAMS;
      if (u === 'ml') unit = UnitType.MILLILITERS;
      if (u === 'l') unit = UnitType.LITERS;
      if (u === 'u' || u.includes('unid')) unit = UnitType.UNITS;

      return {
        ingredientId: dbIng.id,
        quantity: aiIng.quantity,
        unit: unit,
        type: 'INGREDIENT' as const, // For now, AI only suggests raw ingredients
        originalName: aiIng.name // Keep for display if needed
      };
    });

    return { missing, matchedItems: matched.filter((i): i is NonNullable<typeof i> => i !== null) };
  };

  const currentRecipe = recipeSuggestions[currentRecipeIndex];
  const { missing, matchedItems } = currentRecipe ? validateIngredients(currentRecipe) : { missing: [], matchedItems: [] };
  const canSave = currentRecipe && missing.length === 0;

  const handleSaveRecipe = async () => {
    if (!canSave || !currentRecipe) return;

    try {
      // UNITARY COSTING LOGIC:
      // Current recipe is for a Batch (e.g., 12 units).
      // We must divide ingredients by yieldCount to get cost per SINGLE unit.
      const yieldDivisor = currentRecipe.yieldCount > 0 ? currentRecipe.yieldCount : 1;
      
      const unitaryRecipe = matchedItems.map(item => ({
        ...item,
        quantity: Number((item.quantity / yieldDivisor).toFixed(4)) // Keep precision for small amounts
      }));

      const newProduct: Product = {
        id: Date.now().toString(),
        name: currentRecipe.name, // Typically singular name
        price: 0, 
        description: "Receta generada por Chef IA",
        observations: `${currentRecipe.description}\n\nNota: Receta normalizada para 1 unidad (calculada desde un lote de ${yieldDivisor}).`,
        isIntermediate: false, 
        recipe: unitaryRecipe
      };

      await addProduct(newProduct);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setErrorMsg('Error al guardar la receta en la base de datos.');
    }
  };

  const nextRecipe = () => {
    if (recipeSuggestions.length > 0) {
      setCurrentRecipeIndex((prev) => (prev + 1) % recipeSuggestions.length);
      setSaveSuccess(false);
    }
  };

  const prevRecipe = () => {
    if (recipeSuggestions.length > 0) {
      setCurrentRecipeIndex((prev) => (prev - 1 + recipeSuggestions.length) % recipeSuggestions.length);
      setSaveSuccess(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 max-w-4xl mx-auto pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="animate-pulse" /> Chef IA Inteligente
        </h2>
        <p className="opacity-90 mt-2">
          Tu asistente experto para creatividad, gestión y análisis de negocio.
        </p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('recipe'); setAnalysisResponse(''); setErrorMsg(null); }}
          className={`pb-2 px-4 font-medium transition-colors whitespace-nowrap ${activeTab === 'recipe' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}
        >
          Consultas & Recetas
        </button>
        <button
          onClick={() => { setActiveTab('analysis'); setRecipeSuggestions([]); setErrorMsg(null); }}
          className={`pb-2 px-4 font-medium transition-colors whitespace-nowrap ${activeTab === 'analysis' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}
        >
          Análisis de Negocio
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
        {activeTab === 'recipe' ? (
          <div className="space-y-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-slate-700 font-medium">¿Qué deseas preparar hoy?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej. Tengo muchas manzanas, ¿qué puedo hacer? o Dame 3 variantes de Cheesecake."
                  className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleRecipeSuggest()}
                />
                <button
                  onClick={handleRecipeSuggest}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <MessageSquare size={20} />}
                </button>
              </div>
            </div>

            {/* Suggestions Display */}
            {recipeSuggestions.length > 0 && (
               <div className="animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-bold text-slate-800">Sugerencia {currentRecipeIndex + 1} de {recipeSuggestions.length}</h3>
                     <div className="flex gap-2">
                        <button onClick={prevRecipe} className="p-2 border rounded-full hover:bg-slate-100"><ChevronLeft size={20}/></button>
                        <button onClick={nextRecipe} className="p-2 border rounded-full hover:bg-slate-100"><ChevronRight size={20}/></button>
                     </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                     <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xl font-bold text-indigo-700">{currentRecipe.name}</h4>
                        {currentRecipe.yieldCount > 1 && (
                            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <Layers size={12} /> Lote de {currentRecipe.yieldCount} un.
                            </span>
                        )}
                     </div>
                     <p className="text-slate-600 italic mb-4 text-sm">{currentRecipe.description}</p>
                     
                     <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
                        <h5 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Layers size={16}/> Ingredientes (Para el lote completo)</h5>
                        <ul className="space-y-2 text-sm">
                           {currentRecipe.ingredients.map((ing, i) => {
                              // Check locally if this specific ingredient is matched
                              const dbMatch = ingredients.find(db => 
                                normalize(db.name).includes(normalize(ing.name)) || 
                                normalize(ing.name).includes(normalize(db.name))
                              );
                              
                              return (
                                <li key={i} className="flex justify-between items-center">
                                   <span className={dbMatch ? 'text-slate-700' : 'text-red-500 font-medium'}>
                                      • {ing.name} {!dbMatch && '(No existe)'}
                                   </span>
                                   <span className="font-mono text-slate-500">{ing.quantity} {ing.unit}</span>
                                </li>
                              );
                           })}
                        </ul>
                     </div>

                     {/* Action Area */}
                     <div className="flex flex-col gap-3">
                        {!canSave && (
                           <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-800">
                              <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                              <div>
                                 <strong>No se puede guardar:</strong> Faltan ingredientes en tu inventario.
                                 <ul className="list-disc list-inside mt-1 text-xs opacity-80">
                                    {missing.map((m, i) => <li key={i}>Debes crear "{m}" primero.</li>)}
                                 </ul>
                              </div>
                           </div>
                        )}
                        
                        {saveSuccess ? (
                           <div className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center justify-center gap-2 font-bold animate-in zoom-in">
                              <CheckCircle2 /> ¡Receta guardada en Productos!
                           </div>
                        ) : (
                           <button
                              onClick={handleSaveRecipe}
                              disabled={!canSave}
                              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                                 canSave 
                                 ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' 
                                 : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                           >
                              {currentRecipe.yieldCount > 1 ? (
                                  <><Divide size={18} /> Guardar Receta Unitaria (Dividir lote en {currentRecipe.yieldCount})</>
                              ) : (
                                  <><Save size={18} /> Guardar Receta</>
                              )}
                           </button>
                        )}
                        {currentRecipe.yieldCount > 1 && canSave && !saveSuccess && (
                            <p className="text-[10px] text-center text-slate-400">
                                El sistema calculará automáticamente la cantidad de ingredientes para 1 unidad.
                            </p>
                        )}
                     </div>
                  </div>
               </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-slate-600">Genera un reporte inteligente basado en tus pedidos actuales y niveles de stock.</p>
            <button
              onClick={handleAnalysis}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg shadow-md disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <BarChart2 size={20} />}
              Generar Análisis de Negocio
            </button>
            
            {(analysisResponse || loading) && !errorMsg && (
              <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200 text-left">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <Loader2 className="animate-spin mb-2 w-8 h-8 text-indigo-500" />
                    <p>El Chef está analizando tus datos...</p>
                  </div>
                ) : (
                  <div className="prose prose-indigo max-w-none text-slate-700 whitespace-pre-wrap">
                    {analysisResponse}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Message Area */}
        {errorMsg && (
          <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-2 animate-in slide-in-from-bottom-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <span className="font-medium text-sm">{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};