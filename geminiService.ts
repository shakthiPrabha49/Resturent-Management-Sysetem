
import { GoogleGenAI } from "@google/genai";
import { Order, StockEntry, Transaction } from './types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getBusinessInsights = async (
  orders: Order[],
  transactions: Transaction[],
  stock: StockEntry[]
) => {
  try {
    const prompt = `Analyze this restaurant data and provide a concise summary (max 3 sentences) for the owner. 
    Focus on revenue, popular items, and any financial warnings.
    Orders: ${JSON.stringify(orders.slice(-10))}
    Recent Transactions: ${JSON.stringify(transactions.slice(-10))}
    Stock Levels: ${JSON.stringify(stock)}
    Respond with a friendly tone.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Insights unavailable at the moment.";
  }
};

export const generateMenuDescription = async (itemName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a 1-sentence mouth-watering description for a restaurant menu item called "${itemName}".`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text;
  } catch (error) {
    return "Deliciously prepared with fresh ingredients.";
  }
};
