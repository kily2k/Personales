import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient, Product, Order, UnitType } from "../types";
import { formatStock } from "../utils/conversions";

// Initialize Gemini API Client safely
// If API_KEY is missing (empty string), we don't instantiate the client immediately to avoid errors.
const apiKey = process.env.API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const suggestRecipe = async (availableIngredients: Ingredient[], prompt: string) => {
  if (!ai) {
    throw new Error("API Key no configurada. Configura la variable de entorno API_KEY.");
  }

  const ingredientList = availableIngredients.map(i => `${i.name} (${formatStock(i.currentStock, i.unit)})`).join(', ');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Soy un pastelero con los siguientes ingredientes en stock: ${ingredientList}. ${prompt}`,
      config: {
        systemInstruction: "Eres un Chef Pastelero experto y creativo. Sugiere recetas detalladas o consejos basados en el inventario disponible. Sé conciso y profesional.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error (suggestRecipe):", error);
    throw error;
  }
};

export const parseOrderFromText = async (text: string, products: Product[]): Promise<any> => {
  if (!ai) return null;

  const productNames = products.map(p => p.name).join(', ');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Texto del pedido: "${text}"`,
      config: {
        systemInstruction: `Extrae la información del pedido en formato JSON.
        Los productos disponibles son: ${productNames}.
        Intenta coincidir el nombre del producto.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  quantity: { type: Type.NUMBER }
                }
              }
            },
          }
        }
      }
    });

    // Handle potential markdown code blocks in response
    let cleanText = response.text || "{}";
    cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Gemini API Error (parseOrderFromText):", e);
    return null;
  }
};

export const analyzeProductionData = async (orders: Order[], inventory: Ingredient[]) => {
    if (!ai) {
      throw new Error("API Key no configurada.");
    }

    // Simplify orders for prompt
    const orderSummary = JSON.stringify(orders.map(o => ({
        customer: o.customerName,
        status: o.status,
        items: o.items.length,
        total: o.totalPrice
    })));
    
    const inventorySummary = JSON.stringify(inventory.map(i => ({ 
        name: i.name, 
        stock: i.currentStock, 
        unit: i.unit,
        min: i.minStock 
    })));

    try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Analiza estos datos de producción. 
          Pedidos pendientes: ${orderSummary}
          Inventario actual: ${inventorySummary}
          
          Dame un resumen ejecutivo de 3 puntos:
          1. Estado de riesgo del inventario.
          2. Eficiencia de producción sugerida.
          3. Una idea creativa para vender el excedente de stock (si lo hay) o mejorar ventas.`,
          config: {
              systemInstruction: "Eres un consultor de negocios de pastelería.",
          }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error (analyzeProductionData):", error);
      throw error;
    }
}