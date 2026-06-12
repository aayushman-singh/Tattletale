// Builds the cross-platform interaction graph from fixture network data, grouped
// by the identity clusters the correlation engine resolved. Pure + deterministic
// (fixed timestamps in, fixed coordinates out) so the graph is reproducible and
// the report it rides in hashes identically.

import type {
    CorrelationResult,
    GoldenNetwork,
    NetworkGraph,
    NetworkLink,
    NetworkNode,
} from "./types.js";

const W = 1000;
const H = 640;
const CX = W / 2;
const CY = H / 2;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function parseInteractionInstant(timestamp: string, label: string): number {
    if (!ISO_INSTANT.test(timestamp)) {
        throw new Error(
            `Invalid interaction timestamp "${timestamp}" (${label}): require ISO-8601 with a timezone (Z or ±hh:mm).`,
        );
    }
    const t = Date.parse(timestamp);
    if (Number.isNaN(t)) {
        throw new Error(`Invalid interaction timestamp "${timestamp}" (${label}).`);
    }
    return t;
}

export function buildNetworkGraph(
    network: GoldenNetwork | undefined,
    correlation: CorrelationResult,
): NetworkGraph {
    if (!network) {
        throw new Error("Replay fixture is missing network evidence; refusing to emit an empty network graph.");
    }

    // Map a target platform -> the identity cluster that platform's account is in.
    const clusterOfPlatform = new Map<string, number>();
    for (const n of correlation.nodes) clusterOfPlatform.set(n.platform, n.cluster);

    // Which target platforms each contact was reached from (for cross-platform).
    const reachedFrom = new Map<string, Set<string>>();
    for (const it of network.interactions) {
        if (!reachedFrom.has(it.to)) reachedFrom.set(it.to, new Set());
        reachedFrom.get(it.to)!.add(it.from);
    }

    const degree = new Map<string, number>();
    const bump = (id: string) => degree.set(id, (degree.get(id) || 0) + 1);

    // Links — canonical order (time, then endpoints) for determinism.
    const links: NetworkLink[] = [...network.interactions]
        .map((it) => {
            const label = `${it.from} -> ${it.to}`;
            const t = parseInteractionInstant(it.timestamp, label);
            const source = `self:${it.from}`;
            bump(source);
            bump(it.to);
            return { source, target: it.to, type: it.type, timestamp: it.timestamp, t };
        })
        .sort((a, b) => a.t - b.t || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));

    // Self nodes — one per target platform that appears in the correlation graph,
    // laid out in a tight ring at the centre, grouped visually by cluster.
    const selfPlatforms = [...new Set(correlation.nodes.map((n) => n.platform))].sort();
    const selfNodes: NetworkNode[] = selfPlatforms.map((platform, i) => {
        const angle = (2 * Math.PI * i) / Math.max(1, selfPlatforms.length) - Math.PI / 2;
        return {
            id: `self:${platform}`,
            kind: "self",
            label: platform,
            platform,
            cluster: clusterOfPlatform.get(platform) ?? -1,
            crossPlatform: false,
            degree: degree.get(`self:${platform}`) || 0,
            x: Math.round(CX + 70 * Math.cos(angle)),
            y: Math.round(CY + 70 * Math.sin(angle)),
        };
    });

    // Contact nodes — outer ring; cross-platform contacts pulled inward (they're
    // the higher-signal links). Ordered by id for a stable layout.
    const contacts = [...network.contacts].sort((a, b) => a.id.localeCompare(b.id));
    let crossCount = 0;
    const contactNodes: NetworkNode[] = contacts.map((c, i) => {
        const platforms = reachedFrom.get(c.id) ?? new Set();
        const crossPlatform = platforms.size > 1;
        if (crossPlatform) crossCount++;
        const radius = crossPlatform ? 175 : 270;
        const angle = (2 * Math.PI * i) / Math.max(1, contacts.length) - Math.PI / 2;
        return {
            id: c.id,
            kind: "contact",
            label: c.handle,
            platform: c.platform,
            cluster: -1,
            crossPlatform,
            degree: degree.get(c.id) || 0,
            x: Math.round(CX + radius * Math.cos(angle)),
            y: Math.round(CY + radius * Math.sin(angle) * (H / W) * 1.3),
        };
    });

    const ts = links.map((l) => l.t);
    return {
        nodes: [...selfNodes, ...contactNodes],
        links,
        timeRange: {
            startMs: ts.length ? Math.min(...ts) : 0,
            endMs: ts.length ? Math.max(...ts) : 0,
        },
        contactCount: contacts.length,
        crossPlatformContacts: crossCount,
    };
}
