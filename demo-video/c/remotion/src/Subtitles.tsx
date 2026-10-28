import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { Sub } from "./data.ts";
import { FONT } from "./theme.ts";

/** Kinetic subtitles: words spring up one after the other, the line fades out at its end. Max two lines. */
export const Subtitles: React.FC<{ subs: Sub[] }> = ({ subs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const active = subs.find((s) => t >= s.t0 && t < s.t1);
  if (!active) return null;
  const local = frame - active.t0 * fps;
  const total = (active.t1 - active.t0) * fps;
  const out = interpolate(local, [total - 7, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const words = active.text.split(" ");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          maxWidth: 1480, padding: "16px 34px 20px", borderRadius: 22, background: "rgba(10,28,33,0.82)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.10)",
          fontFamily: FONT, fontSize: 50, fontWeight: 600, lineHeight: 1.22, color: "#fff", textAlign: "center",
          letterSpacing: -0.3,
        }}
      >
        {words.map((w, i) => {
          const s = spring({ frame: local - i * 2.5, fps, config: { damping: 16, stiffness: 190 }, durationInFrames: 18 });
          const accent = /^(Cmd\+B|\/|MyST|Mermaid|Vega-Lite)/.test(w);
          return (
            <span key={i} style={{ display: "inline-block", marginRight: 13, opacity: s, transform: `translateY(${(1 - s) * 22}px)`, color: accent ? "#ffb06a" : "#fff" }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
