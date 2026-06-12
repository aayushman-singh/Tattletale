// Run with: npx tsx --test src/replay/__tests__/network.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNetworkGraph } from "../network.js";
import type { CorrelationResult, GoldenNetwork } from "../types.js";

const correlation: CorrelationResult = {
    method: "",
    weights: {},
    thresholds: { edgeFloor: 0.35, merge: 0.55 },
    nodes: [
        { index: 0, platform: "instagram", username: "a", displayName: "A", followers: 10, cluster: 1, x: 0, y: 0 },
        { index: 1, platform: "x", username: "a", displayName: "A", followers: 10, cluster: 1, x: 0, y: 0 },
    ],
    edges: [],
    identities: [],
};

const network: GoldenNetwork = {
    contacts: [
        { id: "c1", handle: "sam", displayName: "Sam", platform: "instagram" },
        { id: "c2", handle: "lee", displayName: "Lee", platform: "x" },
    ],
    interactions: [
        { from: "instagram", to: "c1", type: "mutual", timestamp: "2024-10-05T20:00:00Z" },
        { from: "x", to: "c1", type: "reply", timestamp: "2024-10-22T20:00:00Z" }, // c1 reached from 2 platforms
        { from: "x", to: "c2", type: "follow", timestamp: "2024-10-10T20:00:00Z" },
    ],
};

test("builds self + contact nodes and links", () => {
    const g = buildNetworkGraph(network, correlation);
    assert.equal(g.nodes.filter((n) => n.kind === "self").length, 2);
    assert.equal(g.nodes.filter((n) => n.kind === "contact").length, 2);
    assert.equal(g.links.length, 3);
    assert.equal(g.contactCount, 2);
});

test("detects cross-platform contacts (reached from >1 target platform)", () => {
    const g = buildNetworkGraph(network, correlation);
    const c1 = g.nodes.find((n) => n.id === "c1");
    const c2 = g.nodes.find((n) => n.id === "c2");
    assert.equal(c1?.crossPlatform, true, "c1 reached from instagram + x");
    assert.equal(c2?.crossPlatform, false, "c2 reached from x only");
    assert.equal(g.crossPlatformContacts, 1);
});

test("self nodes inherit their identity cluster", () => {
    const g = buildNetworkGraph(network, correlation);
    assert.equal(g.nodes.find((n) => n.id === "self:instagram")?.cluster, 1);
});

test("links carry epoch time and the range is computed", () => {
    const g = buildNetworkGraph(network, correlation);
    assert.ok(g.links.every((l) => typeof l.t === "number" && l.t > 0));
    assert.equal(g.timeRange.startMs, Date.parse("2024-10-05T20:00:00Z"));
    assert.equal(g.timeRange.endMs, Date.parse("2024-10-22T20:00:00Z"));
});

test("deterministic: same input => identical graph", () => {
    assert.equal(JSON.stringify(buildNetworkGraph(network, correlation)), JSON.stringify(buildNetworkGraph(network, correlation)));
});

test("invalid interaction timestamp fails loudly", () => {
    const bad: GoldenNetwork = {
        contacts: [{ id: "c1", handle: "sam", displayName: "Sam", platform: "x" }],
        interactions: [{ from: "x", to: "c1", type: "follow", timestamp: "nope" }],
    };
    assert.throws(() => buildNetworkGraph(bad, correlation), /Invalid interaction timestamp/);
});

test("timezone-less interaction timestamp fails loudly", () => {
    const bad: GoldenNetwork = {
        contacts: [{ id: "c1", handle: "sam", displayName: "Sam", platform: "x" }],
        interactions: [{ from: "x", to: "c1", type: "follow", timestamp: "2024-10-05T20:00:00" }],
    };
    assert.throws(() => buildNetworkGraph(bad, correlation), /require ISO-8601 with a timezone/);
});

test("missing network evidence fails loudly", () => {
    assert.throws(() => buildNetworkGraph(undefined, correlation), /missing network evidence/i);
});
