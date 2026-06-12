// Correlation scalability benchmark — measures the blocking win.
//
// Run with: npx tsx src/replay/bench/correlationBench.ts [sizes...]
//   e.g.    npx tsx src/replay/bench/correlationBench.ts 200 500 1000 2000
//
// For each size it builds a deterministic synthetic identity set (many unrelated
// distractors plus a handful of planted true cross-platform pairs), then times
// the engine BRUTE-FORCE (every pair full-scored, blockingMinAccounts=Infinity) vs
// BLOCKED (default threshold). It prints the cheap behavioural pair evaluations,
// the full-scored/co-presence pair count, and wall-time for both. It asserts that
// every planted true pair survives under BOTH modes (a smoke recall check for the
// known positives, not a claim that the whole synthetic universe has no incidental
// high-scoring pairs).
//
// Pure synthetic data, no clock/network inside the engine — only the benchmark
// harness reads the wall clock, which is fine: it measures, it does not feed the
// engine. Determinism of the engine itself is covered by the test suite.

import { correlate, inspectCandidatePairs } from "../correlation.js";
import type { GoldenPlatform, GoldenPost } from "../types.js";

function alpha(s: number): string {
    let x = (s * 2654435761) % 0x7fffffff;
    let out = "";
    for (let i = 0; i < 9; i++) {
        out += String.fromCharCode(97 + (x % 26));
        x = Math.floor(x / 26) + (s + 1) * (i + 7) * 131;
    }
    return out;
}

function acc(over: Partial<GoldenPlatform>): GoldenPlatform {
    return {
        platform: "x", username: "user", url: "", displayName: "User", bio: "",
        verified: false, followers: 100, following: 100, postCount: 0, posts: [], ...over,
    };
}

// Each account carries fine-grained geo (capture-grade), so the engine's O(posts²)
// co-presence scan is APPLICABLE on every full-scored pair — this is the cost
// blocking defers for the pruned majority. Distractors sit at distinct fine
// locations and varied hours; incidental high behavioural scores are allowed, and
// the benchmark checks only the planted known-positive recall property.
function distractor(k: number): GoldenPlatform {
    const w = (n: number) => alpha(k * 17 + n);
    const h1 = String(k % 24).padStart(2, "0");
    const h2 = String((k * 7 + 3) % 24).padStart(2, "0");
    const lat = -60 + ((k * 137.5) % 120);
    const lon = -170 + ((k * 89.3) % 340);
    const geo = { lat, lon, accuracyM: 20 };
    const posts: GoldenPost[] = [
        { id: `d${k}a`, timestamp: `2024-11-02T${h1}:00:00Z`, caption: `${w(1)} ${w(2)} ${w(3)} ${w(4)}`, likes: 1, comments: 0, geo },
        { id: `d${k}b`, timestamp: `2024-11-03T${h2}:00:00Z`, caption: `${w(5)} ${w(6)} ${w(7)} ${w(8)}`, likes: 1, comments: 0, geo },
    ];
    return acc({
        platform: `plat${k % 6}`,
        username: `${alpha(k * 31 + 3)}_${alpha(k * 31 + 4)}`,
        displayName: `${alpha(k * 31 + 5)} ${alpha(k * 31 + 6)}`,
        bio: `${w(9)} ${w(10)} ${w(11)}`,
        posts,
    });
}

// A planted true pair p: same handle/name/style/vocab on two platforms, co-located
// at the same fine spot at the same times (a genuine shared-operator signal).
function truePair(p: number): GoldenPlatform[] {
    const geo = { lat: 19.076, lon: 72.8777, accuracyM: 20 };
    const near = { lat: 19.0768, lon: 72.8779, accuracyM: 20 };
    const posts = (tag: string, g: { lat: number; lon: number; accuracyM: number }): GoldenPost[] => [
        { id: `${tag}1`, timestamp: "2024-11-02T20:00:00Z", caption: "shipping a tiny CLI tool tonight, missing await again", likes: 1, comments: 0, geo: g },
        { id: `${tag}2`, timestamp: "2024-11-05T21:00:00Z", caption: "the compiler caught the bug, ship small ship often", likes: 1, comments: 0, geo: g },
    ];
    const handle = `planted_twin_${p}`;
    const name = `Planted Twin ${p}`;
    return [
        acc({ platform: "instagram", username: handle, displayName: name, bio: "tiny dev tools coffee", posts: posts(`a${p}`, geo) }),
        acc({ platform: "x", username: handle, displayName: name, bio: "tiny dev tools coffee", posts: posts(`b${p}`, near) }),
    ];
}

interface BenchSet {
    accounts: GoldenPlatform[];
    plantedHandles: string[];
}

function buildSet(n: number): BenchSet {
    const plantedPairs = Math.max(1, Math.floor(n / 100));
    const set: GoldenPlatform[] = [];
    const plantedHandles: string[] = [];
    for (let p = 0; p < plantedPairs; p++) {
        set.push(...truePair(p));
        plantedHandles.push(`planted_twin_${p}`);
    }
    for (let k = 0; set.length < n; k++) set.push(distractor(k));
    return { accounts: set, plantedHandles };
}

function timeIt(fn: () => void, reps: number): number {
    // one warm-up
    fn();
    const start = process.hrtime.bigint();
    for (let i = 0; i < reps; i++) fn();
    const end = process.hrtime.bigint();
    return Number(end - start) / 1e6 / reps; // ms per run
}

function canonicalize(input: GoldenPlatform[]): GoldenPlatform[] {
    return [...input].sort((a, b) => {
        const ka = `${a.platform} ${a.username}`;
        const kb = `${b.platform} ${b.username}`;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
}

function plantedRecovered(input: GoldenPlatform[], plantedHandles: string[], opts = {}): number {
    const accounts = canonicalize(input);
    const r = correlate(input, opts);
    let recovered = 0;
    for (const handle of plantedHandles) {
        const idxs = accounts
            .map((a, i) => ({ a, i }))
            .filter((x) => x.a.username === handle)
            .map((x) => x.i);
        if (idxs.length !== 2) throw new Error(`Bad benchmark fixture: expected exactly two ${handle}.`);
        const cluster = r.identities.find((c) => c.accountIndices.includes(idxs[0]));
        if (cluster?.accountIndices.includes(idxs[1])) recovered++;
    }
    return recovered;
}

const sizes = (process.argv.slice(2).map(Number).filter((x) => x > 0));
const SIZES = sizes.length ? sizes : [200, 500, 1000, 2000];

console.log("Correlation blocking benchmark (diverse synthetic identity sets)\n");
console.log(
    "n".padStart(6),
    "exhaustivePairs".padStart(16),
    "behaviouralPairs".padStart(18),
    "fullScoredPairs".padStart(16),
    "fullPrune%".padStart(11),
    "bruteMs".padStart(10),
    "blockedMs".padStart(11),
    "speedup".padStart(9),
    "planted✓".padStart(10),
);

for (const n of SIZES) {
    const { accounts: set, plantedHandles } = buildSet(n);
    const exhaustive = (n * (n - 1)) / 2;
    const inspection = inspectCandidatePairs(set);
    const behavioralPairs = inspection.behavioralPairsEvaluated;
    const fullScoredPairs = inspection.fullScoredPairs;
    const reps = n <= 500 ? 5 : n <= 1000 ? 3 : 1;
    const bruteMs = timeIt(() => correlate(set, { blockingMinAccounts: Infinity }), reps);
    const blockedMs = timeIt(() => correlate(set), reps);

    // Recall smoke check: every planted pair must survive in both modes.
    const bruteRecovered = plantedRecovered(set, plantedHandles, { blockingMinAccounts: Infinity });
    const blockedRecovered = plantedRecovered(set, plantedHandles);
    const ok = bruteRecovered === plantedHandles.length && blockedRecovered === plantedHandles.length;

    console.log(
        String(n).padStart(6),
        String(exhaustive).padStart(16),
        String(behavioralPairs).padStart(18),
        String(fullScoredPairs).padStart(16),
        `${(100 * (1 - fullScoredPairs / exhaustive)).toFixed(2)}%`.padStart(11),
        bruteMs.toFixed(1).padStart(10),
        blockedMs.toFixed(1).padStart(11),
        `${(bruteMs / blockedMs).toFixed(1)}x`.padStart(9),
        `${ok ? "✓" : "✗"}${blockedRecovered}/${plantedHandles.length}`.padStart(10),
    );
    if (!ok) {
        console.error(
            `\nPLANTED RECALL MISMATCH at n=${n}: brute=${bruteRecovered}/${plantedHandles.length} blocked=${blockedRecovered}/${plantedHandles.length}`,
        );
        process.exit(1);
    }
}
