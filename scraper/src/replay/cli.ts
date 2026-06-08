// CLI entry point for replay mode.
//
//   tsx src/replay/cli.ts <handle> [outDir]
//
// This wrapper is the ONLY place a real clock is read. It stamps the current
// ISO time and delegates to the pure runReplay(). Everything downstream is
// deterministic given that timestamp.
//
// Env: REPLAY_MODE=1 is accepted as a marker but is not required — the CLI is
// the primary entry. If REPLAY_MODE is set to anything falsy ("0"/""), we still
// run (the CLI's existence IS the opt-in); the var exists for parity with the
// frontend's demo wiring.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runReplay } from "./runReplay.js";
import { GOLDEN_ROOT } from "./fixtures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Files the static frontend /demo route serves.
const DEMO_FILES = ["report.json", "correlation.json", "report.pdf", "manifest.json", "custody-log.json"];
const DEMO_DIR = resolve(__dirname, "..", "..", "..", "frontend", "public", "demo");

async function main() {
    // Positional args, with a `--demo` flag that also syncs the bundle into the
    // frontend's static demo dir so the keyless /demo route stays current.
    const args = process.argv.slice(2).filter((a) => a !== "--demo");
    const syncDemo = process.argv.includes("--demo");
    const handle = args[0];
    if (!handle) {
        console.error("Usage: tsx src/replay/cli.ts <handle> [outDir] [--demo]");
        console.error("Example: tsx src/replay/cli.ts ana_rivera_dev --demo");
        process.exit(2);
    }

    // Default: write into the committed golden bundle so the static frontend
    // demo can serve real files. Override with an explicit outDir argument.
    const outDir = args[1] ? resolve(args[1]) : join(GOLDEN_ROOT, handle, "generated");

    const generatedAt = new Date().toISOString();

    if (process.env.REPLAY_MODE) {
        console.log(`REPLAY_MODE=${process.env.REPLAY_MODE}`);
    }
    console.log(`[replay] handle=${handle}`);
    console.log(`[replay] outDir=${outDir}`);
    console.log(`[replay] generatedAt=${generatedAt}`);

    const result = await runReplay(handle, outDir, generatedAt);

    console.log("\n[replay] artifacts:");
    for (const a of result.artifacts) {
        console.log(`  ${a.bytes.toString().padStart(8)} B  ${a.sha256}  ${a.path}`);
    }
    console.log(`\n[replay] custody log: ${result.custodyLogPath}`);
    console.log(`[replay] manifest:    ${result.manifestPath}`);
    console.log(`[replay] ROOT HASH:   ${result.rootHash}`);

    if (syncDemo) {
        mkdirSync(DEMO_DIR, { recursive: true });
        for (const f of DEMO_FILES) {
            copyFileSync(join(outDir, f), join(DEMO_DIR, f));
        }
        console.log(`\n[replay] synced ${DEMO_FILES.length} files to ${DEMO_DIR}`);
    }
}

main().catch((err) => {
    // Fail loudly with full context — no swallowing.
    console.error("\n[replay] FAILED:", err);
    process.exit(1);
});
