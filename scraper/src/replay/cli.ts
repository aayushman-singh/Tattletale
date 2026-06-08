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

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runReplay } from "./runReplay.js";
import { GOLDEN_ROOT } from "./fixtures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
    const handle = process.argv[2];
    if (!handle) {
        console.error("Usage: tsx src/replay/cli.ts <handle> [outDir]");
        console.error("Example: tsx src/replay/cli.ts ana_rivera_dev");
        process.exit(2);
    }

    // Default: write into the committed golden bundle so the static frontend
    // demo can serve real files. Override with an explicit outDir argument.
    const outDir = process.argv[3]
        ? resolve(process.argv[3])
        : join(GOLDEN_ROOT, handle, "generated");

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
}

main().catch((err) => {
    // Fail loudly with full context — no swallowing.
    console.error("\n[replay] FAILED:", err);
    process.exit(1);
});
