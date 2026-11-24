import React from "react";
import { AbsoluteFill, Composition, Easing, Freeze, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import take from "./take.json";
import story from "./story.json";

// A feature clip: real VS Code footage, full frame, no card. Every text and time comes from clip.md
// through story.json; the cursor, clicks, zoom rectangle and marks come from the take (take.json).
// The composition's size and frame rate are the storyboard's. Every dimension below is designed for a
// 1920 px wide frame and scaled by U; every duration is in seconds and converted with the frame rate.
type Rect = { x: number; y: number; w: number; h: number };
const s = story as { length: number; width: number; height: number; fps: number; captions: { text: string; from: number; to: number }[]; badges: Record<string, string>; zoom?: { id: string; holdTo: number }; marks: { id: string; from: number; to: number }[]; logo: string; rate: number };
const FPS = s.fps;
const W = s.width, H = s.height;
const U = W / 1920;
const px = (design: number) => design * U;
const frames = (seconds: number) => Math.round(seconds * FPS);

const C = { teal: "#0d5360", tealDark: "#082f37", orange: "#f2822b", accent: "#ffb06a" };
const FONT = `-apple-system, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif`;
// A zoom keeps its rectangle above the caption.
const CLEAR = 0.86;
const MAX_ZOOM = 2;
const ZOOM_SECONDS = 0.6;
const BADGE_SHOW = 1.2;
const BADGE_FADE = 1 / 3;
const MARK_FADE = 0.2;
const CAPTION_FADE = 0.2;
// The loop: the last frames cross-fade toward frame 0 and stop one frame short of it.
const SEAM = 8 / 30;
export const TOTAL = frames(s.length);

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

const Key: React.FC<{ k: string }> = ({ k }) => (
  <div style={{ fontFamily: FONT, fontSize: px(44), fontWeight: 700, color: "#1d2b2f", background: "#fff", border: `${px(3)}px solid #9fb2b6`, borderBottomWidth: px(7), borderRadius: px(14), padding: `${px(6)}px ${px(24)}px`, minWidth: px(40), textAlign: "center", boxShadow: `0 ${px(8)}px ${px(20)}px rgba(0,0,0,0.3)` }}>{k}</div>
);

// "Ctrl+C" is the keys Ctrl and C; "⌘C" is the keys ⌘ and C.
const keysOf = (group: string) => (group.startsWith("⌘") ? ["⌘", group.slice(1)] : group.split("+"));

// A badge "Ctrl+C / ⌘C" shows two groups of keys separated by a white "/".
const Keycaps: React.FC<{ text: string; opacity: number; scale: number }> = ({ text, opacity, scale }) => (
  <div style={{ display: "flex", gap: px(10), alignItems: "center", opacity, transform: `scale(${scale})` }}>
    {text.split(" / ").map((group, g) => (
      <React.Fragment key={g}>
        {g > 0 ? <div style={{ fontFamily: FONT, fontSize: px(44), fontWeight: 700, color: "#fff", textShadow: `0 ${px(2)}px ${px(8)}px rgba(0,0,0,0.6)`, margin: `0 ${px(8)}px` }}>/</div> : null}
        {keysOf(group).map((key, i) => <Key key={i} k={key} />)}
      </React.Fragment>
    ))}
  </div>
);

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rate = s.rate;
  const t = (frame / fps) * rate;
  const [cw, ch] = take.size;
  const k = W / cw;
  let scale = 1, ox = 0, oy = 0;
  const zoom = take.zooms[0] as (Rect & { t: number }) | undefined;
  if (zoom && s.zoom) {
    const target = Math.min(MAX_ZOOM, cw / zoom.w, (CLEAR * ch) / zoom.h);
    const inStart = Math.round((zoom.t / rate) * fps);
    const outStart = Math.round(s.zoom.holdTo * fps);
    const zoomFrames = frames(ZOOM_SECONDS);
    const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) } as const;
    const z = interpolate(frame, [inStart, inStart + zoomFrames], [0, 1], ease) - interpolate(frame, [outStart, outStart + zoomFrames], [0, 1], ease);
    scale = 1 + (target - 1) * z;
    const fx = Math.min(0, Math.max(W - W * target, W / 2 - (zoom.x + zoom.w / 2) * k * target));
    const fy = Math.min(0, Math.max(H - H * target, (H * CLEAR) / 2 - (zoom.y + zoom.h / 2) * k * target));
    ox = fx * z;
    oy = fy * z;
  }
  const m = track(t);
  const ripple = take.clicks.map((c) => (t - c.t) / 0.45).find((v) => v >= 0 && v < 1);
  // The marks are shown in turn, each fading in and out inside its own from/to.
  const markFade = frames(MARK_FADE);
  const markOpacity = (from: number, to: number) => interpolate(frame, [from * fps, from * fps + markFade, to * fps - markFade, to * fps], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shownMarks = s.marks.map((sm) => ({ mark: take.marks.find((candidate) => candidate.id === sm.id), opacity: markOpacity(sm.from, sm.to) })).filter((shown) => shown.mark && shown.opacity > 0);
  return (
    <AbsoluteFill style={{ background: "#fff", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: W, height: H, transformOrigin: "0 0", transform: `translate(${ox}px, ${oy}px) scale(${scale})` }}>
        <OffthreadVideo src={staticFile("clip.mp4")} playbackRate={rate} muted style={{ width: W, height: H }} />
        {ripple !== undefined ? <div style={{ position: "absolute", left: m.x * k - px(30), top: m.y * k - px(30), width: px(60), height: px(60), borderRadius: px(30), border: `${px(4)}px solid ${C.orange}`, opacity: 1 - ripple, transform: `scale(${0.4 + ripple})` }} /> : null}
        {shownMarks.map(({ mark, opacity }) => (
          <div key={mark!.id} style={{ position: "absolute", left: (mark!.x + 2) * k, top: mark!.y * k, width: (mark!.w - 4) * k, height: mark!.h * k, border: `${px(3)}px solid ${C.orange}`, borderRadius: px(8), boxShadow: `0 0 0 ${px(3)}px rgba(242,130,43,0.25)`, opacity }} />
        ))}
        <svg style={{ position: "absolute", left: m.x * k - px(4), top: m.y * k - px(3), width: px(32), height: px(40) }} viewBox="0 0 20 25"><path d="M3 2 L3 18.5 L7.4 14.6 L10.2 21 L12.9 19.8 L10.1 13.5 L16 13.2 Z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: px(150), display: "flex", justifyContent: "center" }}>
        {take.presses.map((press) => {
          const start = Math.round((press.t / rate) * fps);
          const show = frames(BADGE_SHOW), fadeOut = frames(BADGE_FADE);
          if (frame < start || frame >= start + show + fadeOut) return null;
          const pop = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 200 } });
          const fade = interpolate(frame, [start + show, start + show + fadeOut], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <div key={press.id + press.t} style={{ position: "absolute", bottom: 0 }}><Keycaps text={s.badges[press.id]} opacity={Math.min(1, pop) * fade} scale={0.8 + 0.2 * pop} /></div>;
        })}
      </div>
      {s.captions.map((cap, i) => {
        // One caption pill per beat: the first is shown from frame 0, the last to the end, two fade over their boundary.
        const first = i === 0, last = i === s.captions.length - 1;
        const fade = frames(CAPTION_FADE);
        const opacity = interpolate(frame, [cap.from * fps - (first ? 1 : 0), cap.from * fps + (first ? 0 : fade), cap.to * fps - (last ? 0 : fade), cap.to * fps + (last ? 1 : 0)], [first ? 1 : 0, 1, 1, last ? 1 : 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (opacity <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, bottom: px(34), display: "flex", justifyContent: "center", opacity }}>
            <div style={{ fontFamily: FONT, fontSize: px(50), fontWeight: 600, padding: `${px(16)}px ${px(44)}px`, borderRadius: px(48), background: `linear-gradient(120deg, ${C.teal}, ${C.tealDark})`, boxShadow: `0 ${px(14)}px ${px(34)}px rgba(0,0,0,0.35)` }}>
              <Caption text={cap.text} />
            </div>
          </div>
        );
      })}
      <Img src={staticFile("logo.png")} style={{ position: "absolute", top: px(24), right: px(24), width: px(56), height: px(56), borderRadius: px(28), opacity: 0.85 }} />
    </AbsoluteFill>
  );
};

const ClipScene: React.FC = () => {
  const frame = useCurrentFrame();
  // The weight of frame 0 rises from 1/(n+1) at the first seam frame to n/(n+1) at the last, so the last
  // frame is never frame 0 itself. It rises with an ease-out: at a low frame rate (n is 4 at 15 fps) a
  // linear ramp would leave the last frame too far from frame 0 for the loop to read as continuous.
  const seamFrames = frames(SEAM);
  const ramp = frame >= TOTAL - seamFrames ? (frame - (TOTAL - seamFrames - 1)) / (seamFrames + 1) : 0;
  const seam = 1 - (1 - ramp) ** 2;
  return (
    <AbsoluteFill>
      <Scene />
      {seam > 0 ? <AbsoluteFill style={{ opacity: seam }}><Freeze frame={0}><Scene /></Freeze></AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => <Composition id="Clip" component={ClipScene} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />;
