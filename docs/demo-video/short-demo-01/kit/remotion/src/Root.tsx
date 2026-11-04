import React from "react";
import { AbsoluteFill, Audio, Composition, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import take from "./take.json";
import story from "./story.json";

// The demo video: real VS Code footage, full frame, between two green cards.
// Every text and time comes from 01-storyboard.md through story.json.
const FPS = 30;
const C = { teal: "#0d5360", tealDark: "#082f37", tealLight: "#11707f", orange: "#f2822b", accent: "#ffb06a", pale: "#d6ebee" };
const FONT = `-apple-system, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif`;
const VW = 1920, VH = 1080;
const FADE = 8;
// A zoom keeps its rectangle above the caption.
const CLEAR = 0.86;
const MAX_ZOOM = 2;

type Panel = { id: number; start: number; end: number; Title?: string; Subtitle?: string; Caption?: string | null; Callout?: string | null; "Callout place"?: string | null; "Link box"?: string; "Orange line"?: string; Footnote?: string };
const panels = story as Panel[];
const frameOf = (s: number) => Math.round(s * FPS);
export const TOTAL = frameOf(panels[panels.length - 1].end);

const Accented: React.FC<{ text: string; base?: string; delay?: number }> = ({ text, base = "#fff", delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let on = false;
  const words = text.split(" ").map((raw) => {
    const open = raw.startsWith("**"), close = raw.endsWith("**");
    if (open) on = true;
    const w = { t: raw.replaceAll("**", ""), accent: on };
    if (close) on = false;
    return w;
  });
  return <>{words.map((w, i) => {
    const s = spring({ frame: frame - delay - i * 2, fps, config: { damping: 18, stiffness: 170 } });
    return <span key={i} style={{ display: "inline-block", marginRight: i === words.length - 1 ? 0 : "0.26em", opacity: s, transform: `translateY(${(1 - s) * 18}px)`, color: w.accent ? C.accent : base }}>{w.t}</span>;
  })}</>;
};

const Green: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 70% 20%, ${C.tealLight} 0%, ${C.teal} 38%, ${C.tealDark} 100%)` }}>{children}</AbsoluteFill>
);

// The opening card is whole from its first frame: that frame is the poster of the video on X.
const Card: React.FC<{ p: Panel; still?: boolean }> = ({ p, still }) => {
  const frame = useCurrentFrame() + (still ? 120 : 0);
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  const line = interpolate(frame, [6, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Green>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, gap: 26 }}>
        <Img src={staticFile("logo.png")} style={{ width: 170, borderRadius: 85, opacity: pop, transform: `scale(${0.85 + 0.15 * pop})` }} />
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -1.2 }}><Accented text={p.Title!} delay={still ? -120 : 2} /></div>
        <div style={{ width: 520 * line, height: 5, background: C.orange, borderRadius: 3 }} />
        <div style={{ fontSize: 42, fontWeight: 500 }}><Accented text={p.Subtitle!} base={C.pale} delay={still ? -120 : 8} /></div>
        {p["Link box"] ? <div style={{ fontFamily: `"SF Mono", Menlo, monospace`, fontSize: 28, color: "#fff", background: "rgba(0,0,0,0.3)", border: `2px solid ${C.orange}`, padding: "12px 28px", borderRadius: 14, opacity: line }}>{p["Link box"]}</div> : null}
        {p["Orange line"] ? <div style={{ fontSize: 42, fontWeight: 700, color: C.orange, opacity: line }}>{p["Orange line"]}</div> : null}
      </AbsoluteFill>
      {p.Footnote ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, textAlign: "center", fontFamily: FONT, fontSize: 26, fontWeight: 500, color: C.pale, opacity: 0.85 * line }}>{p.Footnote}</div> : null}
    </Green>
  );
};

const track = (t: number) => {
  const m = take.mouse;
  if (t <= m[0].t) return m[0];
  for (let i = 1; i < m.length; i++) if (m[i].t >= t) {
    const k = (t - m[i - 1].t) / Math.max(1e-3, m[i].t - m[i - 1].t);
    return { x: m[i - 1].x + (m[i].x - m[i - 1].x) * k, y: m[i - 1].y + (m[i].y - m[i - 1].y) * k };
  }
  return m[m.length - 1];
};

const PLACES: Record<string, React.CSSProperties> = { "bottom right": { right: 60, bottom: 136 }, "bottom left": { left: 60, bottom: 136 } };

const Shot: React.FC<{ p: Panel; length: number }> = ({ p, length }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [from, to] = (take.spans as Record<string, number[]>)[p.id];
  const rate = (to - from) / (length / fps);
  const t = from + (frame / fps) * rate;
  const [cw, ch] = take.size;
  const k = VW / cw;
  let scale = 1, ox = 0, oy = 0;
  const r = (take.zooms as Record<string, { x: number; y: number; w: number; h: number }>)[p.id];
  if (r) {
    const target = Math.min(MAX_ZOOM, cw / r.w, (CLEAR * ch) / r.h);
    const z = interpolate(frame, [6, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    scale = 1 + (target - 1) * z;
    const fx = Math.min(0, Math.max(VW - VW * target, VW / 2 - (r.x + r.w / 2) * k * target));
    const fy = Math.min(0, Math.max(VH - VH * target, (VH * CLEAR) / 2 - (r.y + r.h / 2) * k * target));
    ox = fx * z; oy = fy * z;
  }
  const m = track(t);
  const ripple = take.clicks.map((c) => (t - c.t) / 0.45).find((v) => v >= 0 && v < 1);
  // A callout lands just after the last click of the panel.
  const lastClick = take.clicks.filter((c) => c.t >= from && c.t < to).at(-1)?.t ?? from;
  const cs = spring({ frame: frame - ((lastClick - from) / rate + 0.25) * fps, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill style={{ background: "#fff", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: VW, height: VH, transformOrigin: "0 0", transform: `translate(${ox}px, ${oy}px) scale(${scale})` }}>
        <OffthreadVideo src={staticFile("clip.mp4")} startFrom={Math.round(from * fps)} playbackRate={rate} muted style={{ width: VW, height: VH }} />
        {ripple !== undefined ? <div style={{ position: "absolute", left: m.x * k - 30, top: m.y * k - 30, width: 60, height: 60, borderRadius: 30, border: `4px solid ${C.orange}`, opacity: 1 - ripple, transform: `scale(${0.4 + ripple})` }} /> : null}
        {take.marks.filter((b) => b.id === p.id && t >= b.t && t < b.until).map((b, i) => (
          <div key={i} style={{ position: "absolute", left: (b.x + 2) * k, top: b.y * k, width: (b.w - 4) * k, height: b.h * k, border: `3px solid ${C.orange}`, borderRadius: 8, boxShadow: "0 0 0 3px rgba(242,130,43,0.25)", opacity: Math.min(1, (t - b.t) / 0.25) }} />
        ))}
        <svg style={{ position: "absolute", left: m.x * k - 4, top: m.y * k - 3, width: 32, height: 40 }} viewBox="0 0 20 25"><path d="M3 2 L3 18.5 L7.4 14.6 L10.2 21 L12.9 19.8 L10.1 13.5 L16 13.2 Z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      </div>
      {p.Callout ? <div style={{ position: "absolute", ...PLACES[p["Callout place"] ?? "bottom right"], opacity: cs, transform: `scale(${0.9 + 0.1 * cs})`, fontFamily: FONT, fontSize: 36, fontWeight: 700, color: "#fff", background: C.orange, padding: "12px 28px", borderRadius: 30, boxShadow: "0 10px 26px rgba(0,0,0,0.3)" }}>{p.Callout}</div> : null}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT, fontSize: 50, fontWeight: 600, padding: "16px 44px", borderRadius: 48, background: `linear-gradient(120deg, ${C.teal}, ${C.tealDark})`, boxShadow: "0 14px 34px rgba(0,0,0,0.35)" }}>
          <Accented text={p.Caption!} delay={FADE} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ first?: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first ? 1 : interpolate(frame, [0, FADE], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Video: React.FC = () => (
  <AbsoluteFill style={{ background: C.tealDark }}>
    <Audio src={staticFile("music.wav")} />
    {panels.map((p, i) => {
      const from = frameOf(p.start), length = frameOf(p.end) - from + (i < panels.length - 1 ? FADE : 0);
      return (
        <Sequence key={p.id} from={from} durationInFrames={length}>
          <Fade first={i === 0}>{p.Title ? <Card p={p} still={i === 0} /> : <Shot p={p} length={length} />}</Fade>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

export const Root: React.FC = () => <Composition id="Video" component={Video} durationInFrames={TOTAL} fps={FPS} width={VW} height={VH} />;
