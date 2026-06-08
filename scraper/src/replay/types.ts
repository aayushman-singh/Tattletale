// Shared types for replay mode. No runtime, no I/O — just the shapes that flow
// between the fixture loader, the report assembler, and the custody manifest.

export interface GoldenPost {
    id: string;
    timestamp: string;
    caption: string;
    likes: number;
    comments: number;
}

export interface GoldenPlatform {
    platform: string;
    username: string;
    url: string;
    displayName: string;
    bio: string;
    verified: boolean;
    followers: number;
    following: number;
    postCount: number;
    posts: GoldenPost[];
}

export interface GoldenCrossMatch {
    username: string;
    platforms: string[];
    confidence: "high" | "medium" | "low";
    evidence: string;
}

export interface GoldenTarget {
    handle: string;
    displayName: string;
    summary: string;
    firstSeen: string;
    tags: string[];
}

export interface GoldenCase {
    synthetic: true;
    notice: string;
    target: GoldenTarget;
    platforms: GoldenPlatform[];
    crossPlatformMatches: GoldenCrossMatch[];
}

// ---- Normalized report ----

export interface PlatformFinding {
    platform: string;
    username: string;
    url: string;
    displayName: string;
    bio: string;
    verified: boolean;
    metrics: {
        followers: number;
        following: number;
        posts: number;
    };
    samplePosts: GoldenPost[];
}

export interface CaseReport {
    mode: "replay";
    synthetic: true;
    notice: string;
    handle: string;
    generatedAt: string;
    target: GoldenTarget;
    platformCount: number;
    findings: PlatformFinding[];
    crossPlatformMatches: GoldenCrossMatch[];
}

// ---- Chain of custody ----

export interface CustodyEntry {
    seq: number;
    step: string;
    artifact: string;
    sha256: string;
    prevHash: string;
    entryHash: string;
}

export interface Manifest {
    mode: "replay";
    handle: string;
    generatedAt: string;
    artifacts: { path: string; sha256: string }[];
    custodyEntries: number;
    rootHash: string;
}
