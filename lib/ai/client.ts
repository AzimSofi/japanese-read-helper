import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}
