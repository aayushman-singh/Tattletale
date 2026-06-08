// Cross-identity correlation engine.
//
// Given the per-platform accounts observed for a target, decide which accounts
// are probably the SAME person and explain WHY. Everything here is pure and
// deterministic — no clock, no randomness, no network — so the same fixture
// always yields the same graph (and therefore the same custody hash).
//
// This replaces the previously hard-coded `crossPlatformMatches`: those were
// hand-written assertions. Here every edge is *computed* from observable signals
// and carries the feature breakdown that justifies it.

import type { GoldenPlatform, GoldenPost } from "./types.js";
import type {
    CorrelationResult,
    CorrelationNode,
    CorrelationEdge,
    FeatureContribution,
    IdentityCluster,
} from "./types.js";

// ---- weights (sum to 1.0) ----
// A shared display name is WEAK evidence — many people are named "Ana Rivera" —
// so it is deliberately low. The behavioural signals (how/when/what someone
// writes) carry the weight, because those are what actually distinguish a
// person from a namesake.
const WEIGHTS = {
    handle: 0.24,
    name: 0.12,
    bio: 0.12,
    style: 0.22,
    temporal: 0.14,
    sharedTerms: 0.16,
} as const;

// Edges weaker than this are noise and are dropped from the graph entirely.
const EDGE_FLOOR = 0.35;
// At/above this an edge is strong enough to merge two accounts into one identity.
// Complete-linkage uses the SAME bar: every cross-pair inside a merged cluster
// must clear MERGE_THRESHOLD (not the weaker floor) — a merely "flaggable" 0.35
// link must never drag a third account into an identity.
const MERGE_THRESHOLD = 0.55;
// A merge must be backed by behavioural evidence on BOTH sides — handle+name
// agreement alone (a namesake) can't auto-merge, no matter how high.
const MIN_MERGE_COVERAGE = 2;

const BAND = (score: number): "high" | "medium" | "low" =>
    score >= 0.62 ? "high" : score >= 0.4 ? "medium" : "low";

const STOPWORDS = new Set(
    "the a an and or of to in on for with is are was were be been it its i im my me you your we our they them this that these those at by from as so but not no just most all can will would".split(
        " ",
    ),
);

// Function words whose *rate of use* fingerprints an author's style.
const FUNCTION_WORDS =
    "the a and i it is to of in that my you for on so just most but with this".split(
        " ",
    );

// ---------- string similarity ----------

// Jaro-Winkler — robust for short identifiers like usernames.
export function jaroWinkler(a: string, b: string): number {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;
    const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);
    let matches = 0;
    for (let i = 0; i < a.length; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, b.length);
        for (let j = start; j < end; j++) {
            if (bMatches[j] || a[i] !== b[j]) continue;
            aMatches[i] = bMatches[j] = true;
            matches++;
            break;
        }
    }
    if (matches === 0) return 0;
    let t = 0;
    let k = 0;
    for (let i = 0; i < a.length; i++) {
        if (!aMatches[i]) continue;
        while (!bMatches[k]) k++;
        if (a[i] !== b[k]) t++;
        k++;
    }
    t /= 2;
    const m = matches;
    const jaro = (m / a.length + m / b.length + (m - t) / m) / 3;
    let prefix = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
        if (a[i] === b[i]) prefix++;
        else break;
    }
    return jaro + prefix * 0.1 * (1 - jaro);
}

function normalizeHandle(h: string): string {
    return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .split(/[^a-z0-9']+/)
        .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function jaccard(a: Set<string>, b: Set<string>): number {
    if (!a.size && !b.size) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    return inter / (a.size + b.size - inter);
}

function cosine(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------- stylometry ----------
//
// Authorship signal, robust to short captions and mixed languages. Each feature
// is a rate; similarity is a bounded average of per-feature agreement, NOT a
// cosine — cosine over heterogeneous rate features wrongly scores a Spanish cook
// ~0.9 against an English developer because shared mid-range dimensions dominate.

interface StyleFeatures {
    avgWordLen: number;
    punctRate: number; // punctuation per char
    emojiRate: number; // emoji per char
    upperRatio: number; // capitals per letter
    lowerStartRate: number; // fraction of posts starting lowercase
    nonAsciiRate: number; // accented/non-ASCII letters per char — a language tell
    fwRate: number; // English function-word usage per word
}

function styleFeatures(posts: GoldenPost[]): StyleFeatures {
    const text = posts.map((p) => p.caption).join(" \n ");
    const chars = text.length || 1;
    const letters = (text.match(/[a-zA-Z]/g) || []).length || 1;
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length || 1;
    const lc = text.toLowerCase();
    const fwHits = FUNCTION_WORDS.reduce(
        (n, w) => n + (lc.match(new RegExp(`\\b${w}\\b`, "g")) || []).length,
        0,
    );
    return {
        avgWordLen: words.join("").length / wordCount,
        punctRate: (text.match(/[.,!?;:]/g) || []).length / chars,
        emojiRate: (text.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length / chars,
        upperRatio: (text.match(/[A-Z]/g) || []).length / letters,
        lowerStartRate: posts.length ? posts.filter((p) => /^[a-z]/.test(p.caption.trim())).length / posts.length : 0,
        nonAsciiRate: (text.match(/[^\x00-\x7F]/g) || []).length / chars,
        fwRate: fwHits / wordCount,
    };
}

function styleSimilarity(a: StyleFeatures, b: StyleFeatures): number {
    // denom = the spread at which two values are considered "completely different"
    const sims: number[] = [
        1 - clamp01(Math.abs(a.avgWordLen - b.avgWordLen) / 4),
        1 - clamp01(Math.abs(a.punctRate - b.punctRate) / 0.08),
        1 - clamp01(Math.abs(a.emojiRate - b.emojiRate) / 0.05),
        1 - clamp01(Math.abs(a.upperRatio - b.upperRatio) / 0.15),
        1 - clamp01(Math.abs(a.lowerStartRate - b.lowerStartRate) / 1),
        1 - clamp01(Math.abs(a.nonAsciiRate - b.nonAsciiRate) / 0.04),
        1 - clamp01(Math.abs(a.fwRate - b.fwRate) / 0.18),
    ];
    return sims.reduce((s, x) => s + x, 0) / sims.length;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// ---------- temporal ----------

function hourHistogram(posts: GoldenPost[]): number[] {
    const bins = new Array(24).fill(0);
    for (const p of posts) {
        const h = new Date(p.timestamp).getUTCHours();
        if (Number.isNaN(h)) {
            // Bad evidence fails loudly — we do not silently weaken a feature.
            throw new Error(`Invalid post timestamp "${p.timestamp}" (post ${p.id}).`);
        }
        bins[h]++;
    }
    return bins;
}

// ---------- shared low-frequency terms ----------

// Document frequency: how many accounts each term appears in. A term seen in few
// accounts is "distinctive". (Not true IDF — we don't log-weight; with a handful
// of accounts a raw frequency cut is clearer and honest about what it measures.)
function buildDocFrequency(accounts: GoldenPlatform[]): Map<string, number> {
    const df = new Map<string, number>();
    for (const acc of accounts) {
        const seen = new Set(tokenize(acc.posts.map((p) => p.caption).join(" ")));
        for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
    }
    return df;
}

// ---------- per-pair scoring ----------

function scorePair(
    a: GoldenPlatform,
    b: GoldenPlatform,
    df: Map<string, number>,
    nAccounts: number,
): { score: number; features: FeatureContribution[] } {
    const handle = jaroWinkler(normalizeHandle(a.username), normalizeHandle(b.username));
    const name = jaroWinkler(a.displayName.toLowerCase(), b.displayName.toLowerCase());
    const bio = jaccard(new Set(tokenize(a.bio)), new Set(tokenize(b.bio)));

    // Coverage gate: behavioural signals (style, timing, vocabulary) require
    // actual posts. With no posts the style vectors are trivially identical, so
    // ungated they would false-merge two accounts on name+handle alone. We scale
    // every behavioural feature by how much evidence backs it (0 posts => 0,
    // 1 post => weak, >=2 => full), so thin evidence can't masquerade as strong.
    const coverage = Math.min(a.posts.length, b.posts.length);
    const covFactor = Math.min(1, coverage / 2);

    const style = covFactor * styleSimilarity(styleFeatures(a.posts), styleFeatures(b.posts));
    const temporal =
        covFactor * Math.max(0, cosine(hourHistogram(a.posts), hourHistogram(b.posts)));

    // shared distinctive terms: in both, and low-frequency across the corpus.
    const ta = new Set(tokenize(a.posts.map((p) => p.caption).join(" ")));
    const tb = new Set(tokenize(b.posts.map((p) => p.caption).join(" ")));
    const shared: string[] = [];
    for (const t of ta) {
        if (tb.has(t) && (df.get(t) || 0) <= Math.max(2, Math.ceil(nAccounts / 2))) {
            shared.push(t);
        }
    }
    const sharedTerms = covFactor * Math.min(1, shared.length / 3);

    const parts: Array<[keyof typeof WEIGHTS, number, string]> = [
        ["handle", handle, `username similarity (${a.username} ↔ ${b.username})`],
        ["name", name, `display-name similarity ("${a.displayName}" ↔ "${b.displayName}")`],
        ["bio", bio, "overlapping bio vocabulary"],
        ["style", style, "writing-style fingerprint (punctuation, casing, function words)"],
        ["temporal", temporal, "posting hour-of-day profile"],
        [
            "sharedTerms",
            sharedTerms,
            shared.length
                ? `shared distinctive terms: ${shared.slice(0, 4).map((s) => `"${s}"`).join(", ")}`
                : "no shared distinctive terms",
        ],
    ];

    let score = 0;
    const features: FeatureContribution[] = parts.map(([key, value, label]) => {
        const weight = WEIGHTS[key];
        const contribution = value * weight;
        score += contribution;
        return {
            feature: key,
            value: round(value),
            weight,
            contribution: round(contribution),
            label,
        };
    });
    features.sort((x, y) => y.contribution - x.contribution);
    return { score: round(score), features };
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

// ---------- union-find ----------

class UnionFind {
    private parent: number[];
    constructor(n: number) {
        this.parent = Array.from({ length: n }, (_, i) => i);
    }
    find(x: number): number {
        while (this.parent[x] !== x) {
            this.parent[x] = this.parent[this.parent[x]];
            x = this.parent[x];
        }
        return x;
    }
    union(a: number, b: number): void {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
}

// ---------- deterministic layout ----------
//
// Cluster centroids are spread evenly around a circle; nodes are placed on a
// small ring around their cluster's centroid, ordered by index. Fully
// reproducible — no physics, no randomness — so the graph hashes identically.
function layout(
    nodes: CorrelationNode[],
    clusters: IdentityCluster[],
): void {
    const W = 1000;
    const H = 640;
    const cx = W / 2;
    const cy = H / 2;
    const clusterRadius = clusters.length > 1 ? 220 : 0;
    clusters.forEach((cluster, ci) => {
        const angle = (2 * Math.PI * ci) / Math.max(1, clusters.length) - Math.PI / 2;
        const ccx = cx + clusterRadius * Math.cos(angle);
        const ccy = cy + clusterRadius * Math.sin(angle);
        const members = cluster.accountIndices;
        const ring = members.length > 1 ? 90 : 0;
        members.forEach((nodeIdx, mi) => {
            const a = (2 * Math.PI * mi) / Math.max(1, members.length) - Math.PI / 2;
            nodes[nodeIdx].x = Math.round(ccx + ring * Math.cos(a));
            nodes[nodeIdx].y = Math.round(ccy + ring * Math.sin(a));
            nodes[nodeIdx].cluster = ci;
        });
    });
}

// ---------- entry point ----------

export function correlate(input: GoldenPlatform[]): CorrelationResult {
    // Canonicalize account order so cluster ids, layout coordinates, edge order
    // and therefore the root hash are independent of the order accounts were
    // collected in — required for a reproducible forensic replay.
    const accounts = [...input].sort((a, b) =>
        `${a.platform} ${a.username}`.localeCompare(`${b.platform} ${b.username}`),
    );
    const df = buildDocFrequency(accounts);
    const n = accounts.length;

    const nodes: CorrelationNode[] = accounts.map((a, i) => ({
        index: i,
        platform: a.platform,
        username: a.username,
        displayName: a.displayName,
        followers: a.followers,
        cluster: i,
        x: 0,
        y: 0,
    }));

    // Full pairwise score matrix — needed for the complete-linkage merge guard.
    const scoreMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const edges: CorrelationEdge[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const { score, features } = scorePair(accounts[i], accounts[j], df, n);
            scoreMatrix[i][j] = score;
            scoreMatrix[j][i] = score;
            if (score < EDGE_FLOOR) continue;
            edges.push({
                source: i,
                target: j,
                score,
                band: BAND(score),
                features,
                rationale: features
                    .filter((f) => f.contribution > 0.02)
                    .slice(0, 3)
                    .map((f) => f.label)
                    .join("; "),
            });
        }
    }

    // Guarded agglomeration. A pair only merges if its link >= MERGE_THRESHOLD
    // AND merging keeps the cluster internally consistent: every cross-pair
    // between the two groups must clear EDGE_FLOOR. This blocks transitive
    // over-merge (A-B, B-C strong but A-C contradictory must NOT collapse A,B,C).
    const uf = new UnionFind(n);
    const membersOf = (root: number): number[] => {
        const m: number[] = [];
        for (let k = 0; k < n; k++) if (uf.find(k) === root) m.push(k);
        return m;
    };
    const coverageOf = (i: number): number => accounts[i].posts.length;
    const mergeCandidates = edges
        .filter(
            (e) =>
                e.score >= MERGE_THRESHOLD &&
                Math.min(coverageOf(e.source), coverageOf(e.target)) >= MIN_MERGE_COVERAGE,
        )
        .sort((a, b) => b.score - a.score || a.source - b.source || a.target - b.target);
    for (const e of mergeCandidates) {
        const ra = uf.find(e.source);
        const rb = uf.find(e.target);
        if (ra === rb) continue;
        const ga = membersOf(ra);
        const gb = membersOf(rb);
        // Strict complete-linkage: every cross-pair must itself be merge-strength.
        const consistent = ga.every((x) => gb.every((y) => scoreMatrix[x][y] >= MERGE_THRESHOLD));
        if (consistent) uf.union(e.source, e.target);
    }

    // Build identity clusters from union-find roots.
    const byRoot = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
        const r = uf.find(i);
        if (!byRoot.has(r)) byRoot.set(r, []);
        byRoot.get(r)!.push(i);
    }
    const clusters: IdentityCluster[] = [...byRoot.values()]
        .sort((a, b) => a[0] - b[0])
        .map((accountIndices, ci) => {
            const primary = accountIndices
                .map((i) => accounts[i])
                .sort((a, b) => b.followers - a.followers)[0];
            const intra = edges.filter(
                (e) => accountIndices.includes(e.source) && accountIndices.includes(e.target),
            );
            // A singleton has no corroborating evidence — cohesion is undefined,
            // NOT 1. Only multi-account clusters get a numeric cohesion.
            const cohesion =
                accountIndices.length < 2 || intra.length === 0
                    ? null
                    : round(intra.reduce((s, e) => s + e.score, 0) / intra.length);
            return {
                id: ci,
                label: primary.displayName,
                accountIndices,
                platforms: accountIndices.map((i) => accounts[i].platform),
                cohesion,
            };
        });

    layout(nodes, clusters);

    return {
        method:
            "Heuristic link score (NOT a calibrated probability): pairwise handle & display-name " +
            "Jaro-Winkler, bio Jaccard, bounded stylometric agreement, hour-of-day cosine, and " +
            "shared low-frequency vocabulary — each behavioural signal coverage-gated by post " +
            "count. Accounts agglomerate into identities under a complete-linkage guard.",
        weights: WEIGHTS,
        thresholds: { edgeFloor: EDGE_FLOOR, merge: MERGE_THRESHOLD },
        nodes,
        edges: edges.sort((a, b) => b.score - a.score || a.source - b.source || a.target - b.target),
        identities: clusters,
    };
}
