// Transform: golden fixture -> normalized case report. No I/O, no clock. The
// timestamp is injected so the assembled report is deterministic for tests. The
// only async step is the brief, which may call an LLM when a key is configured;
// the keyless default path is fully deterministic.

import type {
    CaseReport,
    CorrelationResult,
    GoldenCase,
    GoldenCrossMatch,
    PlatformFinding,
} from "./types.js";
import { correlate } from "./correlation.js";
import { buildNetworkGraph } from "./network.js";
import { generateBrief } from "./brief.js";

// Derive the cross-platform matches from the correlation engine output, so the
// report's headline "same person across N platforms" claims are *computed*, not
// hand-written. Every identity cluster spanning >1 account becomes a match whose
// evidence is the engine's own rationale for the strongest link in the cluster.
function deriveMatches(correlation: CorrelationResult): GoldenCrossMatch[] {
    const toBand = (s: number): "high" | "medium" | "low" =>
        s >= 0.62 ? "high" : s >= 0.4 ? "medium" : "low";
    return correlation.identities
        .filter((id) => id.accountIndices.length > 1)
        .map((id) => {
            const intra = correlation.edges
                .filter(
                    (e) =>
                        id.accountIndices.includes(e.source) &&
                        id.accountIndices.includes(e.target),
                )
                .sort((a, b) => b.score - a.score);
            // Label the match with THIS cluster's primary account (most
            // followers), never a globally-found handle — otherwise a second
            // identity could be mislabelled under the target's handle.
            const handle = id.accountIndices
                .map((i) => correlation.nodes[i])
                .sort((a, b) => b.followers - a.followers)[0].username;
            const cohesion = id.cohesion ?? intra[0]?.score ?? 0;
            return {
                username: handle,
                platforms: id.platforms,
                band: toBand(cohesion),
                evidence: intra[0]?.rationale ?? "linked by correlation engine",
            };
        });
}

export async function assembleReport(golden: GoldenCase, generatedAt: string): Promise<CaseReport> {
    if (!golden.synthetic) {
        // Replay mode only ever operates on data explicitly marked synthetic.
        // If a fixture isn't flagged, fail loudly rather than risk surfacing
        // anything that looks like real scraped data in the demo.
        throw new Error(
            `Refusing to assemble report: fixture for "${golden.target?.handle}" is not marked synthetic.`,
        );
    }

    const findings: PlatformFinding[] = golden.platforms.map((p) => ({
        platform: p.platform,
        username: p.username,
        url: p.url,
        displayName: p.displayName,
        bio: p.bio,
        verified: p.verified,
        metrics: {
            followers: p.followers,
            following: p.following,
            posts: p.postCount,
        },
        samplePosts: p.posts,
    }));

    // Compute identity correlation from observable signals (replaces the old
    // hand-written crossPlatformMatches that used to live in the fixture).
    const correlation = correlate(golden.platforms);

    // Cross-platform interaction graph, grouped by the resolved identities.
    const network = buildNetworkGraph(golden.network, correlation);

    // LLM-summarized (or extractive) intelligence brief — fact-bounded + validated.
    const brief = await generateBrief({ target: golden.target, findings, correlation, network });

    return {
        mode: "replay",
        synthetic: true,
        notice: golden.notice,
        handle: golden.target.handle,
        generatedAt,
        target: golden.target,
        platformCount: findings.length,
        findings,
        crossPlatformMatches: deriveMatches(correlation),
        correlation,
        brief,
        network,
    };
}

/**
 * Canonical JSON serialization used for hashing AND for the file written to
 * disk. Same bytes go to the report file and into the custody hash, so the
 * manifest's report hash always matches the report a reviewer downloads.
 */
export function serializeReport(report: CaseReport): string {
    return JSON.stringify(report, null, 2) + "\n";
}
