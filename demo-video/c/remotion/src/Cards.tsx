import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { C, FONT, MONO } from "./theme.ts";

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = frame * 0.35;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 70% 20%, #11707f 0%, ${C.teal} 38%, ${C.tealDark} 100%)` }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          position: "absolute", width: 520 + i * 90, height: 520 + i * 90, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.06)", left: 1250 + Math.sin((drift + i * 40) / 60) * 40 - i * 60, top: -180 + Math.cos((drift + i * 40) / 70) * 30 + i * 40,
        }} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: C.orange }} />
    </AbsoluteFill>
  );
};

const Words: React.FC<{ text: string; size: number; delay: number; color?: string; weight?: number }> = ({ text, size, delay, color = "#fff", weight = 700 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.1, letterSpacing: -1.2, textAlign: "center" }}>
      {text.split(" ").map((w, i) => {
        const s = spring({ frame: frame - delay - i * 4, fps, config: { damping: 15, stiffness: 150 } });
        return <span key={i} style={{ display: "inline-block", marginRight: size * 0.26, opacity: s, transform: `translateY(${(1 - s) * 50}px) scale(${0.9 + 0.1 * s})` }}>{w}</span>;
      })}
    </div>
  );
};

export const TitleCard: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 11, stiffness: 110 } });
  const bar = interpolate(frame, [18, 48], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tag = spring({ frame: frame - (compact ? 14 : 34), fps, config: { damping: 20 } });
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26, flexDirection: "column" }}>
        <Img src={staticFile("logo.png")} style={{ width: 190, height: 190, transform: `scale(${logo}) rotate(${(1 - logo) * -40}deg)`, filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.4))" }} />
        <Words text="Markdown OKF Schema Studio 1.0" size={104} delay={compact ? 4 : 10} />
        <div style={{ width: 640 * bar, height: 6, borderRadius: 3, background: C.orange }} />
        <div style={{ fontFamily: FONT, fontSize: 46, fontWeight: 500, color: "#d6ebee", opacity: tag, transform: `translateY(${(1 - tag) * 24}px)`, letterSpacing: -0.2 }}>
          Read, review and edit rich Markdown in one page
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const FEATURES = ["Edit in place", "Slash menu", "MyST", "Mermaid and charts", "Review threads", "Cream and Dark"];

export const EndCard: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cmd = "/plugin install markdown-okf-schema-studio";
  const typed = Math.max(0, Math.min(cmd.length, Math.floor((frame - (compact ? 30 : 84)) / 1.1)));
  const pop = (d: number) => spring({ frame: frame - d, fps, config: { damping: 15, stiffness: 140 } });
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
        <Words text="Install it from the Marketplace" size={84} delay={2} />
        <div style={{ opacity: pop(18), transform: `scale(${0.9 + 0.1 * pop(18)})`, fontFamily: MONO, fontSize: 31, color: "#fff", background: "rgba(0,0,0,0.30)", border: `2px solid ${C.orange}`, padding: "16px 34px", borderRadius: 18 }}>
          marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio
        </div>
        {!compact && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 1500, marginTop: 6 }}>
            {FEATURES.map((f, i) => (
              <div key={f} style={{ opacity: pop(36 + i * 5), transform: `translateY(${(1 - pop(36 + i * 5)) * 20}px)`, fontFamily: FONT, fontSize: 32, fontWeight: 600, color: C.cream, background: "rgba(255,255,255,0.12)", padding: "10px 26px", borderRadius: 40 }}>{f}</div>
            ))}
          </div>
        )}
        <div style={{ opacity: pop(compact ? 22 : 70), marginTop: 18, fontFamily: FONT, fontSize: 48, fontWeight: 700, color: C.orange }}>Works with your coding agent</div>
        <div style={{ opacity: pop(compact ? 26 : 78), fontFamily: MONO, fontSize: 34, color: "#fff", background: "rgba(0,0,0,0.38)", padding: "14px 32px", borderRadius: 14, minWidth: 880, textAlign: "left" }}>
          <span style={{ color: C.orange }}>&gt; </span>{cmd.slice(0, typed)}<span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>_</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
