
import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient, Product, Order, ChatMessage } from "../types";
import { formatStock } from "../utils/conversions";

// Initialize Gemini client with standard environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the interface for the AI response locally for typing
export interface AiRecipeResult {
  name: string;
  description: string;
  yieldCount: number; // New field for number of units
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
  }[];
}

export const suggestRecipe = async (availableIngredients: Ingredient[], prompt: string): Promise<AiRecipeResult[]> => {
  const ingredientList = availableIngredients.map(i => `${i.name} (${formatStock(i.currentStock, i.unit)})`).join(', ');
  
  try {
    // Fix: Updated to use 'gemini-3-flash-preview' for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Inventario disponible: ${ingredientList}. Solicitud del usuario: "${prompt}"`,
      config: {
        systemInstruction: `Eres un Chef Pastelero experto. Genera 3 recetas diferentes basadas en la solicitud.
        REGLAS CRÍTICAS PARA INTEGRACIÓN DE DATOS:
        1. Devuelve un JSON con un array de 3 recetas.
        2. 'yieldCount': DEBES estimar cuántas unidades o porciones rinde esta receta (ej. 12 para una docena de galletas, 1 para una torta entera). Esto es vital para calcular costos unitarios.
        3. Para las unidades ('unit'), usa EXCLUSIVAMENTE: 'g', 'kg', 'ml', 'L', o 'u'. Convierte tazas o cucharadas a gramos/ml.
        4. En 'ingredients', intenta usar nombres de ingredientes que coincidan con el inventario provisto si es posible.
        5. 'description' debe ser un resumen corto de la preparación.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              yieldCount: { type: Type.NUMBER, description: "Cantidad de unidades que rinde la receta" },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["name", "description", "yieldCount", "ingredients"]
          }
        }
      }
    });

    // Fix: Access .text property directly, as per guidelines
    const text = response.text || "[]";
    return JSON.parse(text) as AiRecipeResult[];
  } catch (error) {
    console.error("Gemini API Error (suggestRecipe):", error);
    throw error;
  }
};

export const parseOrderFromText = async (text: string, products: Product[]): Promise<any> => {
  const productNames = products.map(p => p.name).join(', ');
  
  try {
    // Fix: Updated to use 'gemini-3-flash-preview' for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    // Fix: Access .text property directly
    let cleanText = response.text || "{}";
    cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Gemini API Error (parseOrderFromText):", e);
    return null;
  }
};

export const analyzeProductionData = async (orders: Order[], inventory: Ingredient[]) => {
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
      // Fix: Updated to use 'gemini-3-pro-preview' for complex analysis
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
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
      // Fix: Access .text property directly
      return response.text;
    } catch (error) {
      console.error("Gemini API Error (analyzeProductionData):", error);
      throw error;
    }
}

export const getChefResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
  try {
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Fix: Updated to use 'gemini-3-flash-preview' for conversational AI
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "Eres Chef Pierre, un experto pastelero francés amigable y servicial. Ayudas con recetas, consejos técnicos y gestión de pastelería. Tus respuestas son breves, útiles y con un toque de personalidad francesa.",
      },
      history: formattedHistory
    });

    const result = await chat.sendMessage({ message: newMessage });
    // Fix: Access .text property directly
    return result.text || "";
  } catch (error) {
    console.error("Gemini API Error (getChefResponse):", error);
    throw error;
  }
};
