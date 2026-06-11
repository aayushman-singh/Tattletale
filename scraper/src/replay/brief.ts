// LLM-summarized intelligence brief — with a hard anti-hallucination boundary.
//
// A summarizer (the deterministic extractive composer here, or an LLM backend)
// may ONLY see BriefFacts: a small set of structured fields pulled from the case.
// Whatever text it produces is then run through validateBrief(), which rejects
// any capitalized token (proper-noun candidate) or number that does not trace
// back to those facts. A hallucinated name or statistic fails loudly — it never
// reaches the report. This is the forensic guarantee: the brief cannot assert a
// fact the data doesn't contain.

import type {
    BriefFacts,
    CaseReport,
    CorrelationResult,
    IntelligenceBrief,
    NetworkGraph,
    PlatformFinding,
} from "./types.js";

// ---------- fact extraction ----------

const SPANISH_MARKERS =
    /[áéíóúñ¿¡]|\b(como|para|una|los|las|del|que|mi|la|el|hoy|familia|receta|secreto|fuego|abuela|domingo)\b/i;

function detectLanguages(findings: PlatformFinding[]): string[] {
    let en = false;
    let es = false;
    for (const f of findings) {
        for (const p of f.samplePosts) {
            if (SPANISH_MARKERS.test(p.caption)) es = true;
            else en = true;
        }
    }
    const langs: string[] = [];
    if (en) langs.push("English");
    if (es) langs.push("Spanish");
    return langs;
}

function peakHour(findings: PlatformFinding[]): number {
    const bins = new Array(24).fill(0);
    for (const f of findings) {
        for (const p of f.samplePosts) {
            const h = new Date(p.timestamp).getUTCHours();
            if (!Number.isNaN(h)) bins[h]++;
        }
    }
    let peak = 0;
    for (let h = 1; h < 24; h++) if (bins[h] > bins[peak]) peak = h;
    return peak;
}

function windowOf(hour: number): string {
    if (hour < 6) return "night";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
}

const bandOf = (s: number | null): "high" | "medium" | "low" =>
    s === null ? "low" : s >= 0.62 ? "high" : s >= 0.4 ? "medium" : "low";

export function extractBriefFacts(
    report: Pick<CaseReport, "target" | "findings"> & {
        correlation: CorrelationResult;
        network: NetworkGraph;
    },
): BriefFacts {
    const { findings, correlation, network, target } = report;
    const clusters = correlation.identities;
    const primary = [...clusters].sort((a, b) => b.accountIndices.length - a.accountIndices.length)[0];

    // namesakes = other clusters that the engine linked to the primary (an edge
    // exists) but kept separate — i.e. flagged-but-not-merged.
    const inPrimary = new Set(primary?.accountIndices ?? []);
    const flaggedNamesakes = clusters.filter(
        (c) =>
            c.id !== primary?.id &&
            correlation.edges.some(
                (e) =>
                    (inPrimary.has(e.source) && c.accountIndices.includes(e.target)) ||
                    (inPrimary.has(e.target) && c.accountIndices.includes(e.source)),
            ),
    ).length;

    const hour = peakHour(findings);
    return {
        handle: target.handle,
        displayName: target.displayName,
        platformCount: findings.length,
        platforms: findings.map((f) => f.platform),
        totalFollowers: findings.reduce((s, f) => s + f.metrics.followers, 0),
        totalPosts: findings.reduce((s, f) => s + f.samplePosts.length, 0),
        identityCount: clusters.length,
        primaryIdentityAccounts: primary?.accountIndices.length ?? 0,
        primaryCohesionBand: bandOf(primary?.cohesion ?? null),
        flaggedNamesakes,
        peakHourUtc: hour,
        activityWindow: windowOf(hour),
        languages: detectLanguages(findings),
        topTags: target.tags.slice(0, 4),
        firstSeen: target.firstSeen,
        contactCount: network.contactCount,
        crossPlatformContacts: network.crossPlatformContacts,
    };
}

// ---------- deterministic extractive composer ----------

export function composeExtractive(f: BriefFacts): string {
    const plur = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;
    const idClause =
        f.identityCount === 1
            ? `presents a single resolved identity`
            : `presents ${plur(f.identityCount, "distinct identity").replace("identitys", "identities")}`;
    const namesakeClause =
        f.flaggedNamesakes > 0
            ? `, and flags ${plur(f.flaggedNamesakes, "same-named account")} as a likely different individual`
            : ``;
    const langClause = f.languages.length ? ` Posts appear in ${f.languages.join(" and ")}.` : ``;
    const netClause =
        f.contactCount > 0
            ? ` The mapped network spans ${plur(f.contactCount, "contact")}, ${f.crossPlatformContacts} of whom appear on more than one platform.`
            : ``;

    return (
        `${f.displayName} (@${f.handle}) ${idClause} across ${plur(f.platformCount, "platform")} ` +
        `(${f.platforms.join(", ")}). The correlation engine links ${plur(f.primaryIdentityAccounts, "account")} ` +
        `as one person with ${f.primaryCohesionBand} cohesion${namesakeClause}. ` +
        `Activity totals ${f.totalPosts} sampled posts and ${f.totalFollowers.toLocaleString("en-US")} followers, ` +
        `concentrated in the ${f.activityWindow} (peak around ${f.peakHourUtc}:00 UTC).` +
        `${langClause}${netClause} First observed ${f.firstSeen}. Themes: ${f.topTags.join(", ")}.`
    );
}

// ---------- fact-bounded validation ----------
//
// This is a VOCABULARY-BOUNDS check, not a propositional fact-checker (it does
// not verify the relations a sentence asserts). Its guarantee is narrow but real:
// the validated text may use NO word and NO number that the deterministic,
// provably-grounded extractive brief did not already use (beyond closed-class
// grammatical glue). An LLM therefore cannot smuggle in a place ("madrid"), a
// person ("boris"), an attribute ("age", "employer"), or a fabricated statistic —
// in any case (upper or lower). It can only re-phrase the grounded brief.

// Closed-class grammatical words an LLM may use to reshape sentences without
// asserting any new entity. Intentionally tiny and fixed.
const FUNCTION_WORDS = new Set(
    (
        "a an the and or but as at by for from in into of on to with is are was were be been being " +
        "this that these those it its their there here who whom which while also than then more most " +
        "one two three four five six seven eight nine ten not no s"
    )
        .split(/\s+/)
        .filter(Boolean),
);

const wordsOf = (s: string): string[] =>
    s.toLowerCase().split(/[^a-z]+/).filter(Boolean);

function allowedNumbers(f: BriefFacts): Set<string> {
    const nums = [
        f.platformCount,
        f.totalFollowers,
        f.totalPosts,
        f.identityCount,
        f.primaryIdentityAccounts,
        f.flaggedNamesakes,
        f.peakHourUtc,
        f.contactCount,
        f.crossPlatformContacts,
    ];
    const set = new Set<string>();
    for (const n of nums) set.add(String(n));
    set.add("00"); // the ":00" in the peak-hour clause
    for (const part of f.firstSeen.split(/[^0-9]+/)) if (part) set.add(part);
    return set;
}

/**
 * Throws if `text` uses a word or number not present in `facts`'s grounded
 * brief. `reference` is the trusted, provably-grounded text whose vocabulary
 * bounds `text`; it defaults to the extractive brief for `facts`, so any
 * summarizer is held to exactly the words/numbers the facts justify.
 */
export function validateBrief(text: string, facts: BriefFacts, reference?: string): void {
    const ref = reference ?? composeExtractive(facts);
    const allowedWords = new Set<string>([...wordsOf(ref), ...FUNCTION_WORDS]);
    const numbers = allowedNumbers(facts);

    // Numbers: every digit group (commas stripped) must be a grounded fact number.
    for (const m of text.matchAll(/\d[\d,]*/g)) {
        const norm = m[0].replace(/,/g, "");
        if (!numbers.has(norm)) {
            throw new Error(
                `Brief failed validation: number "${m[0]}" is not present in the source facts.`,
            );
        }
    }

    // Words: every alphabetic token (any case) must come from the grounded brief
    // or the closed function-word set. This catches lowercase hallucinations the
    // old capitalized-only check missed.
    for (const w of wordsOf(text)) {
        if (!allowedWords.has(w)) {
            throw new Error(
                `Brief failed validation: word "${w}" is not present in the grounded source brief.`,
            );
        }
    }
}

// ---------- orchestration ----------

/**
 * Generate + validate the intelligence brief. Uses the Gemini LLM backend when
 * GEMINI_API_KEY is set (operator opt-in; failure or hallucination throws, never
 * silently degrades), otherwise the deterministic extractive composer — the
 * explicit keyless path the public demo runs on.
 */
export async function generateBrief(
    report: Pick<CaseReport, "target" | "findings"> & {
        correlation: CorrelationResult;
        network: NetworkGraph;
    },
): Promise<IntelligenceBrief> {
    const facts = extractBriefFacts(report);

    if (process.env.GEMINI_API_KEY) {
        // Dynamic import so the keyless build never loads any LLM code.
        const { geminiBrief } = await import("./geminiBrief.js");
        const text = await geminiBrief(facts); // throws on API failure
        validateBrief(text, facts); // throws on hallucination — no fallback
        return { text, generator: "gemini", validated: true, facts };
    }

    const text = composeExtractive(facts);
    validateBrief(text, facts); // belt-and-suspenders; extractive should always pass
    return { text, generator: "extractive", validated: true, facts };
}
