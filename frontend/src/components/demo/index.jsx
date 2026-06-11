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
  Sparkles,
  Network,
} from "lucide-react";
import IdentityGraph from "./IdentityGraph";
import NetworkGraph from "./NetworkGraph";

// Replay-mode demo. Pure static: it fetches the pre-generated synthetic bundle
// from /demo/*.json (served by Vite from frontend/public/demo) and renders the
// real pipeline output. NO backend, NO logins, NO network beyond same-origin
// static files — so it survives a keyless deploy.

const PIPELINE_STEPS = [
  { key: "scrape", label: "Scrape (replayed)", icon: Search, blurb: "Load synthetic multi-platform findings from the golden fixture." },
  { key: "correlate", label: "Correlate identities", icon: Share2, blurb: "Link probable same-person accounts from handle, style, timing & vocabulary." },
  { key: "network", label: "Map network", icon: Network, blurb: "Build the cross-platform interaction graph over time." },
  { key: "brief", label: "Brief", icon: Sparkles, blurb: "Summarize the case in one paragraph — validated against the facts." },
  { key: "hash", label: "Hash + sign", icon: Hash, blurb: "SHA-256 every artifact; Ed25519-seal the root hash." },
  { key: "report", label: "Report", icon: FileText, blurb: "Emit report, correlation, manifest, custody-log, PDF." },
];

const confColor = {
  high: "text-signal-ok border-signal-ok/40 bg-signal-ok/10",
  medium: "text-signal-warn border-signal-warn/40 bg-signal-warn/10",
  low: "text-mute border-ink-700 bg-ink-780",
};

const Mono = ({ children }) => (
  <span className="font-mono break-all text-xs text-rust-300">{children}</span>
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
    <div className="relative min-h-screen bg-ink-900 pt-20 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-signal-warn/40 bg-signal-warn/10 text-[#e8c98a] text-xs font-medium font-mono">
            <ShieldCheck className="w-4 h-4" /> Replay mode · synthetic data · no logins
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-serif tracking-tight text-paper-50 mb-4">
            Run a{" "}
            <span className="font-serif italic text-rust-300">
              demo case
            </span>
          </h1>
          <p className="text-lg text-paper-300 max-w-2xl mx-auto">
            The live scraper needs nine platform logins and a headed browser, so it can&apos;t run
            publicly. This replay reads a 100% synthetic fixture and produces the{" "}
            <span className="text-paper-50 font-medium">real</span> pipeline output — a JSON report, a
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
            className="bg-rust-500 hover:bg-rust-400 text-paper-50 px-8"
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
                      ? "bg-ink-820/70 border-rust-500/50"
                      : "bg-ink-820/30 border-ink-700 opacity-50"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {reached ? (
                        <CheckCircle2 className="w-5 h-5 text-signal-ok" />
                      ) : (
                        <Icon className="w-5 h-5 text-faint" />
                      )}
                      <span className="text-sm font-semibold font-serif text-paper-50">{step.label}</span>
                    </div>
                    <p className="text-xs text-mute">{step.blurb}</p>
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
            <Card className="bg-signal-warn/10 border-signal-warn/40">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-signal-warn mt-0.5" />
                <p className="text-[#e8c98a] text-sm">{report.notice}</p>
              </CardContent>
            </Card>

            {/* Case header */}
            <Card className="bg-ink-820/60 border-ink-700">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold font-serif text-paper-50">
                      {report.target.displayName}{" "}
                      <span className="text-mute text-lg font-mono">@{report.handle}</span>
                    </h2>
                    <p className="text-mute mt-1">{report.target.summary}</p>
                  </div>
                  <div className="text-right text-xs text-faint">
                    <div>Generated</div>
                    <Mono>{report.generatedAt}</Mono>
                    <div className="mt-1">{report.platformCount} platforms</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {report.target.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-xs border border-ink-700 text-paper-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Intelligence brief */}
            {report.brief && (
              <Card className="bg-ink-820/60 border-rust-500/40">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-rust-300" />
                    <h3 className="text-lg font-bold font-serif text-paper-50">Intelligence brief</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-rust-500/40 text-rust-300">
                      {report.brief.generator}
                    </span>
                    {report.brief.validated && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-signal-ok/40 text-signal-ok inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> fact-validated
                      </span>
                    )}
                  </div>
                  <p className="text-paper-300 leading-relaxed">{report.brief.text}</p>
                  <p className="text-faint text-xs mt-3">
                    The summarizer is shown only structured facts; every name and number in this
                    paragraph is checked against those facts before it ships — a hallucinated place
                    or statistic fails the build, it never reaches the report.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Findings */}
            <div>
              <h3 className="text-xl font-bold font-serif text-paper-50 mb-4">Per-platform findings</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {report.findings.map((f) => (
                  <Card key={`${f.platform}-${f.username}`} className="bg-ink-820/60 border-ink-700">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold uppercase tracking-wide text-rust-300">
                          {f.platform}
                        </span>
                        {f.verified && (
                          <span className="text-xs text-signal-ok border border-signal-ok/40 bg-signal-ok/10 px-2 py-0.5 rounded">
                            verified
                          </span>
                        )}
                      </div>
                      <div className="text-paper-50 font-medium">
                        {f.displayName}{" "}
                        <a
                          href={f.url}
                          className="text-mute text-sm hover:text-rust-300 font-mono"
                          target="_blank"
                          rel="noreferrer"
                        >
                          @{f.username}
                        </a>
                      </div>
                      <p className="text-mute text-sm mt-1">{f.bio}</p>
                      <div className="flex gap-4 mt-3 text-sm text-paper-300">
                        <span>
                          <span className="text-paper-50 font-semibold">
                            {f.metrics.followers.toLocaleString()}
                          </span>{" "}
                          followers
                        </span>
                        <span>
                          <span className="text-paper-50 font-semibold">
                            {f.metrics.posts.toLocaleString()}
                          </span>{" "}
                          posts
                        </span>
                      </div>
                      {f.samplePosts?.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-ink-700 pt-3">
                          {f.samplePosts.map((p) => (
                            <li key={p.id} className="text-xs text-mute">
                              <span className="text-faint font-mono">
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
                <h3 className="text-xl font-bold font-serif text-paper-50 mb-1 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-rust-300" /> Cross-identity correlation
                </h3>
                <p className="text-mute text-sm mb-4">
                  Each account is scored against every other on handle, display name, writing-style
                  fingerprint, posting-time profile and shared vocabulary. Strong links collapse into
                  one identity; a same-named account with different behaviour is{" "}
                  <span className="text-signal-warn">flagged but kept separate</span> — avoiding false
                  attribution.
                </p>
                <IdentityGraph correlation={correlation} />
              </div>
            )}

            {/* Cross-platform interaction network with a time scrubber */}
            {report.network?.nodes?.length > 0 && (
              <div>
                <h3 className="text-xl font-bold font-serif text-paper-50 mb-1 flex items-center gap-2">
                  <Network className="w-5 h-5 text-rust-300" /> Cross-platform network
                </h3>
                <p className="text-mute text-sm mb-4">
                  Who the target interacts with across platforms, grouped by the resolved identity.
                  Larger amber nodes are contacts reached on more than one platform. Drag the scrubber
                  (or press play) to watch the network form over the {Math.round(
                    (report.network.timeRange.endMs - report.network.timeRange.startMs) / 86400000,
                  )}
                  -day observed window.
                </p>
                <NetworkGraph network={report.network} />
              </div>
            )}

            {/* Computed matches (textual summary derived from the engine) */}
            <div>
              <h3 className="text-xl font-bold font-serif text-paper-50 mb-4">Computed identity matches</h3>
              <div className="space-y-2">
                {report.crossPlatformMatches.map((m, i) => (
                  <Card key={i} className="bg-ink-820/60 border-ink-700">
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-rust-300">@{m.username}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${confColor[m.band]}`}
                      >
                        {m.band}
                      </span>
                      <span className="text-mute text-sm font-mono">{m.platforms.join(" · ")}</span>
                      <span className="text-faint text-xs basis-full">{m.evidence}</span>
                    </CardContent>
                  </Card>
                ))}
                {report.crossPlatformMatches.length === 0 && (
                  <p className="text-faint text-sm">No accounts met the merge threshold.</p>
                )}
              </div>
            </div>

            {/* Chain of custody */}
            <div>
              <h3 className="text-xl font-bold font-serif text-paper-50 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rust-300" /> Chain of custody
              </h3>
              <p className="text-mute text-sm mb-4">
                Append-only SHA-256 hash chain. Each entry binds an artifact&apos;s content hash to
                the previous entry — tampering with any artifact breaks the root hash.
              </p>
              <Card className="bg-ink-900/70 border-ink-700">
                <CardContent className="p-5 space-y-4">
                  {custody?.map((e) => (
                    <div key={e.seq} className="border-b border-ink-700 pb-3 last:border-0 last:pb-0">
                      <div className="text-sm text-paper-50 font-medium">
                        #{e.seq} {e.step} — {e.artifact}
                      </div>
                      <div className="mt-1 text-xs space-y-0.5">
                        <div>
                          <span className="text-faint font-mono">sha256 </span>
                          <Mono>{e.sha256}</Mono>
                        </div>
                        <div>
                          <span className="text-faint font-mono">prev&nbsp;&nbsp; </span>
                          <Mono>{e.prevHash}</Mono>
                        </div>
                        <div>
                          <span className="text-faint font-mono">entry&nbsp; </span>
                          <Mono>{e.entryHash}</Mono>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-rust-500/30">
                    <div className="text-xs text-mute mb-1">ROOT HASH (integrity seal)</div>
                    <div className="font-mono text-sm text-signal-ok break-all">
                      {manifest?.rootHash}
                    </div>
                  </div>
                  {manifest?.seal && (
                    <div className="pt-3 border-t border-ink-700">
                      <div className="text-xs text-mute mb-1 flex items-center gap-1.5 font-mono">
                        <KeyRound className="w-3.5 h-3.5 text-rust-300" />
                        {manifest.seal.algorithm} SIGNATURE over the root hash
                      </div>
                      <Mono>{manifest.seal.signature}</Mono>
                      <p className="text-faint text-xs mt-2">{manifest.seal.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Downloads */}
            <div>
              <h3 className="text-xl font-bold font-serif text-paper-50 mb-4">Download the real artifacts</h3>
              <div className="flex flex-wrap gap-3">
                <a href="/demo/report.pdf" download>
                  <Button className="bg-rust-500 hover:bg-rust-400 text-paper-50">
                    <Download className="w-4 h-4 mr-2" /> report.pdf
                  </Button>
                </a>
                <a href="/demo/report.json" download>
                  <Button variant="outline" className="border-ink-700 text-paper-50 bg-ink-820">
                    <Download className="w-4 h-4 mr-2" /> report.json
                  </Button>
                </a>
                <a href="/demo/correlation.json" download>
                  <Button variant="outline" className="border-ink-700 text-paper-50 bg-ink-820">
                    <Download className="w-4 h-4 mr-2" /> correlation.json
                  </Button>
                </a>
                <a href="/demo/manifest.json" download>
                  <Button variant="outline" className="border-ink-700 text-paper-50 bg-ink-820">
                    <Download className="w-4 h-4 mr-2" /> manifest.json
                  </Button>
                </a>
                <a href="/demo/custody-log.json" download>
                  <Button variant="outline" className="border-ink-700 text-paper-50 bg-ink-820">
                    <Download className="w-4 h-4 mr-2" /> custody-log.json
                  </Button>
                </a>
              </div>
              <p className="text-faint text-xs mt-3">
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
