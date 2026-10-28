import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { SceneDef, FPS, VW, VH, W, H, segDur, outToSrc, srcToOut, sceneDur, Cam } from "./data.ts";
import { C, FONT } from "./theme.ts";
import clipdata from "./clipdata/index.ts";

const S = W / VW; // canvas px per viewport px (1.5)
const ease = Easing.inOut(Easing.cubic);

function camAt(cams: Cam[], t: number): { x: number; y: number; z: number } {
  let cur = { x: cams[0].x, y: cams[0].y, z: cams[0].z };
  for (let i = 1; i < cams.length; i++) {
    const k = cams[i];
    if (t < k.t) break;
    const d = k.d ?? 0.9;
    const p = Math.min(1, (t - k.t) / d);
    const e = ease(p);
    const next = { x: cur.x + (k.x - cur.x) * e, y: cur.y + (k.y - cur.y) * e, z: Math.exp(Math.log(cur.z) + (Math.log(k.z) - Math.log(cur.z)) * e) };
    if (p < 1) return next;
    cur = { x: k.x, y: k.y, z: k.z };
  }
  return cur;
}
const clampCam = (c: { x: number; y: number; z: number }) => ({
  z: c.z,
  x: Math.min(VW - VW / 2 / c.z, Math.max(VW / 2 / c.z, c.x)),
  y: Math.min(VH - VH / 2 / c.z, Math.max(VH / 2 / c.z, c.y)),
});

function cursorAt(path: number[][], t: number): [number, number] {
  if (t <= path[0][0]) return [path[0][1], path[0][2]];
  let lo = 0, hi = path.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m][0] <= t) lo = m; else hi = m; }
  const a = path[lo], b = path[hi];
  if (t >= b[0]) return [b[1], b[2]];
  const k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

const Arrow: React.FC = () => (
  <svg width="46" height="46" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.45))" }}>
    <path d="M3 2 L3 18.5 L7.4 14.6 L10.2 21 L12.9 19.8 L10.1 13.5 L16 13.2 Z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const Scene: React.FC<{ sc: SceneDef; index: number }> = ({ sc, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = frame / fps;
  const dur = sceneDur(sc);
  const src = outToSrc(sc, Math.min(out, dur - 1e-3)) + Math.max(0, out - (dur - (sc.hold ?? 0)));
  const data = (clipdata as any)[sc.clip];
  const cam = clampCam(camAt(sc.cam, src));
  const tx = (px: number) => (px - cam.x) * S * cam.z + W / 2;
  const ty = (py: number) => (py - cam.y) * S * cam.z + H / 2;

  // Video segments (speed changes are separate sequences of the same clip)
  let offset = 0;
  const segs = sc.segs.map((s, i) => {
    const d = Math.round(segDur(s) * FPS);
    const el = (
      <Sequence key={i} from={Math.round(offset * FPS)} durationInFrames={d + (i === sc.segs.length - 1 ? Math.round((sc.hold ?? 0) * FPS) + 2 : 1)}>
        <OffthreadVideo src={staticFile(`clips/${sc.clip}.mp4`)} startFrom={Math.round(s.a * FPS)} playbackRate={s.rate ?? 1} muted style={{ width: W, height: H }} />
      </Sequence>
    );
    offset += segDur(s);
    return el;
  });

  const [cxv, cyv] = cursorAt(data.cursor, src);
  const cx = tx(cxv), cy = ty(cyv);
  const clickRipples = (data.clicks as number[]).map((c, i) => {
    const dt = src - c;
    if (dt < 0 || dt > 0.7) return null;
    const [rx, ry] = cursorAt(data.cursor, c);
    const k = dt / 0.7;
    return (
      <div key={i} style={{ position: "absolute", left: tx(rx) - 60, top: ty(ry) - 60, width: 120, height: 120, borderRadius: "50%",
        border: `5px solid ${C.orange}`, background: `rgba(242,130,43,${0.22 * (1 - k)})`, opacity: 1 - k, transform: `scale(${0.25 + 0.95 * Easing.out(Easing.cubic)(k)})` }} />
    );
  });
  const clicking = (data.clicks as number[]).some((c) => src >= c && src < c + 0.14);

  const chapterIn = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  const chapterOut = interpolate(out, [2.6, 3.1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${W / 2}px, ${H / 2}px) scale(${cam.z}) translate(${-cam.x * S}px, ${-cam.y * S}px)` }}>
        <div style={{ position: "relative", width: W, height: H }}>{segs}</div>
      </AbsoluteFill>

      {sc.highlights.map((h, i) => {
        const a = srcToOut(sc, h.t0), b = srcToOut(sc, h.t1);
        const v = interpolate(out, [a, a + 0.35, b - 0.3, b], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (v <= 0) return null;
        const [x, y, w, hh] = h.rect;
        return <div key={i} style={{ position: "absolute", left: tx(x) - 8, top: ty(y) - 8, width: w * S * cam.z + 16, height: hh * S * cam.z + 16, border: `5px solid ${C.orange}`, borderRadius: 16,
          boxShadow: `0 0 0 ${(1 - v) * 20}px rgba(242,130,43,0), 0 0 34px rgba(242,130,43,0.55)`, opacity: v }} />;
      })}

      {clickRipples}
      <div style={{ position: "absolute", left: cx - 4, top: cy - 3, transform: `scale(${clicking ? 0.86 : 1})`, transformOrigin: "6px 4px" }}><Arrow /></div>

      {sc.callouts.map((c, i) => {
        const a = srcToOut(sc, c.t0), b = srcToOut(sc, c.t1);
        if (out < a || out > b + 0.3) return null;
        const s = spring({ frame: frame - a * fps, fps, config: { damping: 14, stiffness: 170 } });
        const fade = interpolate(out, [b - 0.1, b + 0.25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const ax = tx(c.x), ay = ty(c.y);
        const pw = c.text.length * (c.kbd ? 40 : 21) + 70;
        const px = Math.min(W - 30 - pw / 2, Math.max(30 + pw / 2, ax + c.dx)), py = Math.min(H - 190, Math.max(60, ay + c.dy));
        return (
          <React.Fragment key={i}>
            <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: fade * s, pointerEvents: "none" }}>
              <line x1={ax} y1={ay} x2={px} y2={py} stroke={C.orange} strokeWidth={4} strokeLinecap="round" />
              <circle cx={ax} cy={ay} r={9} fill={C.orange} stroke="#fff" strokeWidth={3} />
            </svg>
            <div style={{ position: "absolute", left: px, top: py, transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * s})`, opacity: fade * s,
              fontFamily: c.kbd ? FONT : FONT, fontSize: c.kbd ? 64 : 38, fontWeight: 700, color: "#fff", background: c.kbd ? "linear-gradient(#3a4a50,#1f2b30)" : C.teal,
              padding: c.kbd ? "10px 38px 14px" : "12px 28px 15px", borderRadius: c.kbd ? 20 : 40, boxShadow: "0 14px 34px rgba(0,0,0,0.38)", border: c.kbd ? "3px solid rgba(255,255,255,0.35)" : `3px solid ${C.orange}`, whiteSpace: "nowrap" }}>
              {c.text}
            </div>
          </React.Fragment>
        );
      })}

      {index >= 0 && (
        <div style={{ position: "absolute", left: 56, top: 52, opacity: chapterIn * chapterOut, transform: `translateX(${(1 - chapterIn) * -60}px)`, display: "flex", alignItems: "center", gap: 16,
          fontFamily: FONT, color: "#fff", background: "rgba(8,47,55,0.88)", padding: "10px 28px 12px 14px", borderRadius: 14, boxShadow: "0 10px 28px rgba(0,0,0,0.35)" }}>
          <div style={{ background: C.orange, color: "#fff", fontSize: 30, fontWeight: 800, borderRadius: 10, padding: "2px 12px" }}>{String(index + 1).padStart(2, "0")}</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{sc.chapter}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
