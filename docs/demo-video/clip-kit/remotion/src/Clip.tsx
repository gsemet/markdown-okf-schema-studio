import React from "react";
import { AbsoluteFill, Composition, Easing, Freeze, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import take from "./take.json";
import story from "./story.json";

// A feature clip: real VS Code footage, full frame, no card. Every text and time comes from clip.md
// through story.json; the cursor, clicks, zoom rectangle and mark come from the take (take.json).
const FPS = 30;
const C = { teal: "#0d5360", tealDark: "#082f37", orange: "#f2822b", accent: "#ffb06a" };
const FONT = `-apple-system, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif`;
const VW = 1920, VH = 1080;
// A zoom keeps its rectangle above the caption.
const CLEAR = 0.86;
const MAX_ZOOM = 2;
const ZOOM_FRAMES = 18;
const BADGE_SHOW = 36;
const BADGE_FADE = 10;
const MARK_FADE = 6;
// The loop: the last frames cross-fade toward frame 0 and stop one frame short of it.
const SEAM = 8;

type Rect = { x: number; y: number; w: number; h: number };
const s = story as { length: number; caption: string; badges: Record<string, string>; zoom?: { id: string; holdTo: number }; mark?: { id: string; from: number; to: number }; logo: string; rate: number };
export const TOTAL = Math.round(s.length * FPS);

const track = (t: number) => {
  const m = take.mouse;
  if (t <= m[0].t) return m[0];
  for (let i = 1; i < m.length; i++) if (m[i].t >= t) {
    const k = (t - m[i - 1].t) / Math.max(1e-3, m[i].t - m[i - 1].t);
    return { x: m[i - 1].x + (m[i].x - m[i - 1].x) * k, y: m[i - 1].y + (m[i].y - m[i - 1].y) * k };
  }
  return m[m.length - 1];
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  let on = false;
  const words = text.split(" ").map((raw) => {
    if (raw.startsWith("**")) on = true;
    const word = { t: raw.replaceAll("**", ""), accent: on };
    if (raw.endsWith("**")) on = false;
    return word;
  });
  return (
    <>
      {words.map((w, i) => (
        <span key={i} style={{ marginRight: i === words.length - 1 ? 0 : "0.26em", color: w.accent ? C.accent : "#fff" }}>{w.t}</span>
      ))}
    </>
  );
};

const Keycaps: React.FC<{ text: string; opacity: number; scale: number }> = ({ text, opacity, scale }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", opacity, transform: `scale(${scale})` }}>
    {text.split("+").map((key, i) => (
      <div key={i} style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: "#1d2b2f", background: "#fff", border: "3px solid #9fb2b6", borderBottomWidth: 7, borderRadius: 14, padding: "6px 24px", minWidth: 40, textAlign: "center", boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}>{key}</div>
    ))}
  </div>
);

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rate = s.rate;
  const t = (frame / fps) * rate;
  const [cw, ch] = take.size;
  const k = VW / cw;
  let scale = 1, ox = 0, oy = 0;
  const zoom = take.zooms[0] as (Rect & { t: number }) | undefined;
  if (zoom && s.zoom) {
    const target = Math.min(MAX_ZOOM, cw / zoom.w, (CLEAR * ch) / zoom.h);
    const inStart = Math.round((zoom.t / rate) * fps);
    const outStart = Math.round(s.zoom.holdTo * fps);
    const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) } as const;
    const z = interpolate(frame, [inStart, inStart + ZOOM_FRAMES], [0, 1], ease) - interpolate(frame, [outStart, outStart + ZOOM_FRAMES], [0, 1], ease);
    scale = 1 + (target - 1) * z;
    const fx = Math.min(0, Math.max(VW - VW * target, VW / 2 - (zoom.x + zoom.w / 2) * k * target));
    const fy = Math.min(0, Math.max(VH - VH * target, (VH * CLEAR) / 2 - (zoom.y + zoom.h / 2) * k * target));
    ox = fx * z;
    oy = fy * z;
  }
  const m = track(t);
  const ripple = take.clicks.map((c) => (t - c.t) / 0.45).find((v) => v >= 0 && v < 1);
  const mark = s.mark ? take.marks.find((candidate) => candidate.id === s.mark!.id) : undefined;
  const markOpacity = s.mark
    ? interpolate(frame, [s.mark.from * fps, s.mark.from * fps + MARK_FADE, s.mark.to * fps - MARK_FADE, s.mark.to * fps], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  return (
    <AbsoluteFill style={{ background: "#fff", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: VW, height: VH, transformOrigin: "0 0", transform: `translate(${ox}px, ${oy}px) scale(${scale})` }}>
        <OffthreadVideo src={staticFile("clip.mp4")} playbackRate={rate} muted style={{ width: VW, height: VH }} />
        {ripple !== undefined ? <div style={{ position: "absolute", left: m.x * k - 30, top: m.y * k - 30, width: 60, height: 60, borderRadius: 30, border: `4px solid ${C.orange}`, opacity: 1 - ripple, transform: `scale(${0.4 + ripple})` }} /> : null}
        {mark && markOpacity > 0 ? (
          <div style={{ position: "absolute", left: (mark.x + 2) * k, top: mark.y * k, width: (mark.w - 4) * k, height: mark.h * k, border: `3px solid ${C.orange}`, borderRadius: 8, boxShadow: "0 0 0 3px rgba(242,130,43,0.25)", opacity: markOpacity }} />
        ) : null}
        <svg style={{ position: "absolute", left: m.x * k - 4, top: m.y * k - 3, width: 32, height: 40 }} viewBox="0 0 20 25"><path d="M3 2 L3 18.5 L7.4 14.6 L10.2 21 L12.9 19.8 L10.1 13.5 L16 13.2 Z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", justifyContent: "center" }}>
        {take.presses.map((press) => {
          const start = Math.round((press.t / rate) * fps);
          if (frame < start || frame >= start + BADGE_SHOW + BADGE_FADE) return null;
          const pop = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 200 } });
          const fade = interpolate(frame, [start + BADGE_SHOW, start + BADGE_SHOW + BADGE_FADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <div key={press.id + press.t} style={{ position: "absolute", bottom: 0 }}><Keycaps text={s.badges[press.id]} opacity={Math.min(1, pop) * fade} scale={0.8 + 0.2 * pop} /></div>;
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT, fontSize: 50, fontWeight: 600, padding: "16px 44px", borderRadius: 48, background: `linear-gradient(120deg, ${C.teal}, ${C.tealDark})`, boxShadow: "0 14px 34px rgba(0,0,0,0.35)" }}>
          <Caption text={s.caption} />
        </div>
      </div>
      <Img src={staticFile("logo.png")} style={{ position: "absolute", top: 24, right: 24, width: 56, height: 56, borderRadius: 28, opacity: 0.85 }} />
    </AbsoluteFill>
  );
};

const ClipScene: React.FC = () => {
  const frame = useCurrentFrame();
  // 1/9 at the first seam frame up to 8/9 at the last: the last frame is never frame 0 itself.
  const seam = frame >= TOTAL - SEAM ? (frame - (TOTAL - SEAM - 1)) / (SEAM + 1) : 0;
  return (
    <AbsoluteFill>
      <Scene />
      {seam > 0 ? <AbsoluteFill style={{ opacity: seam }}><Freeze frame={0}><Scene /></Freeze></AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Clip" component={ClipScene} durationInFrames={TOTAL} fps={FPS} width={VW} height={VH} />;
