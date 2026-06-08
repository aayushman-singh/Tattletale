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
    // Qualitative band of the heuristic link score (not a probability).
    band: "high" | "medium" | "low";
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
    // Legacy/optional: the correlation engine now COMPUTES matches from the
    // platform data, so fixtures no longer need to assert them. Kept optional
    // for backward compatibility with older fixtures.
    crossPlatformMatches?: GoldenCrossMatch[];
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
    correlation: CorrelationResult;
}

// ---- Cross-identity correlation ----

export interface FeatureContribution {
    feature: string;
    value: number; // raw 0..1 signal
    weight: number; // its weight in the aggregate
    contribution: number; // value * weight
    label: string; // human explanation
}

export interface CorrelationNode {
    index: number;
    platform: string;
    username: string;
    displayName: string;
    followers: number;
    cluster: number; // identity cluster id
    x: number; // deterministic layout coords
    y: number;
}

export interface CorrelationEdge {
    source: number; // node index
    target: number; // node index
    score: number; // 0..1 aggregate
    band: "high" | "medium" | "low";
    features: FeatureContribution[];
    rationale: string;
}

export interface IdentityCluster {
    id: number;
    label: string;
    accountIndices: number[];
    platforms: string[];
    // Mean intra-cluster link score — a heuristic cohesion measure, NOT a
    // calibrated probability. null for a singleton (no corroborating evidence).
    cohesion: number | null;
}

export interface CorrelationResult {
    method: string;
    weights: Record<string, number>;
    thresholds: { edgeFloor: number; merge: number };
    nodes: CorrelationNode[];
    edges: CorrelationEdge[];
    identities: IdentityCluster[];
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
    seal: import("./sign.js").SignatureBlock;
}
