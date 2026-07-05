import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai";
import { AI_MODELS, GUEST_KEY_HEADERS, PAGINATION_CONFIG, type PriorityScore } from "@/lib/constants";
import { isAuthenticated } from "@/lib/auth/apiSession";

export const dynamic = "force-dynamic";

// A reader page holds at most one screen of units, so this also bounds how many
// sentences we ever score. Derived from the reader's paging so the two stay in
// step -- raising items-per-page can never silently drop sentences here.
const MAX_SENTENCES = PAGINATION_CONFIG.ITEMS_PER_PAGE;

const RATING_INSTRUCTION = `Act as an expert reading comprehension assistant. Below are numbered sentences from one page of a book. Rate the importance of EACH sentence on a scale of 1 to 5.

[5] Critical: the core thesis, a major plot point, or vital information the page loses its meaning without.
[4] High: strong supporting arguments, essential character development, or highly relevant context.
[3] Moderate: standard narrative, dialogue, or transitional information.
[2] Low: minor descriptive details, tangents, or repetitive supporting points.
[1] Filler: purely atmospheric, fluff, or highly skimmable text.

Respond with ONLY a JSON object of the form {"scores":[n1,n2,...]} where the array holds exactly one integer (1-5) per numbered sentence, in the same order. Output no sentences, no rationale, no other text.`;

function clampScore(value: unknown): PriorityScore {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return 3;
  return Math.min(5, Math.max(1, rounded)) as PriorityScore;
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
    const rawScores = Array.isArray(parsed) ? parsed : parsed?.scores;

    // A blocked/empty candidate or count mismatch must fail loudly rather than be
    // coerced into uniform defaults the reader would show as real judgment.
    if (!Array.isArray(rawScores) || rawScores.length !== trimmed.length) {
      return NextResponse.json(
        { scores: [], message: "The model did not return a score for every sentence." },
        { status: 502 }
      );
    }

    return NextResponse.json({ scores: rawScores.map(clampScore) });
  } catch (error) {
    console.error("Prioritize error:", error);
    return NextResponse.json(
      { scores: [], message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
