import React, { useState, useEffect } from "react";

// Identity correlation graph. Renders the engine's output (scraper/src/replay/
// correlation.ts): account nodes laid out by the engine's deterministic
// coordinates, edges weighted/coloured by correlation strength. Click an edge to
// see the feature breakdown that justifies (or weakens) the link. Pure SVG — no
// graph library, no physics at render time, so it's deterministic and light.

const CLUSTER_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#a855f7", "#ec4899", "#14b8a6"];
const BAND_STROKE = { high: "#22c55e", medium: "#f59e0b", low: "#6b7280" };

// Human-readable names for the engine's feature keys. Unknown keys fall back to
// the raw key, so a new signal still renders before it gets a friendly name.
const FEATURE_NAMES = {
  handle: "handle similarity",
  name: "display name",
  bio: "bio overlap",
  style: "writing style",
  temporal: "posting hours",
  sharedTerms: "shared vocabulary",
  coPresence: "co-presence (place + time)",
};

const platformGlyph = (p) => (p ? p[0].toUpperCase() : "?");

export default function IdentityGraph({ correlation }) {
  const [selected, setSelected] = useState(null);
  // Edge indices are only valid for the current correlation; reset on change so a
  // stale index can't point at the wrong edge if a new graph is supplied.
  useEffect(() => setSelected(null), [correlation]);
  if (!correlation?.nodes?.length) return null;

  const { nodes, edges, identities } = correlation;
  const maxFollowers = Math.max(...nodes.map((n) => n.followers), 1);
  const nodeR = (n) => 16 + (n.followers / maxFollowers) * 12;

  const selectedEdge = selected != null ? edges[selected] : null;

  return (
    <div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* graph */}
        <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-2">
          <svg viewBox="0 0 1000 640" className="w-full h-auto" role="img" aria-label="Identity correlation graph">
            {/* edges first so nodes sit on top */}
            {edges.map((e, i) => {
              const a = nodes[e.source];
              const b = nodes[e.target];
              const active = selected === i;
              // Colour/dash are driven by MERGE STATE first (green solid = merged,
              // amber dashed = flagged-not-merged) so the visual matches the
              // legend exactly — score band is a secondary detail in the panel.
              const merged = e.score >= correlation.thresholds.merge;
              const stroke = merged ? BAND_STROKE.high : BAND_STROKE.medium;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeWidth={active ? 7 : 1.5 + e.score * 5}
                  strokeOpacity={active ? 0.95 : merged ? 0.8 : 0.45}
                  strokeDasharray={merged ? "0" : "7 5"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(i)}
                />
              );
            })}
            {/* edge score labels for strong links */}
            {edges
              .filter((e) => e.score >= correlation.thresholds.merge)
              .map((e, i) => {
                const a = nodes[e.source];
                const b = nodes[e.target];
                return (
                  <text
                    key={`l${i}`}
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 6}
                    fill="#9ca3af"
                    fontSize="14"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {e.score.toFixed(2)}
                  </text>
                );
              })}
            {/* nodes */}
            {nodes.map((n) => (
              <g key={n.index} style={{ cursor: "default" }}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={nodeR(n)}
                  fill={CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length]}
                  fillOpacity="0.85"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <text x={n.x} y={n.y + 5} fill="#0b1220" fontSize="15" fontWeight="700" textAnchor="middle">
                  {platformGlyph(n.platform)}
                </text>
                <text x={n.x} y={n.y + nodeR(n) + 16} fill="#e5e7eb" fontSize="14" textAnchor="middle">
                  @{n.username}
                </text>
                <text x={n.x} y={n.y + nodeR(n) + 31} fill="#6b7280" fontSize="12" textAnchor="middle">
                  {n.platform}
                </text>
              </g>
            ))}
          </svg>
          <div className="flex flex-wrap gap-3 px-2 pb-1 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 h-0.5" style={{ background: BAND_STROKE.high }} /> linked (merged)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: BAND_STROKE.medium }} />{" "}
              flagged, not merged
            </span>
            <span className="text-gray-500">· thickness = correlation score · click an edge for evidence</span>
          </div>
        </div>

        {/* side panel: identities + selected edge */}
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-white mb-2">Resolved identities</div>
            <div className="space-y-2">
              {identities.map((id) => (
                <div key={id.id} className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded p-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ background: CLUSTER_COLORS[id.id % CLUSTER_COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {id.label}{" "}
                      <span className="text-gray-500">
                        · {id.accountIndices.length} {id.accountIndices.length === 1 ? "account" : "accounts"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">{id.platforms.join(" · ")}</div>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">
                    {id.cohesion === null ? "single" : `cohesion ${id.cohesion}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white mb-2">Why this link?</div>
            {selectedEdge ? (
              <div className="bg-gray-800/60 border border-gray-700 rounded p-3">
                <div className="text-sm text-white">
                  @{nodes[selectedEdge.source].username}{" "}
                  <span className="text-gray-500">({nodes[selectedEdge.source].platform})</span> ↔ @
                  {nodes[selectedEdge.target].username}{" "}
                  <span className="text-gray-500">({nodes[selectedEdge.target].platform})</span>
                </div>
                <div className="text-xs mt-1 mb-3">
                  score{" "}
                  <span className="font-mono text-blue-300">{selectedEdge.score.toFixed(3)}</span>{" "}
                  <span
                    className="px-1.5 py-0.5 rounded border text-[11px]"
                    style={{ color: BAND_STROKE[selectedEdge.band], borderColor: BAND_STROKE[selectedEdge.band] }}
                  >
                    {selectedEdge.band}
                  </span>{" "}
                  {selectedEdge.score >= correlation.thresholds.merge ? (
                    <span className="text-green-400">→ merged</span>
                  ) : (
                    <span className="text-amber-400">→ flagged, kept separate</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {selectedEdge.features.map((f) => (
                    <div key={f.feature} className="text-xs" title={f.label}>
                      <div className="flex justify-between text-gray-400">
                        <span>{FEATURE_NAMES[f.feature] ?? f.feature}</span>
                        <span className="font-mono">{f.value.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded">
                        <div
                          className="h-1.5 rounded bg-blue-500"
                          style={{ width: `${Math.round((f.contribution / f.weight) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/40 border border-gray-700 rounded p-3 text-xs text-gray-400">
                Click an edge in the graph to see the per-feature evidence (handle, name, writing
                style, posting time, shared vocabulary, and place-and-time co-presence) the engine used.
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-gray-500 text-xs mt-3">
        Method: {correlation.method}
      </p>
    </div>
  );
}
