// Optional LLM backend for the intelligence brief (Gemini). Loaded ONLY when
// GEMINI_API_KEY is set, so the keyless demo never touches LLM code or the
// network. The model is given the structured BriefFacts and nothing else, and is
// instructed to invent no names/numbers/places — but it is NOT trusted: the
// caller (brief.ts) re-validates the output and throws on any hallucination.
//
// This mirrors the project's existing Langchain + Gemini chatbot pipeline
// (frontend/maigret + scraper/src/routes/chatbot.py) but stays in the replay
// engine's TypeScript so the case bundle is produced by one toolchain.

import type { BriefFacts } from "./types.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export async function geminiBrief(facts: BriefFacts): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Should never happen — the orchestrator only imports this with a key.
        throw new Error("geminiBrief called without GEMINI_API_KEY.");
    }

    const prompt =
        "You are a forensic OSINT analyst. Write ONE concise English paragraph (3-5 sentences) " +
        "summarizing the target for an investigator. Use ONLY the JSON facts below. Do NOT invent " +
        "or infer any name, place, age, organization, or number that is not present in the facts " +
        "(no cities, no ages, no employers). Refer to the subject by displayName and handle only. " +
        "State the identity correlation result and the activity pattern plainly.\n\nFACTS:\n" +
        JSON.stringify(facts, null, 2);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
        throw new Error(`Gemini returned no text: ${JSON.stringify(data).slice(0, 400)}`);
    }
    return text.replace(/\s+/g, " ").trim();
}
