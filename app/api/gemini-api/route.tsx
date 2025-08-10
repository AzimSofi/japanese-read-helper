import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { prompt_post } = await request.json();
    const { ai_model } = await request.json();
    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

    const response = await ai.models.generateContent({
        model: ai_model,
        // model: "gemini-2.5-flash-lite",
        // model: "gemini-2.0-flash",
        // model: "gemini-2.0-flash-lite",
        contents: prompt_post,
      });
      
    return NextResponse.json({
        response: response.text,
    });
}
