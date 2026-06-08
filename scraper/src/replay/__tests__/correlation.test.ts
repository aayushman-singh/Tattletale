// Run with: npx tsx --test src/replay/__tests__/correlation.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { correlate, jaroWinkler } from "../correlation.js";
import type { GoldenPlatform } from "../types.js";

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

test("jaroWinkler: identical strings score 1, disjoint score low", () => {
    assert.equal(jaroWinkler("ana_rivera", "ana_rivera"), 1);
    assert.ok(jaroWinkler("ana_rivera", "ana_rivera_dev") > 0.8);
    assert.ok(jaroWinkler("ana_rivera", "zxqwklmnop") < 0.5);
});

test("two accounts with same handle/name/style/time merge into ONE identity", () => {
    const posts = (h: number) => [
        { id: "1", timestamp: `2024-11-02T0${h}:00:00Z`, caption: "shipping tiny tools and bad puns", likes: 1, comments: 0 },
        { id: "2", timestamp: `2024-11-03T0${h}:30:00Z`, caption: "it is always a missing await honestly", likes: 1, comments: 0 },
    ];
    const accounts = [
        acc({ platform: "instagram", username: "ana_dev", displayName: "Ana Dev", bio: "tiny tools coffee", posts: posts(8) }),
        acc({ platform: "x", username: "ana_dev", displayName: "Ana Dev", bio: "tiny tools coffee", posts: posts(8) }),
    ];
    const r = correlate(accounts);
    assert.equal(r.identities.length, 1, "should collapse to a single identity");
    assert.equal(r.identities[0].accountIndices.length, 2);
    assert.ok(r.edges.length === 1 && r.edges[0].score >= 0.55);
    // every edge carries an explainable feature breakdown
    assert.ok(r.edges[0].features.length === 6);
    assert.ok(r.edges[0].rationale.length > 0);
});

test("two clearly different people stay as separate identities", () => {
    const accounts = [
        acc({ platform: "instagram", username: "ana_rivera_dev", displayName: "Ana Rivera", bio: "python developer", posts: [
            { id: "1", timestamp: "2024-11-02T08:00:00Z", caption: "compilers and gardening today", likes: 1, comments: 0 },
        ] }),
        acc({ platform: "x", username: "xX_grindset_77", displayName: "Hustle Mindset", bio: "crypto motivation alpha", posts: [
            { id: "2", timestamp: "2024-11-02T23:00:00Z", caption: "GM kings wake up and grind the markets", likes: 1, comments: 0 },
        ] }),
    ];
    const r = correlate(accounts);
    assert.equal(r.identities.length, 2, "distinct people must not merge");
});

test("no posts => no false merge on name+handle alone (coverage gate)", () => {
    const accounts = [
        acc({ platform: "instagram", username: "ana_rivera", displayName: "Ana Rivera", bio: "", posts: [] }),
        acc({ platform: "x", username: "ana_rivera", displayName: "Ana Rivera", bio: "", posts: [] }),
    ];
    const r = correlate(accounts);
    // identical handle + name but ZERO behavioural evidence must NOT merge.
    assert.equal(r.identities.length, 2, "no behavioural evidence => must not merge");
});

test("singleton identity has cohesion null, not 1", () => {
    const r = correlate([acc({ username: "solo", displayName: "Solo", posts: [] })]);
    assert.equal(r.identities.length, 1);
    assert.equal(r.identities[0].cohesion, null);
});

test("input order does not change the result (canonicalized)", () => {
    const a1 = acc({ platform: "x", username: "ana", displayName: "Ana", bio: "tools", posts: [
        { id: "1", timestamp: "2024-11-02T20:00:00Z", caption: "tiny tools and bad puns", likes: 1, comments: 0 } ] });
    const a2 = acc({ platform: "instagram", username: "ana", displayName: "Ana", bio: "tools", posts: [
        { id: "2", timestamp: "2024-11-02T20:00:00Z", caption: "tiny tools and bad puns", likes: 1, comments: 0 } ] });
    const forward = JSON.stringify(correlate([a1, a2]));
    const reversed = JSON.stringify(correlate([a2, a1]));
    assert.equal(forward, reversed, "result must be independent of input order");
});

// Helper: build N posts at a fixed evening hour sharing a vocabulary, so two
// accounts using the same set correlate strongly.
const devPosts = (tag: string) => [
    { id: `${tag}1`, timestamp: "2024-11-02T20:00:00Z", caption: "shipping a tiny CLI tool tonight, missing await again", likes: 1, comments: 0 },
    { id: `${tag}2`, timestamp: "2024-11-05T21:00:00Z", caption: "the compiler caught the bug, ship small ship often", likes: 1, comments: 0 },
];

test("cluster invariant: every pair inside a merged identity is >= merge threshold", () => {
    const accounts = [
        acc({ platform: "instagram", username: "ana_rivera", displayName: "Ana Rivera", bio: "dev tools", posts: devPosts("ig") }),
        acc({ platform: "x", username: "ana_rivera", displayName: "Ana Rivera", bio: "dev tools", posts: devPosts("x") }),
        acc({ platform: "mastodon", username: "ana_rivera", displayName: "Ana Rivera", bio: "dev tools", posts: devPosts("ma") }),
        acc({ platform: "facebook", username: "ana_rivera", displayName: "Ana Rivera", bio: "cocina recetas", posts: [
            { id: "fb1", timestamp: "2024-11-02T12:00:00Z", caption: "hoy preparé una tortilla para la familia receta de la abuela", likes: 1, comments: 0 },
            { id: "fb2", timestamp: "2024-11-05T13:00:00Z", caption: "el secreto del sofrito es la paciencia fuego lento", likes: 1, comments: 0 } ] }),
    ];
    const r = correlate(accounts);
    const score = (a: number, b: number) => {
        const e = r.edges.find((x) => (x.source === a && x.target === b) || (x.source === b && x.target === a));
        return e ? e.score : 0;
    };
    // Complete-linkage contract: no merged cluster may hide a sub-merge-strength pair.
    for (const id of r.identities) {
        for (const a of id.accountIndices) {
            for (const b of id.accountIndices) {
                if (a < b) assert.ok(score(a, b) >= r.thresholds.merge, `pair ${a}-${b} below merge inside a cluster`);
            }
        }
    }
    // The Spanish-cooking namesake (same handle+name) must stay its own identity.
    const cook = r.identities.find((id) => id.accountIndices.some((i) => r.nodes[i].platform === "facebook"));
    assert.equal(cook?.accountIndices.length, 1, "namesake with different behaviour stays separate");
});

test("identical handle+name+bio but only 1 post each does NOT auto-merge (coverage gate)", () => {
    const one = (h: number) => [{ id: "p", timestamp: `2024-11-02T${h}:00:00Z`, caption: "hello world", likes: 0, comments: 0 }];
    const accounts = [
        acc({ platform: "instagram", username: "same_guy", displayName: "Same Guy", bio: "same bio here", posts: one(20) }),
        acc({ platform: "x", username: "same_guy", displayName: "Same Guy", bio: "same bio here", posts: one(20) }),
    ];
    const r = correlate(accounts);
    assert.equal(r.identities.length, 2, "one post each is too thin to auto-merge");
});

test("invalid timestamp fails loudly", () => {
    const accounts = [
        acc({ username: "a", posts: [{ id: "x", timestamp: "not-a-date", caption: "hi", likes: 0, comments: 0 }] }),
        acc({ username: "b", posts: [{ id: "y", timestamp: "2024-11-02T20:00:00Z", caption: "hi", likes: 0, comments: 0 }] }),
    ];
    assert.throws(() => correlate(accounts), /Invalid post timestamp/);
});

test("deterministic: same input => identical graph (incl. layout coords)", () => {
    const accounts = [
        acc({ platform: "instagram", username: "ana", displayName: "Ana", bio: "tools", posts: [
            { id: "1", timestamp: "2024-11-02T08:00:00Z", caption: "tiny tools", likes: 1, comments: 0 } ] }),
        acc({ platform: "x", username: "ana", displayName: "Ana", bio: "tools", posts: [
            { id: "2", timestamp: "2024-11-02T08:00:00Z", caption: "tiny tools", likes: 1, comments: 0 } ] }),
        acc({ platform: "mastodon", username: "someone_else", displayName: "Other Person", bio: "unrelated", posts: [
            { id: "3", timestamp: "2024-11-02T20:00:00Z", caption: "unrelated chatter", likes: 1, comments: 0 } ] }),
    ];
    const a = JSON.stringify(correlate(accounts));
    const b = JSON.stringify(correlate(accounts));
    assert.equal(a, b, "correlation output must be byte-identical across runs");
});
