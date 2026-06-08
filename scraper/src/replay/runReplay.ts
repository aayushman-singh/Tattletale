// Orchestrates one replay run: load fixture -> assemble report -> render PDF ->
// build custody chain over the real artifact bytes -> write report.json,
// report.pdf, custody-log.json, manifest.json.
//
// The timestamp is a REQUIRED parameter (no Date.now() in here) so the whole
// run is deterministic and testable: same fixture + same timestamp => same
// root hash, byte-for-byte.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGoldenCase } from "./fixtures.js";
import { assembleReport, serializeReport } from "./report.js";
import { renderPdf } from "./pdf.js";
import { buildCustodyChain, sha256 } from "./custody.js";
import { sealRootHash } from "./sign.js";
import type { KeyPair } from "./sign.js";
import type { Manifest } from "./types.js";

export interface ReplayResult {
    handle: string;
    outDir: string;
    rootHash: string;
    artifacts: { path: string; sha256: string; bytes: number }[];
    reportPath: string;
    pdfPath: string;
    manifestPath: string;
    custodyLogPath: string;
}

/**
 * @param handle      golden fixture handle (e.g. "ana_rivera_dev")
 * @param outDir      directory to write artifacts into (created if absent)
 * @param generatedAt ISO timestamp stamped into the report + custody chain
 */
export async function runReplay(
    handle: string,
    outDir: string,
    generatedAt: string,
    signingKey?: KeyPair,
): Promise<ReplayResult> {
    // 1. scrape (replayed): load the synthetic fixture, throwing if missing.
    const golden = loadGoldenCase(handle);

    // 2. normalize + correlate: fixture -> case report (incl. identity graph).
    const report = assembleReport(golden, generatedAt);
    const reportJson = serializeReport(report);
    const reportBytes = Buffer.from(reportJson, "utf8");
    const reportSha = sha256(reportBytes);

    // 3. correlation artifact. report.json embeds the full correlation as part
    //    of the sealed case record; correlation.json is the SAME data exported as
    //    a standalone, separately-hashed graph artifact (what the SPA fetches and
    //    a reviewer downloads). The redundancy is intentional: one is the record,
    //    one is the export, and both are under custody so either download verifies.
    const correlationJson = JSON.stringify(report.correlation, null, 2) + "\n";
    const correlationBytes = Buffer.from(correlationJson, "utf8");
    const correlationSha = sha256(correlationBytes);

    // 4. render the PDF over the normalized report + provisional custody chain.
    const preChain = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: reportSha },
        { step: "correlate", artifact: "correlation.json", sha256: correlationSha },
    ]);

    const pdfBytes = await renderPdf(report, preChain.entries, preChain.rootHash);
    const pdfSha = sha256(pdfBytes);

    // 5. final custody chain: report -> correlation -> pdf. Root hash seals all.
    const finalChain = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: reportSha },
        { step: "correlate", artifact: "correlation.json", sha256: correlationSha },
        { step: "render-pdf", artifact: "report.pdf", sha256: pdfSha },
    ]);

    // 6. seal the root hash with an Ed25519 signature (attribution + integrity).
    const seal = sealRootHash(finalChain.rootHash, signingKey);

    // 7. manifest commits to every artifact + the signed root hash.
    const manifest: Manifest = {
        mode: "replay",
        handle,
        generatedAt,
        artifacts: [
            { path: "report.json", sha256: reportSha },
            { path: "correlation.json", sha256: correlationSha },
            { path: "report.pdf", sha256: pdfSha },
        ],
        custodyEntries: finalChain.entries.length,
        rootHash: finalChain.rootHash,
        seal,
    };
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    const custodyLogJson = JSON.stringify(finalChain.entries, null, 2) + "\n";

    // 8. write everything.
    mkdirSync(outDir, { recursive: true });
    const reportPath = join(outDir, "report.json");
    const correlationPath = join(outDir, "correlation.json");
    const pdfPath = join(outDir, "report.pdf");
    const manifestPath = join(outDir, "manifest.json");
    const custodyLogPath = join(outDir, "custody-log.json");

    writeFileSync(reportPath, reportBytes);
    writeFileSync(correlationPath, correlationBytes);
    writeFileSync(pdfPath, pdfBytes);
    writeFileSync(custodyLogPath, custodyLogJson, "utf8");
    writeFileSync(manifestPath, manifestJson, "utf8");

    return {
        handle,
        outDir,
        rootHash: finalChain.rootHash,
        artifacts: [
            { path: reportPath, sha256: reportSha, bytes: reportBytes.length },
            { path: correlationPath, sha256: correlationSha, bytes: correlationBytes.length },
            { path: pdfPath, sha256: pdfSha, bytes: pdfBytes.length },
        ],
        reportPath,
        pdfPath,
        manifestPath,
        custodyLogPath,
    };
}
