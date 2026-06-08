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
): Promise<ReplayResult> {
    // 1. scrape (replayed): load the synthetic fixture, throwing if missing.
    const golden = loadGoldenCase(handle);

    // 2. normalize: fixture -> case report.
    const report = assembleReport(golden, generatedAt);
    const reportJson = serializeReport(report);
    const reportBytes = Buffer.from(reportJson, "utf8");
    const reportSha = sha256(reportBytes);

    // 3. render the PDF over the normalized report + (to-be-computed) custody.
    //    We build a provisional custody chain first so the PDF can show it; the
    //    PDF bytes then become their own custody entry. To keep the PDF's
    //    embedded hashes consistent with the final log, the PDF lists the
    //    report + manifest entries (everything known before the PDF exists),
    //    and the PDF itself is the final entry sealing the root hash.
    const preChain = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: reportSha },
    ]);

    const pdfBytes = await renderPdf(report, preChain.entries, preChain.rootHash);
    const pdfSha = sha256(pdfBytes);

    // 4. final custody chain: report.json then report.pdf. Root hash seals both.
    const finalChain = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: reportSha },
        { step: "render-pdf", artifact: "report.pdf", sha256: pdfSha },
    ]);

    // 5. manifest commits to every artifact + the root hash.
    const manifest: Manifest = {
        mode: "replay",
        handle,
        generatedAt,
        artifacts: [
            { path: "report.json", sha256: reportSha },
            { path: "report.pdf", sha256: pdfSha },
        ],
        custodyEntries: finalChain.entries.length,
        rootHash: finalChain.rootHash,
    };
    const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    const custodyLogJson = JSON.stringify(finalChain.entries, null, 2) + "\n";

    // 6. write everything.
    mkdirSync(outDir, { recursive: true });
    const reportPath = join(outDir, "report.json");
    const pdfPath = join(outDir, "report.pdf");
    const manifestPath = join(outDir, "manifest.json");
    const custodyLogPath = join(outDir, "custody-log.json");

    writeFileSync(reportPath, reportBytes);
    writeFileSync(pdfPath, pdfBytes);
    writeFileSync(custodyLogPath, custodyLogJson, "utf8");
    writeFileSync(manifestPath, manifestJson, "utf8");

    return {
        handle,
        outDir,
        rootHash: finalChain.rootHash,
        artifacts: [
            { path: reportPath, sha256: reportSha, bytes: reportBytes.length },
            { path: pdfPath, sha256: pdfSha, bytes: pdfBytes.length },
        ],
        reportPath,
        pdfPath,
        manifestPath,
        custodyLogPath,
    };
}
