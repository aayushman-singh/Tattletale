// Run with: npx tsx --test src/replay/__tests__/correlation.blocking.test.ts
//
// Blocking (scalability) tests. The engine must stay forensically correct once
// the O(n²) full-scoring is replaced by feature-blocked candidate generation
// above BLOCKING_MIN_ACCOUNTS (=64):
//   - EVIDENCE-BACKED RECALL: a true merge pair buried in a large set still merges.
//   - NAMESAKE: a same-handle/name pair with different behaviour stays separate.
//   - DETERMINISM: the same large input yields a byte-identical graph.
//   - PRUNING: blocking full-scores far fewer than n(n-1)/2 pairs, while still
//     making the cheap behavioural pass over every pair to avoid dropping
//     evidence-backed merge candidates at a bucket boundary.
import { test } from "node:test";
import assert from "node:assert/strict";
import { correlate, inspectCandidatePairs } from "../correlation.js";
import type { GoldenPlatform, GoldenPost } from "../types.js";

function acc(over: Partial<GoldenPlatform>): GoldenPlatform {
    return {
        platform: "x",
        username: "user",
        url: "https://x.com/user",
        displayName: "User",
        bio: "",
        verified: false,
        followers: 100,
        following: 100,
        postCount: 0,
        posts: [],
        ...over,
    };
}

// A deterministic high-entropy alpha token for seed `s`. Consecutive seeds map to
// dissimilar strings (few shared character n-grams), so distractors built from
// these share essentially no blocking key with one another — modelling a diverse
// real-world identity set rather than a templated one.
function alpha(s: number): string {
    let x = (s * 2654435761) % 0x7fffffff;
    let out = "";
    for (let i = 0; i < 9; i++) {
        out += String.fromCharCode(97 + (x % 26));
        x = Math.floor(x / 26) + (s + 1) * (i + 7) * 131;
    }
    return out;
}

// A distractor account `k`: a unique handle, name, bio and vocabulary so it
// shares no blocking key with any other distractor and cannot merge with one.
function distractor(k: number): GoldenPlatform {
    const w = (n: number) => alpha(k * 17 + n);
    const h1 = String(k % 24).padStart(2, "0");
    const h2 = String((k * 7 + 3) % 24).padStart(2, "0");
    const posts: GoldenPost[] = [
        { id: `d${k}a`, timestamp: `2024-11-02T${h1}:00:00Z`, caption: `${w(1)} ${w(2)} ${w(3)} ${w(4)}`, likes: 1, comments: 0 },
        { id: `d${k}b`, timestamp: `2024-11-03T${h2}:00:00Z`, caption: `${w(5)} ${w(6)} ${w(7)} ${w(8)}`, likes: 1, comments: 0 },
    ];
    return acc({
        platform: `plat${k % 5}`,
        username: `${alpha(k * 31 + 3)}_${alpha(k * 31 + 4)}`,
        displayName: `${alpha(k * 31 + 5)} ${alpha(k * 31 + 6)}`,
        bio: `${w(9)} ${w(10)} ${w(11)}`,
        posts,
    });
}

// A true cross-platform pair: same handle/name/style/vocabulary on two platforms,
// strong enough to merge under the brute-force engine.
const twinPosts = (tag: string): GoldenPost[] => [
    { id: `${tag}1`, timestamp: "2024-11-02T20:00:00Z", caption: "shipping a tiny CLI tool tonight, missing await again", likes: 1, comments: 0 },
    { id: `${tag}2`, timestamp: "2024-11-05T21:00:00Z", caption: "the compiler caught the bug, ship small ship often", likes: 1, comments: 0 },
];

function bigSetWithTruePair(nDistractors: number): GoldenPlatform[] {
    const set: GoldenPlatform[] = [];
    for (let k = 0; k < nDistractors; k++) set.push(distractor(k));
    set.push(acc({ platform: "instagram", username: "ana_rivera_twin", displayName: "Ana Rivera Twin", bio: "tiny dev tools coffee", posts: twinPosts("ig") }));
    set.push(acc({ platform: "x", username: "ana_rivera_twin", displayName: "Ana Rivera Twin", bio: "tiny dev tools coffee", posts: twinPosts("xx") }));
    return set;
}

test("blocking activates above the size threshold and prunes the vast majority of full-scored pairs", () => {
    const set = bigSetWithTruePair(200); // 202 accounts
    const { pairs, blocked, behavioralPairsEvaluated, fullScoredPairs } = inspectCandidatePairs(set);
    const n = set.length;
    const exhaustive = (n * (n - 1)) / 2;
    assert.equal(blocked, true, "202 accounts must trigger blocking");
    assert.equal(behavioralPairsEvaluated, exhaustive, "blocking still evaluates every behavioural pair");
    assert.equal(fullScoredPairs, pairs.length);
    assert.ok(
        fullScoredPairs < exhaustive * 0.1,
        `blocking should full-score <10% of ${exhaustive} pairs (full-scored ${fullScoredPairs})`,
    );
});

test("EVIDENCE-BACKED RECALL: a true merge-strength pair survives blocking and still merges", () => {
    const set = bigSetWithTruePair(200);
    const { accounts, pairs, blocked } = inspectCandidatePairs(set);
    assert.equal(blocked, true);

    // The two twins, located by their shared handle in the canonical order.
    const idxs = accounts
        .map((a, i) => ({ a, i }))
        .filter((x) => x.a.username === "ana_rivera_twin")
        .map((x) => x.i);
    assert.equal(idxs.length, 2, "both twins present");
    const [i, j] = [Math.min(...idxs), Math.max(...idxs)];

    // The true pair must be in the candidate set (not blocking-pruned).
    assert.ok(pairs.some(([a, b]) => a === i && b === j), "true pair must survive blocking");

    // ...and the engine must actually resolve them into one identity.
    const r = correlate(set);
    const cluster = r.identities.find((c) => c.accountIndices.includes(i));
    assert.ok(cluster?.accountIndices.includes(j), "true pair must merge into one identity under blocking");
    assert.equal(cluster?.accountIndices.length, 2, "exactly the two twins merge, nothing dragged in");
});

test("EVIDENCE-BACKED RECALL: a continuous-similarity true pair with no exact blocking key survives", () => {
    const set: GoldenPlatform[] = [];
    for (let k = 0; k < 70; k++) set.push(distractor(k));
    set.push(acc({ platform: "aa", username: "ab", displayName: "de", bio: "", posts: [
        { id: "a1", timestamp: "2024-01-01T10:00:00Z", caption: "aaaa bbbb cccc dddd", likes: 1, comments: 0 },
        { id: "a2", timestamp: "2024-01-02T10:00:00Z", caption: "eeee ffff gggg hhhh", likes: 1, comments: 0 },
    ] }));
    set.push(acc({ platform: "bb", username: "ac", displayName: "df", bio: "", posts: [
        { id: "b1", timestamp: "2024-01-01T10:00:00Z", caption: "iii jj kkk llll", likes: 1, comments: 0 },
        { id: "b2", timestamp: "2024-01-02T10:00:00Z", caption: "mmmm nnnn oooo pppp", likes: 1, comments: 0 },
    ] }));

    const exhaustive = correlate(set, { blockingMinAccounts: Infinity });
    const { accounts, pairs, blocked } = inspectCandidatePairs(set);
    assert.equal(blocked, true);

    const idxs = accounts
        .map((a, i) => ({ a, i }))
        .filter((x) => x.a.username === "ab" || x.a.username === "ac")
        .map((x) => x.i);
    assert.equal(idxs.length, 2);
    const [i, j] = [Math.min(...idxs), Math.max(...idxs)];

    const exhaustiveCluster = exhaustive.identities.find((c) => c.accountIndices.includes(i));
    assert.ok(exhaustiveCluster?.accountIndices.includes(j), "fixture must merge under exhaustive scoring");
    assert.ok(pairs.some(([a, b]) => a === i && b === j), "blocking must not prune a continuous merge-strength pair");

    const blockedResult = correlate(set);
    const blockedCluster = blockedResult.identities.find((c) => c.accountIndices.includes(i));
    assert.ok(blockedCluster?.accountIndices.includes(j), "blocked scoring must preserve the exhaustive merge");
});

test("NAMESAKE: same handle+name but different behaviour stays separate under blocking", () => {
    const set: GoldenPlatform[] = [];
    for (let k = 0; k < 200; k++) set.push(distractor(k));
    // Same handle + name (a namesake trap), different behaviour: a dev vs a cook.
    set.push(acc({ platform: "instagram", username: "sam_rivera", displayName: "Sam Rivera", bio: "rust compilers tooling", posts: [
        { id: "dev1", timestamp: "2024-11-02T20:00:00Z", caption: "shipping a tiny CLI tool tonight, missing await again", likes: 1, comments: 0 },
        { id: "dev2", timestamp: "2024-11-05T21:00:00Z", caption: "the compiler caught the bug, ship small ship often", likes: 1, comments: 0 } ] }));
    set.push(acc({ platform: "facebook", username: "sam_rivera", displayName: "Sam Rivera", bio: "cocina recetas familia", posts: [
        { id: "cook1", timestamp: "2024-11-02T12:00:00Z", caption: "hoy preparé una tortilla para la familia receta de la abuela", likes: 1, comments: 0 },
        { id: "cook2", timestamp: "2024-11-05T13:00:00Z", caption: "el secreto del sofrito es la paciencia fuego lento", likes: 1, comments: 0 } ] }));

    const r = correlate(set);
    const { accounts } = inspectCandidatePairs(set);
    const idxs = accounts.map((a, i) => ({ a, i })).filter((x) => x.a.username === "sam_rivera").map((x) => x.i);
    const clustersOf = new Set(idxs.map((i) => r.identities.findIndex((c) => c.accountIndices.includes(i))));
    assert.equal(clustersOf.size, 2, "the namesake pair must NOT be merged by blocking");
});

test("DETERMINISM: same large input => byte-identical correlation graph", () => {
    const set = bigSetWithTruePair(200);
    const a = JSON.stringify(correlate(set));
    const b = JSON.stringify(correlate(set));
    assert.equal(a, b, "blocked correlation must be reproducible byte-for-byte");
});

test("DETERMINISM: input order does not change the blocked result", () => {
    const set = bigSetWithTruePair(120);
    const reversed = [...set].reverse();
    assert.equal(JSON.stringify(correlate(set)), JSON.stringify(correlate(reversed)), "blocked result must be order-independent");
});

test("at/below the threshold the engine is exhaustive (no blocking)", () => {
    const small: GoldenPlatform[] = [];
    for (let k = 0; k < 10; k++) small.push(distractor(k));
    const { pairs, blocked } = inspectCandidatePairs(small);
    assert.equal(blocked, false);
    assert.equal(pairs.length, (10 * 9) / 2, "small inputs score every pair exhaustively");
});
