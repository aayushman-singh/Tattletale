// Run with: npx tsx --test src/replay/__tests__/brief.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    composeExtractive,
    extractBriefFacts,
    generateBrief,
    validateBrief,
} from "../brief.js";
import type { BriefFacts } from "../types.js";

const FACTS: BriefFacts = {
    handle: "ana_rivera_dev",
    displayName: "Ana Rivera",
    platformCount: 3,
    platforms: ["instagram", "x", "mastodon"],
    totalFollowers: 15281,
    totalPosts: 11,
    identityCount: 1,
    primaryIdentityAccounts: 3,
    primaryCohesionBand: "high",
    flaggedNamesakes: 0,
    peakHourUtc: 20,
    activityWindow: "evening",
    languages: ["English"],
    topTags: ["developer", "open-source"],
    firstSeen: "2021-03-14",
    contactCount: 9,
    crossPlatformContacts: 3,
};

test("extractive brief round-trips through its own validator", () => {
    const text = composeExtractive(FACTS);
    assert.doesNotThrow(() => validateBrief(text, FACTS));
    assert.match(text, /Ana Rivera/);
    assert.match(text, /15,281 followers/);
    assert.match(text, /high cohesion/);
});

test("validator rejects a hallucinated PLACE not in the facts", () => {
    // The classic failure: model invents a city.
    assert.throws(
        () => validateBrief("Ana Rivera appears to be based in Mumbai.", FACTS),
        /Mumbai/,
    );
});

test("validator rejects a hallucinated PERSON not in the facts", () => {
    assert.throws(
        () => validateBrief("Ana Rivera frequently contacts Boris.", FACTS),
        /Boris/,
    );
});

test("validator rejects a fabricated NUMBER not in the facts", () => {
    assert.throws(
        () => validateBrief("Ana Rivera is 25 years old.", FACTS),
        /25/,
    );
});

test("validator accepts only fact-derived names and numbers", () => {
    const ok = "Ana Rivera operates 3 accounts across instagram and is active in the evening.";
    assert.doesNotThrow(() => validateBrief(ok, FACTS));
});

test("extractBriefFacts derives identity + namesake + language facts", () => {
    const report = {
        target: { handle: "t", displayName: "Test Person", summary: "", firstSeen: "2020-01-02", tags: ["x", "y"] },
        findings: [
            { platform: "instagram", username: "t", url: "", displayName: "Test Person", bio: "", verified: false,
              metrics: { followers: 100, following: 1, posts: 2 },
              samplePosts: [
                { id: "1", timestamp: "2024-11-02T20:00:00Z", caption: "hello world tonight", likes: 0, comments: 0 },
                { id: "1b", timestamp: "2024-11-03T20:00:00Z", caption: "another evening shipping code", likes: 0, comments: 0 },
              ] },
            { platform: "facebook", username: "t2", url: "", displayName: "Test Person", bio: "", verified: false,
              metrics: { followers: 50, following: 1, posts: 1 },
              samplePosts: [{ id: "2", timestamp: "2024-11-02T12:00:00Z", caption: "hoy preparé una receta para la familia", likes: 0, comments: 0 }] },
        ],
        // two singleton clusters, with one flag edge between them
        correlation: {
            method: "", weights: {}, thresholds: { edgeFloor: 0.35, merge: 0.55 },
            nodes: [
                { index: 0, platform: "instagram", username: "t", displayName: "Test Person", followers: 100, cluster: 0, x: 0, y: 0 },
                { index: 1, platform: "facebook", username: "t2", displayName: "Test Person", followers: 50, cluster: 1, x: 0, y: 0 },
            ],
            edges: [{ source: 0, target: 1, score: 0.45, band: "medium" as const, features: [], rationale: "" }],
            identities: [
                { id: 0, label: "Test Person", accountIndices: [0], platforms: ["instagram"], cohesion: null },
                { id: 1, label: "Test Person", accountIndices: [1], platforms: ["facebook"], cohesion: null },
            ],
        },
        network: { nodes: [], links: [], timeRange: { startMs: 0, endMs: 0 }, contactCount: 4, crossPlatformContacts: 1 },
    };
    const f = extractBriefFacts(report);
    assert.equal(f.platformCount, 2);
    assert.equal(f.totalFollowers, 150);
    assert.equal(f.identityCount, 2);
    assert.equal(f.flaggedNamesakes, 1, "the linked-but-separate cluster is a flagged namesake");
    assert.deepEqual(f.languages, ["English", "Spanish"]);
    assert.equal(f.activityWindow, "evening");
});

test("generateBrief (no key) returns a validated extractive brief", async () => {
    const report = {
        target: { handle: "t", displayName: "Test Person", summary: "", firstSeen: "2020-01-02", tags: ["x"] },
        findings: [
            { platform: "x", username: "t", url: "", displayName: "Test Person", bio: "", verified: false,
              metrics: { followers: 10, following: 1, posts: 1 },
              samplePosts: [{ id: "1", timestamp: "2024-11-02T20:00:00Z", caption: "hi", likes: 0, comments: 0 }] },
        ],
        correlation: {
            method: "", weights: {}, thresholds: { edgeFloor: 0.35, merge: 0.55 },
            nodes: [{ index: 0, platform: "x", username: "t", displayName: "Test Person", followers: 10, cluster: 0, x: 0, y: 0 }],
            edges: [],
            identities: [{ id: 0, label: "Test Person", accountIndices: [0], platforms: ["x"], cohesion: null }],
        },
        network: { nodes: [], links: [], timeRange: { startMs: 0, endMs: 0 }, contactCount: 0, crossPlatformContacts: 0 },
    };
    const brief = await generateBrief(report);
    assert.equal(brief.generator, "extractive");
    assert.equal(brief.validated, true);
    assert.ok(brief.text.length > 0);
});
