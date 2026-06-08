import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  Search,
  Wand2,
  Hash,
  ListChecks,
  FileText,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Share2,
  KeyRound,
} from "lucide-react";
import IdentityGraph from "./IdentityGraph";

// Replay-mode demo. Pure static: it fetches the pre-generated synthetic bundle
// from /demo/*.json (served by Vite from frontend/public/demo) and renders the
// real pipeline output. NO backend, NO logins, NO network beyond same-origin
// static files — so it survives a keyless deploy.

const PIPELINE_STEPS = [
  { key: "scrape", label: "Scrape (replayed)", icon: Search, blurb: "Load synthetic multi-platform findings from the golden fixture." },
  { key: "normalize", label: "Normalize", icon: Wand2, blurb: "Fold per-platform data into one normalized case report." },
  { key: "correlate", label: "Correlate identities", icon: Share2, blurb: "Link probable same-person accounts from handle, style, timing & vocabulary." },
  { key: "hash", label: "Hash + sign", icon: Hash, blurb: "SHA-256 every artifact; Ed25519-seal the root hash." },
  { key: "custody", label: "Chain of custody", icon: ListChecks, blurb: "Append each hash to a tamper-evident hash chain." },
  { key: "report", label: "Report", icon: FileText, blurb: "Emit report, correlation, manifest, custody-log, PDF." },
];

const confColor = {
  high: "text-green-400 border-green-500/40 bg-green-500/10",
  medium: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  low: "text-gray-400 border-gray-500/40 bg-gray-500/10",
};

const Mono = ({ children }) => (
  <span className="font-mono break-all text-xs text-blue-300">{children}</span>
);

const DemoCase = () => {
  const [state, setState] = useState("idle"); // idle | running | done | error
  const [report, setReport] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [custody, setCustody] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [error, setError] = useState(null);

  const runDemo = async () => {
    setState("running");
    setError(null);
    setActiveStep(-1);

    try {
      // Fetch the pre-generated static bundle. These files were produced by the
      // real replay CLI (scraper/src/replay) and committed under public/demo.
      const fetchJson = (path) =>
        fetch(path).then((res) => {
          if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
          return res.json();
        });
      const [r, m, c, corr] = await Promise.all([
        fetchJson("/demo/report.json"),
        fetchJson("/demo/manifest.json"),
        fetchJson("/demo/custody-log.json"),
        fetchJson("/demo/correlation.json"),
      ]);

      setReport(r);
      setManifest(m);
      setCustody(c);
      setCorrelation(corr);

      // Animate the pipeline reveal step by step for a sense of the flow.
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 420));
        setActiveStep(i);
      }
      setState("done");
    } catch (err) {
      // Fail loudly and visibly — no silent fallback to fake content.
      setError(err.message || String(err));
      setState("error");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" /> Replay mode · synthetic data · no logins
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Run a{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              demo case
            </span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            The live scraper needs nine platform logins and a headed browser, so it can&apos;t run
            publicly. This replay reads a 100% synthetic fixture and produces the{" "}
            <span className="text-white font-medium">real</span> pipeline output — a JSON report, a
            SHA-256 chain-of-custody manifest, and a downloadable PDF. No backend, no credentials, no
            network scrape.
          </p>
        </div>

        {/* Run button */}
        <div className="flex justify-center mb-12">
          <Button
            size="lg"
            onClick={runDemo}
            disabled={state === "running"}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8"
          >
            {state === "running" ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Running pipeline…
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" /> Run demo case
              </>
            )}
          </Button>
        </div>

        {state === "error" && (
          <Card className="bg-red-900/30 border-red-500/50 mb-8">
            <CardContent className="p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <div className="text-red-300 font-semibold">Demo failed to load</div>
                <div className="text-red-200/80 text-sm mt-1">{error}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline steps */}
        {(state === "running" || state === "done") && (
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              const reached = i <= activeStep;
              return (
                <Card
                  key={step.key}
                  className={`transition-all duration-300 ${
                    reached
                      ? "bg-gray-800/70 border-blue-500/50"
                      : "bg-gray-800/30 border-gray-700 opacity-50"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {reached ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <Icon className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="text-sm font-semibold text-white">{step.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">{step.blurb}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Results */}
        {state === "done" && report && (
          <div className="space-y-8">
            {/* Synthetic notice */}
            <Card className="bg-amber-900/20 border-amber-500/40">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <p className="text-amber-200/90 text-sm">{report.notice}</p>
              </CardContent>
            </Card>

            {/* Case header */}
            <Card className="bg-gray-800/60 border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {report.target.displayName}{" "}
                      <span className="text-gray-400 text-lg">@{report.handle}</span>
                    </h2>
                    <p className="text-gray-400 mt-1">{report.target.summary}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Generated</div>
                    <Mono>{report.generatedAt}</Mono>
                    <div className="mt-1">{report.platformCount} platforms</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {report.target.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-xs border border-gray-600 text-gray-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Findings */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Per-platform findings</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {report.findings.map((f) => (
                  <Card key={`${f.platform}-${f.username}`} className="bg-gray-800/60 border-gray-700">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold uppercase tracking-wide text-blue-400">
                          {f.platform}
                        </span>
                        {f.verified && (
                          <span className="text-xs text-green-400 border border-green-500/40 bg-green-500/10 px-2 py-0.5 rounded">
                            verified
                          </span>
                        )}
                      </div>
                      <div className="text-white font-medium">
                        {f.displayName}{" "}
                        <a
                          href={f.url}
                          className="text-gray-400 text-sm hover:text-blue-300"
                          target="_blank"
                          rel="noreferrer"
                        >
                          @{f.username}
                        </a>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{f.bio}</p>
                      <div className="flex gap-4 mt-3 text-sm text-gray-300">
                        <span>
                          <span className="text-white font-semibold">
                            {f.metrics.followers.toLocaleString()}
                          </span>{" "}
                          followers
                        </span>
                        <span>
                          <span className="text-white font-semibold">
                            {f.metrics.posts.toLocaleString()}
                          </span>{" "}
                          posts
                        </span>
                      </div>
                      {f.samplePosts?.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-gray-700 pt-3">
                          {f.samplePosts.map((p) => (
                            <li key={p.id} className="text-xs text-gray-400">
                              <span className="text-gray-500">
                                {new Date(p.timestamp).toLocaleDateString()}
                              </span>{" "}
                              — {p.caption}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cross-identity correlation graph */}
            {correlation && (
              <div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-400" /> Cross-identity correlation
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Each account is scored against every other on handle, display name, writing-style
                  fingerprint, posting-time profile and shared vocabulary. Strong links collapse into
                  one identity; a same-named account with different behaviour is{" "}
                  <span className="text-amber-300">flagged but kept separate</span> — avoiding false
                  attribution.
                </p>
                <IdentityGraph correlation={correlation} />
              </div>
            )}

            {/* Computed matches (textual summary derived from the engine) */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Computed identity matches</h3>
              <div className="space-y-2">
                {report.crossPlatformMatches.map((m, i) => (
                  <Card key={i} className="bg-gray-800/60 border-gray-700">
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-blue-300">@{m.username}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${confColor[m.confidence]}`}
                      >
                        {m.confidence}
                      </span>
                      <span className="text-gray-400 text-sm">{m.platforms.join(" · ")}</span>
                      <span className="text-gray-500 text-xs basis-full">{m.evidence}</span>
                    </CardContent>
                  </Card>
                ))}
                {report.crossPlatformMatches.length === 0 && (
                  <p className="text-gray-500 text-sm">No accounts met the merge threshold.</p>
                )}
              </div>
            </div>

            {/* Chain of custody */}
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" /> Chain of custody
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Append-only SHA-256 hash chain. Each entry binds an artifact&apos;s content hash to
                the previous entry — tampering with any artifact breaks the root hash.
              </p>
              <Card className="bg-gray-900/70 border-gray-700">
                <CardContent className="p-5 space-y-4">
                  {custody?.map((e) => (
                    <div key={e.seq} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                      <div className="text-sm text-white font-medium">
                        #{e.seq} {e.step} — {e.artifact}
                      </div>
                      <div className="mt-1 text-xs space-y-0.5">
                        <div>
                          <span className="text-gray-500">sha256 </span>
                          <Mono>{e.sha256}</Mono>
                        </div>
                        <div>
                          <span className="text-gray-500">prev&nbsp;&nbsp; </span>
                          <Mono>{e.prevHash}</Mono>
                        </div>
                        <div>
                          <span className="text-gray-500">entry&nbsp; </span>
                          <Mono>{e.entryHash}</Mono>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-blue-500/30">
                    <div className="text-xs text-gray-400 mb-1">ROOT HASH (integrity seal)</div>
                    <div className="font-mono text-sm text-green-400 break-all">
                      {manifest?.rootHash}
                    </div>
                  </div>
                  {manifest?.seal && (
                    <div className="pt-3 border-t border-gray-800">
                      <div className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                        {manifest.seal.algorithm} SIGNATURE over the root hash
                      </div>
                      <Mono>{manifest.seal.signature}</Mono>
                      <p className="text-gray-500 text-xs mt-2">{manifest.seal.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Downloads */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Download the real artifacts</h3>
              <div className="flex flex-wrap gap-3">
                <a href="/demo/report.pdf" download>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                    <Download className="w-4 h-4 mr-2" /> report.pdf
                  </Button>
                </a>
                <a href="/demo/report.json" download>
                  <Button variant="outline" className="border-gray-600 text-white bg-gray-800">
                    <Download className="w-4 h-4 mr-2" /> report.json
                  </Button>
                </a>
                <a href="/demo/correlation.json" download>
                  <Button variant="outline" className="border-gray-600 text-white bg-gray-800">
                    <Download className="w-4 h-4 mr-2" /> correlation.json
                  </Button>
                </a>
                <a href="/demo/manifest.json" download>
                  <Button variant="outline" className="border-gray-600 text-white bg-gray-800">
                    <Download className="w-4 h-4 mr-2" /> manifest.json
                  </Button>
                </a>
                <a href="/demo/custody-log.json" download>
                  <Button variant="outline" className="border-gray-600 text-white bg-gray-800">
                    <Download className="w-4 h-4 mr-2" /> custody-log.json
                  </Button>
                </a>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                These files were produced by the actual replay engine
                (scraper/src/replay) and committed to the repo. The PDF embeds the same
                chain-of-custody hashes shown above.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoCase;
