import { GoogleGenAI } from "@google/genai";

export async function generateGeminiContent(prompt_post: string, ai_model: string): Promise<string> {
    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

    const response = await ai.models.generateContent({
        model: ai_model,
        contents: prompt_post,
      });
      
    return response.text || "";
}
