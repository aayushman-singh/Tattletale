// Locates and loads the golden fixture for a handle. Throws loudly if it's
// missing or malformed — there is no fallback to invented data.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GoldenCase } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// scraper/src/replay -> repo root -> output/golden
export const GOLDEN_ROOT = resolve(__dirname, "..", "..", "..", "output", "golden");

export function fixturePath(handle: string): string {
    return join(GOLDEN_ROOT, handle, "case.json");
}

export function loadGoldenCase(handle: string): GoldenCase {
    const path = fixturePath(handle);
    if (!existsSync(path)) {
        throw new Error(
            `No golden fixture for handle "${handle}". Expected file at ${path}. ` +
                `Replay mode does not invent data — add a fixture or pick an existing handle.`,
        );
    }

    let raw: string;
    try {
        raw = readFileSync(path, "utf8");
    } catch (err) {
        throw new Error(`Failed to read golden fixture at ${path}: ${(err as Error).message}`);
    }

    let parsed: GoldenCase;
    try {
        parsed = JSON.parse(raw) as GoldenCase;
    } catch (err) {
        throw new Error(`Golden fixture at ${path} is not valid JSON: ${(err as Error).message}`);
    }

    if (parsed.synthetic !== true) {
        throw new Error(
            `Golden fixture at ${path} is not marked synthetic. Replay mode refuses non-synthetic data.`,
        );
    }
    if (!parsed.target?.handle || !Array.isArray(parsed.platforms)) {
        throw new Error(`Golden fixture at ${path} is missing required fields (target.handle, platforms[]).`);
    }
    return parsed;
}
