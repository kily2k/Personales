import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { suggestRecipe, analyzeProductionData } from '../services/geminiService';
import { Sparkles, MessageSquare, Loader2, BarChart2 } from 'lucide-react';

export const AiAssistant: React.FC = () => {
  const { ingredients, orders } = useBakery();
  const [activeTab, setActiveTab] = useState<'recipe' | 'analysis'>('recipe');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecipeSuggest = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const result = await suggestRecipe(ingredients, prompt);
      setResponse(result || 'No se pudo generar respuesta.');
    } catch (error) {
      setResponse('Error al conectar con el Chef IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeProductionData(orders, ingredients);
      setResponse(result || 'Sin datos suficientes.');
    } catch (error) {
      setResponse('Error analizando datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="animate-pulse" /> Chef IA Inteligente
        </h2>
        <p className="opacity-90 mt-2">
          Tu asistente experto para creatividad, gestión y análisis de negocio.
        </p>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('recipe'); setResponse(''); }}
          className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'recipe' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}
        >
          Consultas & Recetas
        </button>
        <button
          onClick={() => { setActiveTab('analysis'); setResponse(''); }}
          className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'analysis' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}
        >
          Análisis de Negocio
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
        {activeTab === 'recipe' ? (
          <div className="space-y-4">
            <label className="block text-slate-700 font-medium">¿Qué necesitas hoy?</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej. Tengo muchas manzanas, ¿qué puedo hacer? o Dame un consejo para merengue perfecto."
                className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleRecipeSuggest()}
              />
              <button
                onClick={handleRecipeSuggest}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg disabled:opacity-50 flex items-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : <MessageSquare size={20} />}
              </button>
            </div>
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
          </div>
        )}

        {/* Response Area */}
        {(response || loading) && (
          <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Loader2 className="animate-spin mb-2 w-8 h-8 text-indigo-500" />
                <p>El Chef está pensando...</p>
              </div>
            ) : (
              <div className="prose prose-indigo max-w-none text-slate-700 whitespace-pre-wrap">
                {response}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};