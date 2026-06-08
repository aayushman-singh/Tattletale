// Pure transform: golden fixture -> normalized case report. No I/O, no clock.
// The timestamp is injected so the assembled report is deterministic for tests.

import type { CaseReport, GoldenCase, PlatformFinding } from "./types.js";

export function assembleReport(golden: GoldenCase, generatedAt: string): CaseReport {
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

    return {
        mode: "replay",
        synthetic: true,
        notice: golden.notice,
        handle: golden.target.handle,
        generatedAt,
        target: golden.target,
        platformCount: findings.length,
        findings,
        crossPlatformMatches: golden.crossPlatformMatches,
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
