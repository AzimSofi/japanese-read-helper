import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAIClient(apiKey?: string): GoogleGenAI {
  // Guests supply their own key per request; never cache or reuse it.
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}
