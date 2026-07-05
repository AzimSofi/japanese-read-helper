import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai";
import { AI_MODELS, GUEST_KEY_HEADERS } from "@/lib/constants";
import { isAuthenticated } from "@/lib/auth/apiSession";

export const dynamic = "force-dynamic";

const MAX_SENTENCES = 60;

const RATING_INSTRUCTION = `Act as an expert reading comprehension assistant. Below are numbered sentences from one page of a book. Rate the importance of EACH sentence on a scale of 1 to 5.

[5] Critical: the core thesis, a major plot point, or vital information the page loses its meaning without.
[4] High: strong supporting arguments, essential character development, or highly relevant context.
[3] Moderate: standard narrative, dialogue, or transitional information.
[2] Low: minor descriptive details, tangents, or repetitive supporting points.
[1] Filler: purely atmospheric, fluff, or highly skimmable text.

Respond with ONLY a JSON object of the form {"scores":[n1,n2,...]} where the array holds exactly one integer (1-5) per numbered sentence, in the same order. Output no sentences, no rationale, no other text.`;

function normalizeScores(raw: unknown, count: number): number[] {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: count }, (_, i) => {
    const value = Math.round(Number(list[i]));
    if (!Number.isFinite(value)) return 3;
    return Math.min(5, Math.max(1, value));
  });
}

export async function POST(request: Request) {
  try {
    const authed = await isAuthenticated();
    const guestKey = request.headers.get(GUEST_KEY_HEADERS.GEMINI);
    if (!authed && !guestKey) {
      return NextResponse.json(
        { scores: [], message: "Sign in or add your own Gemini API key.", requiresGuestKey: "gemini" },
        { status: 401 }
      );
    }

    const { sentences } = (await request.json()) as { sentences?: unknown };
    if (!Array.isArray(sentences) || sentences.length === 0) {
      return NextResponse.json({ scores: [], message: "No sentences provided" }, { status: 400 });
    }

    const trimmed = sentences.slice(0, MAX_SENTENCES).map((s) => String(s));
    const numbered = trimmed.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n");
    const prompt = `${RATING_INSTRUCTION}\n\nSentences:\n${numbered}`;

    const ai = getAIClient(authed ? undefined : guestKey || undefined);
    const response = await ai.models.generateContent({
      model: AI_MODELS.GEMINI_3_5_FLASH,
      contents: [{ text: prompt }],
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(response.text || "{}");
    const scores = normalizeScores(Array.isArray(parsed) ? parsed : parsed.scores, trimmed.length);

    return NextResponse.json({ scores });
  } catch (error) {
    console.error("Prioritize error:", error);
    return NextResponse.json(
      { scores: [], message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
