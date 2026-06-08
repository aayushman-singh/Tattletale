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

test("complete-linkage guard blocks transitive over-merge", () => {
    // A~B strong, B~C strong, but A and C share nothing (different language,
    // different times, different handles). A and C must NOT end up in one cluster.
    const A = acc({ platform: "instagram", username: "alex_dev", displayName: "Alex", bio: "dev",
        posts: [{ id: "a", timestamp: "2024-11-02T20:00:00Z", caption: "shipping a tiny CLI tool tonight", likes: 1, comments: 0 }] });
    const B = acc({ platform: "x", username: "alex_dev", displayName: "Alex", bio: "dev",
        posts: [{ id: "b", timestamp: "2024-11-02T20:00:00Z", caption: "shipping a tiny CLI tool tonight", likes: 1, comments: 0 }] });
    const C = acc({ platform: "facebook", username: "zoltan_kovacs", displayName: "Zoltán Kovács", bio: "főzés",
        posts: [{ id: "c", timestamp: "2024-11-02T08:00:00Z", caption: "máma főztem egy jó gulyást a családnak", likes: 1, comments: 0 }] });
    const r = correlate([A, B, C]);
    const clusterIdOf = (u: string): number => {
        const id = r.identities.find((c) => c.accountIndices.some((i) => r.nodes[i].username === u));
        if (!id) throw new Error(`no cluster for ${u}`);
        return id.id;
    };
    assert.notEqual(clusterIdOf("alex_dev"), clusterIdOf("zoltan_kovacs"), "A/B must not drag in C");
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
