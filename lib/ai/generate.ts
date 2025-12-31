import { getAIClient } from './client';

export async function generateGeminiContent(prompt: string, model: string): Promise<string> {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text || "";
}
