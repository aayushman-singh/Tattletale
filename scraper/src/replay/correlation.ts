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

import type { GeoPoint, GoldenPlatform, GoldenPost } from "./types.js";
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

// ---- 7th signal: temporal-geospatial co-presence (applicability-gated overlay) ----
//
// Two accounts run by ONE operator tend to post from the SAME place at the SAME
// moment (one device, cross-posting). That is the signal: distinct posting
// occasions on account A that coincide — in fine space AND tight time — with a
// post on account B. It is deliberately NOT the coarse "same city": a 250 m /
// 30 min coincidence is what separates a shared operator from two strangers who
// merely live in the same town (the namesake trap), so geo can never collapse
// two distinct people on location alone.
//
// It is an OVERLAY, not a 7th convex weight: when geo/time metadata is missing
// it is INAPPLICABLE and the six behavioural weights renormalize to 1.0 — the
// score is then byte-identical to the geo-less engine, so absence is true
// neutrality, never a fabricated value. When applicable it claims W_COPRESENCE
// and proportionally scales the six. A geo-tagged pair that is NEVER co-located
// scores 0 here (kept in the average) — honest mild evidence AGAINST a shared
// operator, distinct from "no instrument".
const W_COPRESENCE = 0.1;
const COPRESENCE_RADIUS_M = 250; // "same place" — tight enough to exclude a shared city
const COPRESENCE_WINDOW_MS = 30 * 60 * 1000; // "same time" — a 30-min cross-post window
const COPRESENCE_SATURATION = 3; // independent co-located occasions for full credit
const MIN_GEO_COVERAGE = 2; // capture-grade geo posts each side before the signal applies

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
        // Strict ISO-8601-with-timezone parse (shared with the geo path): a
        // timezone-less string would be read in the host's local zone — a
        // host-dependent result the forensic replay cannot tolerate. Bad evidence
        // fails loudly; we never silently weaken a feature.
        bins[new Date(parseInstant(p.timestamp, p.id)).getUTCHours()]++;
    }
    return bins;
}

// ---------- temporal-geospatial co-presence ----------

// `null`/`undefined`/absent geo means "no location recorded" — a legitimate
// absent state, handled as neutral upstream. A PRESENT-but-malformed geo object
// (non-finite or out-of-range, or a coarser-than-fine accuracy that is itself
// invalid) is bad evidence and fails loudly — never silently dropped.
function validatedGeo(p: GoldenPost): GeoPoint | null {
    if (p.geo === undefined || p.geo === null) return null;
    const { lat, lon, accuracyM } = p.geo;
    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        throw new Error(`Invalid geo for post ${p.id}: lat=${lat}, lon=${lon}.`);
    }
    if (accuracyM !== undefined && (!Number.isFinite(accuracyM) || accuracyM < 0)) {
        throw new Error(`Invalid geo accuracy for post ${p.id}: accuracyM=${accuracyM}.`);
    }
    return accuracyM === undefined ? { lat, lon } : { lat, lon, accuracyM };
}

interface GeoStamp {
    t: number; // epoch ms
    geo: GeoPoint;
}

// Strict ISO-8601 instant WITH an explicit timezone (Z or ±hh:mm). A timezone-less
// or non-standard string is ambiguous (would parse in the host's local zone, a
// determinism hole) and is rejected — bad evidence fails loudly.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
function parseInstant(ts: string, postId: string): number {
    if (!ISO_INSTANT.test(ts)) {
        throw new Error(
            `Invalid post timestamp "${ts}" (post ${postId}): require ISO-8601 with a timezone (Z or ±hh:mm).`,
        );
    }
    const t = Date.parse(ts);
    if (Number.isNaN(t)) {
        throw new Error(`Invalid post timestamp "${ts}" (post ${postId}).`);
    }
    return t;
}

// Capture-grade geo posts of an account: a valid instant, a valid point, AND a
// stated accuracy no coarser than the co-presence radius. A coarse point (a
// city/venue centroid) is NOT a co-presence instrument, so it is dropped here
// rather than counted toward coverage — an account with only coarse points is
// therefore INAPPLICABLE (renormalized out, neutral), not scored as a zero.
function geoStamps(posts: GoldenPost[]): GeoStamp[] {
    const out: GeoStamp[] = [];
    for (const p of posts) {
        const geo = validatedGeo(p);
        if (!geo) continue;
        if ((geo.accuracyM ?? 0) > COPRESENCE_RADIUS_M) continue; // coarse: not an instrument
        out.push({ t: parseInstant(p.timestamp, p.id), geo });
    }
    return out;
}

// Great-circle distance in metres (haversine).
function haversineMeters(a: GeoPoint, b: GeoPoint): number {
    const R = 6_371_000;
    const toRad = (d: number): number => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Two capture-grade stamps are co-located if their separation is within the
// co-presence radius. (Coarse points are already excluded by `geoStamps`.)
function coLocated(x: GeoStamp, y: GeoStamp): boolean {
    return haversineMeters(x.geo, y.geo) <= COPRESENCE_RADIUS_M;
}

// Returns null when the signal is INAPPLICABLE — either account has fewer than
// MIN_GEO_COVERAGE capture-grade geo posts (no instrument / too sparse to mean
// anything; renormalized out, never punished). Otherwise the value is in [0,1].
//
// Counting is two-staged so the result reflects DISTINCT real-world occasions, not
// post volume:
//   1. One-to-one greedy matching of co-located cross-pairs (tightest-time-first,
//      each post consumed once) — symmetric in (a, b) and immune to a one-sided
//      duplicate burst matching the same post repeatedly.
//   2. The matched pairs are then collapsed into distinct temporal occasions: pairs
//      whose times fall within COPRESENCE_WINDOW_MS of each other are ONE occasion.
//      So two accounts that both spam N posts at the same instant/place still count
//      as a single co-presence event, not N.
// Saturates at COPRESENCE_SATURATION.
function coPresence(a: GoldenPost[], b: GoldenPost[]): { value: number; occasions: number } | null {
    const ga = geoStamps(a);
    const gb = geoStamps(b);
    if (ga.length < MIN_GEO_COVERAGE || gb.length < MIN_GEO_COVERAGE) return null;

    const candidates: Array<{ i: number; j: number; dt: number }> = [];
    for (let i = 0; i < ga.length; i++) {
        for (let j = 0; j < gb.length; j++) {
            const dt = Math.abs(ga[i].t - gb[j].t);
            if (dt <= COPRESENCE_WINDOW_MS && coLocated(ga[i], gb[j])) {
                candidates.push({ i, j, dt });
            }
        }
    }
    candidates.sort((p, q) => p.dt - q.dt || p.i - q.i || p.j - q.j);

    const usedA = new Set<number>();
    const usedB = new Set<number>();
    const matchTimes: number[] = [];
    for (const c of candidates) {
        if (usedA.has(c.i) || usedB.has(c.j)) continue;
        usedA.add(c.i);
        usedB.add(c.j);
        // Representative time of the matched pair (earlier of the two posts).
        matchTimes.push(Math.min(ga[c.i].t, gb[c.j].t));
    }

    // Collapse matched pairs into distinct temporal occasions by 1-D gap clustering.
    matchTimes.sort((p, q) => p - q);
    let occasions = 0;
    let prev = -Infinity;
    for (const t of matchTimes) {
        if (t - prev > COPRESENCE_WINDOW_MS) occasions++;
        prev = t;
    }
    return { value: Math.min(1, occasions / COPRESENCE_SATURATION), occasions };
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
): { score: number; baseScore: number; features: FeatureContribution[] } {
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

    // `baseScore` is the pure six-signal behavioural score (weights sum to 1.0).
    // It is what drives MERGE decisions: co-presence may raise the displayed score
    // and cohesion and flag a link, but it can NEVER manufacture a merge — geo
    // never collapses two behaviourally-distinct people. See `correlate`.
    const baseScore = parts.reduce((s, [key, value]) => s + value * WEIGHTS[key], 0);

    // Co-presence overlay. When applicable it claims W_COPRESENCE and the six
    // behavioural weights renormalize to (1 - W_COPRESENCE); when inapplicable
    // (no/insufficient geo metadata) baseScale = 1 and the displayed score is the
    // behavioural score — absence is true neutrality, not a zero that drags.
    const cop = coPresence(a.posts, b.posts);
    const baseScale = cop !== null ? 1 - W_COPRESENCE : 1;

    let score = 0;
    const features: FeatureContribution[] = parts.map(([key, value, label]) => {
        const weight = WEIGHTS[key] * baseScale;
        const contribution = value * weight;
        score += contribution;
        return {
            feature: key,
            value: round(value),
            weight: round(weight),
            contribution: round(contribution),
            label,
        };
    });

    if (cop !== null) {
        const contribution = cop.value * W_COPRESENCE;
        score += contribution;
        features.push({
            feature: "coPresence",
            value: round(cop.value),
            weight: W_COPRESENCE,
            contribution: round(contribution),
            label:
                cop.occasions > 0
                    ? `co-located posting: ${cop.occasions} occasion${cop.occasions === 1 ? "" : "s"} within ${COPRESENCE_RADIUS_M} m and ${COPRESENCE_WINDOW_MS / 60000} min`
                    : "geo-tagged but never co-located (evidence against a shared operator)",
        });
    }

    features.sort((x, y) => y.contribution - x.contribution);
    return { score: round(score), baseScore: round(baseScore), features };
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
    const keyOf = (p: GoldenPlatform): string => `${p.platform} ${p.username}`;
    const accounts = [...input].sort((a, b) => {
        const ka = keyOf(a);
        const kb = keyOf(b);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
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

    // Two full pairwise matrices. `scoreMatrix` is the DISPLAYED score (with the
    // co-presence overlay) — it drives edge weight, banding and cohesion.
    // `baseMatrix` is the pure six-signal BEHAVIOURAL score and is the ONLY thing
    // that drives merges: co-presence can corroborate and flag a link, but it can
    // never collapse two behaviourally-distinct identities.
    const scoreMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const baseMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const edges: CorrelationEdge[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const { score, baseScore, features } = scorePair(accounts[i], accounts[j], df, n);
            scoreMatrix[i][j] = score;
            scoreMatrix[j][i] = score;
            baseMatrix[i][j] = baseScore;
            baseMatrix[j][i] = baseScore;
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

    // Guarded agglomeration, decided purely on BEHAVIOURAL evidence (baseMatrix).
    // A pair only merges if its behavioural link >= MERGE_THRESHOLD AND merging
    // keeps the cluster internally consistent: every cross-pair between the two
    // groups must itself be behaviourally merge-strength (strict complete-linkage).
    // This blocks transitive over-merge AND ensures co-presence — a geo overlay —
    // can never be the deciding factor that collapses two distinct people.
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
                baseMatrix[e.source][e.target] >= MERGE_THRESHOLD &&
                Math.min(coverageOf(e.source), coverageOf(e.target)) >= MIN_MERGE_COVERAGE,
        )
        .sort(
            (a, b) =>
                baseMatrix[b.source][b.target] - baseMatrix[a.source][a.target] ||
                a.source - b.source ||
                a.target - b.target,
        );
    for (const e of mergeCandidates) {
        const ra = uf.find(e.source);
        const rb = uf.find(e.target);
        if (ra === rb) continue;
        const ga = membersOf(ra);
        const gb = membersOf(rb);
        // Strict complete-linkage on behavioural score: every cross-pair must
        // itself be behaviourally merge-strength.
        const consistent = ga.every((x) => gb.every((y) => baseMatrix[x][y] >= MERGE_THRESHOLD));
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
            "count. A seventh signal, temporal-geospatial co-presence, is an applicability-gated " +
            `overlay (weight ${W_COPRESENCE}): when both accounts carry geo+time metadata it rewards ` +
            `distinct posting occasions co-located within ${COPRESENCE_RADIUS_M} m and ` +
            `${COPRESENCE_WINDOW_MS / 60000} min and the six behavioural weights renormalize to ` +
            `${1 - W_COPRESENCE}; when metadata is absent the signal is inapplicable and the six ` +
            "renormalize to 1.0 (no fabricated value). Accounts agglomerate into identities under a " +
            "complete-linkage guard.",
        // Effective weights for the APPLICABLE case (geo present): the six
        // behavioural weights scaled by (1 - W_COPRESENCE) plus co-presence, summing
        // to 1.0. When geo is absent the six renormalize back to 1.0 (see `method`).
        weights: {
            ...(Object.fromEntries(
                Object.entries(WEIGHTS).map(([k, v]) => [k, round(v * (1 - W_COPRESENCE))]),
            ) as Record<keyof typeof WEIGHTS, number>),
            coPresence: W_COPRESENCE,
        },
        thresholds: { edgeFloor: EDGE_FLOOR, merge: MERGE_THRESHOLD },
        nodes,
        edges: edges.sort((a, b) => b.score - a.score || a.source - b.source || a.target - b.target),
        identities: clusters,
    };
}
