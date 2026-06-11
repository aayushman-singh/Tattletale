import React, { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";

// Cross-platform interaction graph with a time scrubber. Renders the engine's
// normalized network (scraper/src/replay/network.ts): the target's own accounts
// (self nodes, grouped by identity cluster) plus the contacts they interact with,
// edges drawn as the timeline advances. Pure SVG + a range slider — no graph
// library, deterministic layout from the engine. Drag the scrubber (or hit play)
// to watch the network form over the observed window.

const LINK_COLOR = {
  follow: "#5a86c0",
  mutual: "#45a06a",
  message: "#9b7bc0",
  mention: "#d99a32",
  reply: "#3f9aa0",
};
const CLUSTER_COLORS = ["#c0492e", "#d99a32", "#45a06a", "#9b7bc0", "#cf6a96"];

const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function NetworkGraph({ network }) {
  const { startMs, endMs } = network?.timeRange ?? {};
  const [t, setT] = useState(endMs ?? 0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(null);

  // Reset when a new network arrives.
  useEffect(() => setT(endMs ?? 0), [endMs]);

  // Play: sweep t from start to end, then stop.
  useEffect(() => {
    if (!playing) return;
    if (t >= endMs) setT(startMs);
    const span = Math.max(1, endMs - startMs);
    const step = span / 90; // ~3s at 30fps
    let last = t <= startMs ? startMs : t;
    const tick = () => {
      last += step;
      if (last >= endMs) {
        setT(endMs);
        setPlaying(false);
        return;
      }
      setT(last);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!network?.nodes?.length) return null;

  const byId = Object.fromEntries(network.nodes.map((n) => [n.id, n]));
  const activeLinks = network.links.filter((l) => l.t <= t);
  const activeNodeIds = new Set(activeLinks.flatMap((l) => [l.source, l.target]));

  return (
    <div className="bg-ink-900/70 border border-ink-700 rounded-lg p-3">
      <svg viewBox="0 0 1000 640" className="w-full h-auto" role="img" aria-label="Cross-platform interaction graph">
        {activeLinks.map((l, i) => {
          const a = byId[l.source];
          const b = byId[l.target];
          if (!a || !b) return null;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LINK_COLOR[l.type] || "#6b6253"} strokeWidth="2" strokeOpacity="0.55" />
          );
        })}
        {network.nodes.map((n) => {
          const on = n.kind === "self" || activeNodeIds.has(n.id);
          const r = n.kind === "self" ? 22 : n.crossPlatform ? 13 : 9;
          const fill = n.kind === "self" ? CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length] : n.crossPlatform ? "#d99a32" : "#5c5346";
          return (
            <g key={n.id} opacity={on ? 1 : 0.18}>
              <circle cx={n.x} cy={n.y} r={r} fill={fill} fillOpacity={n.kind === "self" ? 0.9 : 0.85} stroke="#0c0a08" strokeWidth="2" />
              {n.kind === "self" && (
                <text x={n.x} y={n.y + 4} fill="#0c0a08" fontSize="12" fontWeight="700" textAnchor="middle">
                  {n.platform[0].toUpperCase()}
                </text>
              )}
              <text x={n.x} y={n.y + r + 14} fill={n.kind === "self" ? "#e6dccb" : "#998f7e"} fontSize={n.kind === "self" ? 14 : 12} textAnchor="middle">
                {n.kind === "self" ? n.platform : `@${n.label}`}
              </text>
            </g>
          );
        })}
      </svg>

      {/* time scrubber */}
      <div className="flex items-center gap-3 px-1 pt-2">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-rust-500 hover:bg-rust-400 text-paper-50"
          aria-label={playing ? "Pause" : "Play timeline"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min={startMs}
          max={endMs}
          value={t}
          step={Math.max(1, Math.round((endMs - startMs) / 200))}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          className="flex-1 accent-rust-500"
          aria-label="Interaction timeline"
        />
        <span className="shrink-0 text-xs text-paper-300 tabular-nums w-44 text-right font-mono">
          {fmtDate(t)} · {activeLinks.length}/{network.links.length} interactions
        </span>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-2 text-xs text-mute">
        {Object.entries(LINK_COLOR).map(([type, c]) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span className="inline-block w-4 h-0.5" style={{ background: c }} /> {type}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#d99a32" }} /> contact on 2+ platforms
        </span>
      </div>
    </div>
  );
}
