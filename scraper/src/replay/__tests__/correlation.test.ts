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

test("empty captions and timing alone do not turn a namesake into a merge", () => {
    const posts = (tag: string) => [
        { id: `${tag}1`, timestamp: "2024-11-02T20:00:00Z", caption: "", likes: 0, comments: 0 },
        { id: `${tag}2`, timestamp: "2024-11-05T20:00:00Z", caption: "", likes: 0, comments: 0 },
    ];
    const accounts = [
        acc({ platform: "instagram", username: "sam_rivera", displayName: "Sam Rivera", bio: "", posts: posts("ig") }),
        acc({ platform: "x", username: "sam_rivera", displayName: "Sam Rivera", bio: "", posts: posts("x") }),
    ];

    const r = correlate(accounts);

    assert.equal(r.identities.length, 2, "post count plus timing is not content-bearing behavioural evidence");
});

test("generic shared bio and timing do not turn a namesake into a merge", () => {
    const posts = (tag: string) => [
        { id: `${tag}1`, timestamp: "2024-11-02T20:00:00Z", caption: "", likes: 0, comments: 0 },
        { id: `${tag}2`, timestamp: "2024-11-05T20:00:00Z", caption: "", likes: 0, comments: 0 },
    ];
    const accounts = [
        acc({ platform: "instagram", username: "sam_rivera", displayName: "Sam Rivera", bio: "official profile", posts: posts("ig") }),
        acc({ platform: "x", username: "sam_rivera", displayName: "Sam Rivera", bio: "official profile", posts: posts("x") }),
    ];

    const r = correlate(accounts);

    assert.equal(r.identities.length, 2, "generic bio overlap plus timing is not enough to merge namesakes");
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

test("duplicate platform+username inputs fail loudly instead of inheriting input order", () => {
    const first = acc({ platform: "x", username: "dupe", displayName: "First", posts: [
        { id: "a", timestamp: "2024-11-02T08:00:00Z", caption: "first account words", likes: 1, comments: 0 } ] });
    const second = acc({ platform: "x", username: "dupe", displayName: "Second", posts: [
        { id: "b", timestamp: "2024-11-02T20:00:00Z", caption: "second account words", likes: 1, comments: 0 } ] });

    assert.throws(() => correlate([first, second]), /Duplicate platform\/username/);
});

test("duplicate post ids inside an account fail loudly", () => {
    const account = acc({ platform: "x", username: "ana", posts: [
        { id: "dup", timestamp: "2024-11-02T08:00:00Z", caption: "first words here", likes: 1, comments: 0 },
        { id: "dup", timestamp: "2024-11-03T08:00:00Z", caption: "second words here", likes: 1, comments: 0 } ] });

    assert.throws(() => correlate([account]), /Duplicate post id/);
});

// ---------- 7th signal: temporal-geospatial co-presence ----------

// All capture-grade points declare a fine accuracy — a point that states no
// accuracy is no longer treated as a perfect fix (see the no-accuracy test).
const GEO = { lat: 19.076, lon: 72.8777, accuracyM: 25 }; // one fine spot (Mumbai, ~building scale)
const NEAR = { lat: 19.0768, lon: 72.8779, accuracyM: 25 }; // ~95 m away — same place, within 250 m
const FAR = { lat: 19.12, lon: 72.93, accuracyM: 25 }; // ~7 km away — fine fix, but a different part of the CITY

// Same handle/name/style/vocab pair so they already link; behavioural evidence
// is held identical between the geo and geo-less variants so any score delta is
// attributable to co-presence alone.
const twin = (tag: string, geo?: { lat: number; lon: number }, hourShift = 0) => [
    { id: `${tag}1`, timestamp: `2024-11-02T${20 + hourShift}:00:00Z`, caption: "shipping a tiny CLI tool tonight, missing await again", likes: 1, comments: 0, ...(geo ? { geo } : {}) },
    { id: `${tag}2`, timestamp: `2024-11-05T${21 + hourShift}:00:00Z`, caption: "the compiler caught the bug, ship small ship often", likes: 1, comments: 0, ...(geo ? { geo } : {}) },
    { id: `${tag}3`, timestamp: `2024-11-07T${20 + hourShift}:30:00Z`, caption: "refactored the parser, fewer nodes same behaviour", likes: 1, comments: 0, ...(geo ? { geo } : {}) },
];

const edgeOf = (r: ReturnType<typeof correlate>, a = 0, b = 1) =>
    r.edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));

test("co-presence raises the link score above the identical geo-less pair", () => {
    // Distinct handles keep the geo-less base below 1.0 so the overlay has headroom;
    // every other signal is held identical between the two variants.
    const geoless = correlate([
        acc({ platform: "instagram", username: "ana_dev_ig", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig") }),
        acc({ platform: "x", username: "ana_dev_x", displayName: "Ana Dev", bio: "dev tools", posts: twin("x") }),
    ]);
    const copresent = correlate([
        acc({ platform: "instagram", username: "ana_dev_ig", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig", GEO) }),
        acc({ platform: "x", username: "ana_dev_x", displayName: "Ana Dev", bio: "dev tools", posts: twin("x", NEAR) }),
    ]);
    const before = edgeOf(geoless)!;
    const after = edgeOf(copresent)!;
    assert.ok(after.score > before.score, `co-presence must raise score (${before.score} -> ${after.score})`);
    const cp = after.features.find((f) => f.feature === "coPresence");
    assert.ok(cp, "the co-presence feature must be present and inspectable");
    assert.equal(cp!.value, 1, "three co-located occasions saturate the signal");
    assert.equal(cp!.weight, 0.1, "co-presence carries a transparent fixed weight");
    assert.equal(before.features.length, 6, "geo-less pair has only the six behavioural signals");
    assert.equal(after.features.length, 7, "the geo pair gains the seventh signal");
});

test("co-presence raises cohesion for a true co-present identity", () => {
    const r = correlate([
        acc({ platform: "instagram", username: "ana_dev_ig", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig", GEO) }),
        acc({ platform: "x", username: "ana_dev_x", displayName: "Ana Dev", bio: "dev tools", posts: twin("x", NEAR) }),
    ]);
    const geoless = correlate([
        acc({ platform: "instagram", username: "ana_dev_ig", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig") }),
        acc({ platform: "x", username: "ana_dev_x", displayName: "Ana Dev", bio: "dev tools", posts: twin("x") }),
    ]);
    assert.equal(r.identities.length, 1, "the true co-present pair resolves to one identity");
    assert.ok((r.identities[0].cohesion ?? 0) > (geoless.identities[0].cohesion ?? 0), "cohesion must rise");
});

test("a coarse shared city does NOT merge a behavioural namesake", () => {
    // Same handle + name (a namesake trap) but DIFFERENT behaviour (dev vs cook),
    // each geo-tagged 7 km apart in the same city. Geo must not collapse them.
    const r = correlate([
        acc({ platform: "instagram", username: "ana_rivera", displayName: "Ana Rivera", bio: "dev tools", posts: twin("ig", GEO) }),
        acc({ platform: "facebook", username: "ana_rivera", displayName: "Ana Rivera", bio: "cocina recetas", posts: [
            { id: "fb1", timestamp: "2024-11-02T12:00:00Z", caption: "hoy preparé una tortilla para la familia receta de la abuela", likes: 1, comments: 0, geo: FAR },
            { id: "fb2", timestamp: "2024-11-05T13:00:00Z", caption: "el secreto del sofrito es la paciencia fuego lento", likes: 1, comments: 0, geo: FAR },
            { id: "fb3", timestamp: "2024-11-07T12:30:00Z", caption: "domingo de paella para toda la familia", likes: 1, comments: 0, geo: FAR } ] }),
    ]);
    assert.equal(r.identities.length, 2, "a shared city must not collapse two distinct people");
    const cp = edgeOf(r)?.features.find((f) => f.feature === "coPresence");
    // Geo present but never within 250 m AND 30 min => measured zero, not imputed.
    assert.ok(cp, "co-presence is applicable (both geo-tagged) and reported");
    assert.equal(cp!.value, 0, "a coarse city share yields zero co-presence");
});

test("missing geo on one side => co-presence inapplicable (neutral, six signals)", () => {
    const withGeoOneSide = correlate([
        acc({ platform: "instagram", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig", GEO) }),
        acc({ platform: "x", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("x") }), // no geo
    ]);
    const geoless = correlate([
        acc({ platform: "instagram", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig") }),
        acc({ platform: "x", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("x") }),
    ]);
    const e = edgeOf(withGeoOneSide)!;
    assert.equal(e.features.length, 6, "one-sided geo is inapplicable — no co-presence feature");
    assert.ok(!e.features.some((f) => f.feature === "coPresence"));
    // Inapplicable must be byte-identical to the geo-less score — true neutrality.
    assert.equal(e.score, edgeOf(geoless)!.score, "missing metadata changes nothing, never fabricates");
});

test("geo-tagged but never co-located scores zero with an honest evidence-against label", () => {
    // Same place, but always 6 hours apart => never co-present in time.
    const r = correlate([
        acc({ platform: "instagram", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig", GEO, 0) }),
        acc({ platform: "x", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("x", GEO, -6) }),
    ]);
    const cp = edgeOf(r)?.features.find((f) => f.feature === "coPresence");
    assert.ok(cp, "co-presence is applicable");
    assert.equal(cp!.value, 0, "same place, different times => not co-present");
    assert.match(cp!.label, /never co-located/);
});

test("malformed geo fails loudly", () => {
    const accounts = [
        acc({ username: "a", posts: [{ id: "x", timestamp: "2024-11-02T20:00:00Z", caption: "hi there", likes: 0, comments: 0, geo: { lat: 200, lon: 0 } }] }),
        acc({ username: "b", posts: [{ id: "y", timestamp: "2024-11-02T20:10:00Z", caption: "hi there", likes: 0, comments: 0, geo: GEO }] }),
    ];
    assert.throws(() => correlate(accounts), /Invalid geo/);
});

test("co-presence is deterministic across runs", () => {
    const build = () => [
        acc({ platform: "instagram", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig", GEO) }),
        acc({ platform: "x", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("x", NEAR) }),
    ];
    assert.equal(JSON.stringify(correlate(build())), JSON.stringify(correlate(build())));
});

test("coarse-accuracy points are not an instrument: inapplicable, not a zero", () => {
    // Identical coordinates, but each point declares a 5 km accuracy radius — a
    // city/venue centroid, not a capture fix. It is not a co-presence instrument,
    // so the signal is INAPPLICABLE (renormalized out), byte-identical to geo-less —
    // a coarse-only account is never punished with a zero-valued co-presence.
    const coarse = { lat: 19.076, lon: 72.8777, accuracyM: 5000 };
    const coarseRun = correlate([
        acc({ platform: "instagram", username: "ana_x", displayName: "Ana X", bio: "dev tools", posts: twin("ig", coarse) }),
        acc({ platform: "x", username: "ana_y", displayName: "Ana Y", bio: "dev tools", posts: twin("x", coarse) }),
    ]);
    const geoless = correlate([
        acc({ platform: "instagram", username: "ana_x", displayName: "Ana X", bio: "dev tools", posts: twin("ig") }),
        acc({ platform: "x", username: "ana_y", displayName: "Ana Y", bio: "dev tools", posts: twin("x") }),
    ]);
    const e = edgeOf(coarseRun)!;
    assert.ok(!e.features.some((f) => f.feature === "coPresence"), "coarse-only is inapplicable");
    assert.equal(e.features.length, 6);
    assert.equal(e.score, edgeOf(geoless)!.score, "coarse-only must be byte-identical to geo-less");
});

test("a point with no stated accuracy is not an instrument: inapplicable, not a perfect fix", () => {
    // Fine-looking coordinates, but NO accuracyM declared. Unknown precision must
    // never be assumed perfect — certifying ≤250 m co-presence from an unqualified
    // coordinate would fabricate precision. So it is dropped (like a coarse point):
    // the signal is INAPPLICABLE and the score is byte-identical to geo-less.
    const noAcc = { lat: 19.076, lon: 72.8777 }; // same fine spot, but precision UNSTATED
    const run = correlate([
        acc({ platform: "instagram", username: "ana_n", displayName: "Ana N", bio: "dev tools", posts: twin("ig", noAcc) }),
        acc({ platform: "x", username: "ana_m", displayName: "Ana M", bio: "dev tools", posts: twin("x", noAcc) }),
    ]);
    const geoless = correlate([
        acc({ platform: "instagram", username: "ana_n", displayName: "Ana N", bio: "dev tools", posts: twin("ig") }),
        acc({ platform: "x", username: "ana_m", displayName: "Ana M", bio: "dev tools", posts: twin("x") }),
    ]);
    const e = edgeOf(run)!;
    assert.ok(!e.features.some((f) => f.feature === "coPresence"), "no-accuracy points are inapplicable");
    assert.equal(e.features.length, 6);
    assert.equal(e.score, edgeOf(geoless)!.score, "unstated accuracy must be byte-identical to geo-less");
});

test("co-presence cannot manufacture a merge from weak behaviour (geo never decides identity)", () => {
    // Two behaviourally DIFFERENT people (a dev and a Spanish cook, different
    // handles) who happen to repeatedly post from the same fine spot at the same
    // time. Co-presence saturates, but behaviour is far below merge — they MUST
    // stay separate: geo can raise the score, never collapse the identities.
    const r = correlate([
        acc({ platform: "instagram", username: "dev_guy", displayName: "Dev Guy", bio: "rust compilers", posts: [
            { id: "d1", timestamp: "2024-11-02T20:00:00Z", caption: "shipping a tiny CLI tool tonight, missing await again", likes: 1, comments: 0, geo: GEO },
            { id: "d2", timestamp: "2024-11-05T21:00:00Z", caption: "the compiler caught the bug, ship small ship often", likes: 1, comments: 0, geo: GEO },
            { id: "d3", timestamp: "2024-11-07T20:30:00Z", caption: "refactored the parser, fewer nodes same behaviour", likes: 1, comments: 0, geo: GEO } ] }),
        acc({ platform: "facebook", username: "cocina_abuela", displayName: "Cocina Abuela", bio: "cocina recetas", posts: [
            { id: "c1", timestamp: "2024-11-02T20:10:00Z", caption: "hoy preparé una tortilla para la familia receta de la abuela", likes: 1, comments: 0, geo: NEAR },
            { id: "c2", timestamp: "2024-11-05T21:05:00Z", caption: "el secreto del sofrito es la paciencia fuego lento", likes: 1, comments: 0, geo: NEAR },
            { id: "c3", timestamp: "2024-11-07T20:25:00Z", caption: "domingo de paella para toda la familia", likes: 1, comments: 0, geo: NEAR } ] }),
    ]);
    assert.equal(r.identities.length, 2, "strong co-presence must NOT merge behaviourally-distinct people");
    const cp = edgeOf(r)?.features.find((f) => f.feature === "coPresence");
    assert.ok((cp?.value ?? 0) > 0, "co-presence is genuinely high here — the guard, not absence, keeps them apart");
});

test("a burst of duplicate posts cannot saturate co-presence (one-to-one matching)", () => {
    // Account A spams five posts at the same place/time; account B has ONE post
    // there. Only one occasion can be matched — volume cannot inflate the signal.
    const burst = Array.from({ length: 5 }, (_, k) => ({
        id: `a${k}`, timestamp: "2024-11-02T20:00:00Z", caption: "same place same time spam post", likes: 0, comments: 0, geo: GEO,
    }));
    const r = correlate([
        acc({ platform: "instagram", username: "spammer", displayName: "S", bio: "x", posts: burst }),
        acc({ platform: "x", username: "spammer", displayName: "S", bio: "x", posts: [
            { id: "b0", timestamp: "2024-11-02T20:05:00Z", caption: "same place same time spam post", likes: 0, comments: 0, geo: NEAR },
            { id: "b1", timestamp: "2024-11-09T09:00:00Z", caption: "unrelated later post elsewhere entirely", likes: 0, comments: 0, geo: { lat: 28.61, lon: 77.20, accuracyM: 25 } } ] }),
    ]);
    const cp = edgeOf(r)?.features.find((f) => f.feature === "coPresence");
    assert.ok(cp, "applicable");
    assert.ok(cp!.value <= 1 / 3 + 1e-9, `one shared occasion only, not saturated (got ${cp!.value})`);
});

test("a same-instant burst on BOTH sides is one occasion, not many", () => {
    // Both accounts emit three posts at the same place and the same minute. That is
    // a single co-presence event, not three — distinct temporal occasions, not post
    // pairs, are what count.
    const burst = (tag: string, geo: { lat: number; lon: number }) => Array.from({ length: 3 }, (_, k) => ({
        id: `${tag}${k}`, timestamp: "2024-11-02T20:00:00Z", caption: "same place same minute post here", likes: 0, comments: 0, geo,
    }));
    const r = correlate([
        acc({ platform: "instagram", username: "twin_a", displayName: "Twin", bio: "x", posts: burst("a", GEO) }),
        acc({ platform: "x", username: "twin_b", displayName: "Twin", bio: "x", posts: burst("b", NEAR) }),
    ]);
    const cp = edgeOf(r)?.features.find((f) => f.feature === "coPresence");
    assert.ok(cp, "applicable");
    assert.equal(cp!.value, 0.333, `one occasion only (1/3, got ${cp!.value})`);
});

test("co-presence is symmetric under account permutation", () => {
    const a = acc({ platform: "instagram", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("ig", GEO) });
    const b = acc({ platform: "x", username: "ana_dev", displayName: "Ana Dev", bio: "dev tools", posts: twin("x", NEAR) });
    const cpOf = (r: ReturnType<typeof correlate>) => edgeOf(r)?.features.find((f) => f.feature === "coPresence")?.value;
    assert.equal(cpOf(correlate([a, b])), cpOf(correlate([b, a])), "co-presence value must not depend on input order");
});

test("a timezone-less timestamp on a geo post fails loudly", () => {
    const accounts = [
        acc({ platform: "instagram", username: "a", displayName: "A", bio: "x", posts: [
            { id: "p1", timestamp: "2024-11-02T20:00:00", caption: "no timezone here", likes: 0, comments: 0, geo: GEO },
            { id: "p2", timestamp: "2024-11-03T20:00:00", caption: "no timezone here either", likes: 0, comments: 0, geo: GEO } ] }),
        acc({ platform: "x", username: "b", displayName: "B", bio: "x", posts: [
            { id: "q1", timestamp: "2024-11-02T20:05:00Z", caption: "fine", likes: 0, comments: 0, geo: NEAR },
            { id: "q2", timestamp: "2024-11-03T20:05:00Z", caption: "fine too", likes: 0, comments: 0, geo: NEAR } ] }),
    ];
    assert.throws(() => correlate(accounts), /require ISO-8601 with a timezone/);
});
