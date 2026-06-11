// Shared types for replay mode. No runtime, no I/O — just the shapes that flow
// between the fixture loader, the report assembler, and the custody manifest.

// Capture-location of a post. Optional everywhere. Co-presence is gated on a
// MINIMUM number of capture-grade geo posts PER ACCOUNT PAIR: when either account
// in a pair lacks enough, the signal is INAPPLICABLE for that pair and is
// renormalized out of the score — never imputed. `accuracyM` is the point's
// capture uncertainty (1-sigma radius, metres). It is REQUIRED for a point to
// count as a co-presence instrument: a point coarser than the co-presence radius
// (a city/venue centroid) — OR one that declares no accuracy at all (unknown
// precision is never assumed perfect) — can never establish fine co-presence, so
// a merely-shared city, and an unqualified coordinate, are both dropped rather
// than mistaken for the same spot.
export interface GeoPoint {
    lat: number; // degrees, -90..90
    lon: number; // degrees, -180..180
    accuracyM?: number; // capture uncertainty (m); REQUIRED & fine (<=250 m) to count as an instrument
}

export interface GoldenPost {
    id: string;
    timestamp: string;
    caption: string;
    likes: number;
    comments: number;
    geo?: GeoPoint;
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

// ---- Network / interaction graph (fixture-supplied) ----

export interface GoldenContact {
    id: string;
    handle: string;
    displayName: string;
    platform: string;
}

export interface GoldenInteraction {
    from: string; // a target account's platform, e.g. "instagram"
    to: string; // GoldenContact.id
    type: "follow" | "mutual" | "message" | "mention" | "reply";
    timestamp: string;
}

export interface GoldenNetwork {
    contacts: GoldenContact[];
    interactions: GoldenInteraction[];
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
    // Optional cross-platform interaction graph for the network view.
    network?: GoldenNetwork;
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
    brief: IntelligenceBrief;
    network: NetworkGraph;
}

// ---- LLM-summarized intelligence brief ----

// The ONLY structured facts any summarizer (extractive or LLM) is allowed to see.
// Nothing else from the case may enter a brief — this is the anti-hallucination
// boundary: a fact not here cannot be asserted.
export interface BriefFacts {
    handle: string;
    displayName: string;
    platformCount: number;
    platforms: string[];
    totalFollowers: number;
    totalPosts: number;
    identityCount: number;
    primaryIdentityAccounts: number;
    primaryCohesionBand: "high" | "medium" | "low";
    flaggedNamesakes: number;
    peakHourUtc: number;
    activityWindow: string; // derived bucket: night/morning/afternoon/evening
    languages: string[]; // detected from post captions
    topTags: string[];
    firstSeen: string;
    contactCount: number;
    crossPlatformContacts: number;
}

export interface IntelligenceBrief {
    text: string;
    generator: "extractive" | "gemini";
    // Always true on a written brief: the text passed the no-hallucination guard
    // (every name/number traces back to BriefFacts). Generation throws otherwise.
    validated: true;
    facts: BriefFacts;
}

// ---- Cross-platform network graph (normalized) ----

export interface NetworkNode {
    id: string; // "self:<platform>" for the target's accounts, else contact id
    kind: "self" | "contact";
    label: string;
    platform: string;
    cluster: number; // identity cluster for self nodes, -1 for contacts
    crossPlatform: boolean; // a contact reached from >1 of the target's platforms
    degree: number;
    x: number; // deterministic layout coords
    y: number;
}

export interface NetworkLink {
    source: string;
    target: string;
    type: string;
    timestamp: string;
    t: number; // epoch ms — drives the time scrubber
}

export interface NetworkGraph {
    nodes: NetworkNode[];
    links: NetworkLink[];
    timeRange: { startMs: number; endMs: number };
    contactCount: number;
    crossPlatformContacts: number;
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
