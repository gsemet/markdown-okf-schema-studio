// Single source of truth for the edit: scenes, camera, callouts and subtitles.
// Times inside a scene are SOURCE seconds of the recorded clip (see scripts/record_clips.py marks).
// Viewport coordinates are the 1280x720 CSS px of the recorded page.
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const VW = 1280; // recorded viewport
export const VH = 720;

export type Seg = { a: number; b: number; rate?: number }; // source seconds, playback rate
export type Cam = { t: number; x: number; y: number; z: number; d?: number };
export type Callout = { t0: number; t1: number; text: string; x: number; y: number; dx: number; dy: number; kbd?: boolean };
export type Highlight = { t0: number; t1: number; rect: [number, number, number, number] };
export type Sub = { t0: number; t1: number; text: string };
export type SceneDef = {
  id: string;
  clip: string; // file under public/clips and src/clipdata
  chapter: string;
  segs: Seg[];
  hold?: number; // seconds the last frame is held after the segments
  cam: Cam[];
  callouts: Callout[];
  highlights: Highlight[];
  subs: Sub[];
};

export const TRANSITION = 0.55; // seconds of overlap between two scenes

export const SCENES: SceneDef[] = [
  {
    id: "open", clip: "s2_open", chapter: "Open the preview",
    segs: [{ a: 0, b: 5.7 }], hold: 1.6,
    cam: [
      { t: 0, x: 640, y: 360, z: 1.0 },
      { t: 0.5, x: 640, y: 200, z: 1.3, d: 1.3 },
      { t: 3.0, x: 640, y: 440, z: 1.4, d: 1.1 },
      { t: 5.3, x: 640, y: 360, z: 1.0, d: 1.4 },
    ],
    callouts: [
      { t0: 0.9, t1: 2.9, text: "Front matter as a table", x: 1042, y: 185, dx: -10, dy: -118 },
    ],
    highlights: [{ t0: 0.8, t1: 2.9, rect: [236, 80, 808, 212] }],
    subs: [
      { t0: 0.3, t1: 3.1, text: "Open any Markdown file and press Open Preview." },
      { t0: 3.3, t1: 7.2, text: "Front matter, prose and layout, drawn as a styled page." },
    ],
  },
  {
    id: "edit", clip: "s3_edit", chapter: "Edit where you read",
    segs: [{ a: 0, b: 8.0 }], hold: 0.4,
    cam: [
      { t: 0, x: 640, y: 360, z: 1.0 },
      { t: 0.6, x: 1060, y: 110, z: 1.8, d: 0.9 },
      { t: 1.9, x: 640, y: 455, z: 1.4, d: 1.0 },
      { t: 3.3, x: 640, y: 500, z: 1.4, d: 0.9 },
      { t: 4.0, x: 700, y: 520, z: 1.9, d: 0.9 },
      { t: 5.6, x: 700, y: 520, z: 1.5, d: 0.8 },
      { t: 6.5, x: 640, y: 455, z: 1.6, d: 0.9 },
    ],
    callouts: [
      { t0: 2.95, t1: 4.2, text: "Click a paragraph to edit it in place", x: 640, y: 453, dx: 0, dy: -150 },
      { t0: 4.4, t1: 6.2, text: "⌘ B", x: 836, y: 530, dx: 0, dy: -150, kbd: true },
      { t0: 6.7, t1: 8.3, text: "Saved. The page updates.", x: 840, y: 455, dx: 0, dy: -130 },
    ],
    highlights: [],
    subs: [
      { t0: 1.2, t1: 4.2, text: "Click a paragraph and edit it right where you read." },
      { t0: 4.3, t1: 6.2, text: "Select a word, press Cmd+B to make it bold." },
      { t0: 6.5, t1: 8.4, text: "Done. The page updates in place." },
    ],
  },
  {
    id: "slash", clip: "s4_slash", chapter: "Slash menu",
    segs: [{ a: 0.7, b: 2.0, rate: 1.4 }, { a: 2.0, b: 6.5 }, { a: 6.5, b: 7.4, rate: 1.0 }, { a: 7.4, b: 8.7, rate: 1.0 }, { a: 8.7, b: 10.6, rate: 1.3 }],
    hold: 0.5,
    cam: [
      { t: 0.7, x: 640, y: 360, z: 1.0 },
      { t: 1.3, x: 440, y: 240, z: 1.5, d: 0.8 },
      { t: 2.6, x: 520, y: 320, z: 1.4, d: 0.9 },
      { t: 4.0, x: 520, y: 360, z: 1.5, d: 0.9 },
      { t: 6.0, x: 560, y: 320, z: 1.7, d: 0.9 },
      { t: 9.2, x: 640, y: 360, z: 1.0, d: 1.2 },
    ],
    callouts: [
      { t0: 4.0, t1: 5.4, text: "Type / for blocks", x: 330, y: 255, dx: 330, dy: -120 },
      { t0: 5.5, t1: 6.3, text: "MyST admonitions, tables, math", x: 440, y: 330, dx: 520, dy: 0 },
      { t0: 7.0, t1: 9.0, text: "Still plain Markdown", x: 480, y: 280, dx: 520, dy: -90 },
    ],
    highlights: [],
    subs: [
      { t0: 2.3, t1: 5.4, text: "Type / on a new line to open the command menu." },
      { t0: 5.5, t1: 8.9, text: "Pick a MyST admonition, a table, math and more." },
      { t0: 9.0, t1: 10.5, text: "Everything stays plain Markdown." },
    ],
  },
  {
    id: "tabs", clip: "s5_tabs", chapter: "MyST cards and tabs",
    segs: [{ a: 0.5, b: 8.7 }], hold: 0.8,
    cam: [
      { t: 0.5, x: 640, y: 360, z: 1.0 },
      { t: 1.0, x: 640, y: 330, z: 1.7, d: 1.1 },
      { t: 6.4, x: 640, y: 440, z: 1.5, d: 1.1 },
    ],
    callouts: [
      { t0: 2.3, t1: 6.2, text: "Tabs switch with a click", x: 560, y: 297, dx: 360, dy: -135 },
      { t0: 7.1, t1: 8.8, text: "Cards render natively", x: 1042, y: 460, dx: -120, dy: -140 },
    ],
    highlights: [
      { t0: 1.9, t1: 6.2, rect: [236, 275, 808, 84] },
      { t0: 6.8, t1: 8.8, rect: [236, 372, 808, 178] },
    ],
    subs: [
      { t0: 1.1, t1: 6.2, text: "MyST tabs switch panels with a click." },
      { t0: 6.5, t1: 9.4, text: "Cards, admonitions and dropdowns render natively." },
    ],
  },
  {
    id: "diagrams", clip: "s6_diagrams", chapter: "Diagrams and charts",
    segs: [{ a: 0, b: 6.2 }], hold: 1.3,
    cam: [
      { t: 0, x: 640, y: 360, z: 1.0 },
      { t: 0.5, x: 640, y: 300, z: 1.5, d: 1.1 },
      { t: 3.3, x: 640, y: 330, z: 1.55, d: 1.0 },
    ],
    callouts: [
      { t0: 0.8, t1: 2.9, text: "Vega-Lite chart", x: 330, y: 220, dx: -10, dy: -85 },
      { t0: 3.9, t1: 7.4, text: "Mermaid diagram", x: 230, y: 280, dx: 40, dy: -110 },
    ],
    highlights: [],
    subs: [
      { t0: 0.4, t1: 3.2, text: "Vega-Lite charts render right in the page." },
      { t0: 3.4, t1: 7.4, text: "So do Mermaid diagrams, and both stay editable as text." },
    ],
  },
  {
    id: "review", clip: "s7_review", chapter: "Review",
    segs: [{ a: 0, b: 5.75 }], hold: 1.6,
    cam: [
      { t: 0, x: 640, y: 360, z: 1.0 },
      { t: 0.8, x: 520, y: 230, z: 1.3, d: 1.2 },
      { t: 3.0, x: 700, y: 270, z: 1.55, d: 0.9 },
    ],
    callouts: [
      { t0: 1.1, t1: 3.2, text: "Comment threads on a sentence", x: 590, y: 191, dx: 100, dy: -110 },
      { t0: 1.9, t1: 3.2, text: "Change bar: edited since last commit", x: 6, y: 150, dx: 330, dy: -50 },
    ],
    highlights: [],
    subs: [
      { t0: 1.0, t1: 3.3, text: "Review threads attach to a sentence." },
      { t0: 3.4, t1: 7.2, text: "A change bar marks what you edited since the last commit." },
    ],
  },
  {
    id: "nav", clip: "s8_nav", chapter: "Navigate and theme",
    segs: [{ a: 0.4, b: 4.2 }, { a: 4.2, b: 6.0, rate: 1.6 }, { a: 6.0, b: 10.1 }], hold: 0.9,
    cam: [
      { t: 0.4, x: 640, y: 360, z: 1.0 },
      { t: 0.8, x: 1000, y: 280, z: 1.4, d: 1.0 },
      { t: 6.3, x: 1060, y: 140, z: 1.9, d: 1.0 },
      { t: 8.9, x: 640, y: 360, z: 1.0, d: 1.2 },
    ],
    callouts: [
      { t0: 1.4, t1: 3.6, text: "Table of contents", x: 1150, y: 230, dx: -300, dy: -20 },
      { t0: 7.7, t1: 9.7, text: "Cream → Dark", x: 1183, y: 95, dx: -260, dy: 70 },
    ],
    highlights: [],
    subs: [
      { t0: 1.2, t1: 5.0, text: "A table of contents is one click away." },
      { t0: 6.9, t1: 10.0, text: "Switch the page theme: Cream, White or Dark." },
    ],
  },
];

// ---- Derived timing -----------------------------------------------------------------------
export const segDur = (s: Seg) => (s.b - s.a) / (s.rate ?? 1);
export const sceneDur = (sc: SceneDef) => sc.segs.reduce((n, s) => n + segDur(s), 0) + (sc.hold ?? 0);

/** Source time -> output time inside the scene (the hold maps the end of the clip). */
export function srcToOut(sc: SceneDef, t: number): number {
  let out = 0;
  for (const s of sc.segs) {
    if (t <= s.a) return out;
    if (t < s.b) return out + (t - s.a) / (s.rate ?? 1);
    out += segDur(s);
  }
  return out + Math.max(0, t - sc.segs[sc.segs.length - 1].b);
}
/** Output time inside the scene -> source time. */
export function outToSrc(sc: SceneDef, o: number): number {
  let acc = 0;
  for (const s of sc.segs) {
    const d = segDur(s);
    if (o < acc + d) return s.a + (o - acc) * (s.rate ?? 1);
    acc += d;
  }
  return sc.segs[sc.segs.length - 1].b;
}

export const TITLE_SEC = 5.0;
export const END_SEC = 7.5;

export type Timeline = { id: string; start: number; dur: number }[];
/** Absolute start (seconds) of every part: title, scenes, end card; parts overlap by TRANSITION. */
export function timeline(scenes: SceneDef[], title = TITLE_SEC, end = END_SEC, tr = TRANSITION): { parts: Timeline; total: number } {
  const durs = [{ id: "title", dur: title }, ...scenes.map((s) => ({ id: s.id, dur: sceneDur(s) })), { id: "end", dur: end }];
  let t = 0;
  const parts: Timeline = [];
  durs.forEach((d, i) => {
    parts.push({ id: d.id, start: t, dur: d.dur });
    t += d.dur - (i < durs.length - 1 ? tr : 0);
  });
  return { parts, total: t };
}

/** All subtitles of a cut with absolute (output) times. */
export function absoluteSubs(scenes: SceneDef[], title = TITLE_SEC, end = END_SEC, tr = TRANSITION) {
  const { parts } = timeline(scenes, title, end, tr);
  const out: Sub[] = [];
  for (const sc of scenes) {
    const p = parts.find((x) => x.id === sc.id)!;
    for (const s of sc.subs) {
      const a = srcToOut(sc, s.t0);
      const b = Math.min(srcToOut(sc, s.t1), sceneDur(sc));
      if (b - a > 0.2) out.push({ t0: p.start + a, t1: p.start + b, text: s.text });
    }
  }
  return out;
}

// ---- 15 s cut: one beat per feature ---------------------------------------------------------
const pick = (id: string, segs: Seg[], hold = 0): SceneDef => {
  const sc = SCENES.find((s) => s.id === id)!;
  return { ...sc, segs, hold };
};
export const CUT_TRANSITION = 0.35;
export const CUT_SCENES: SceneDef[] = [
  { ...pick("edit", [{ a: 4.2, b: 7.0 }], 0), subs: [{ t0: 4.3, t1: 7.0, text: "Edit where you read." }], callouts: [SCENES[1].callouts[1], SCENES[1].callouts[2]] },
  { ...pick("slash", [{ a: 4.0, b: 6.8 }], 0), subs: [{ t0: 4.1, t1: 6.8, text: "A slash menu for MyST blocks." }], callouts: [] },
  { ...pick("tabs", [{ a: 1.9, b: 4.5 }], 0), subs: [{ t0: 2.0, t1: 4.5, text: "Tabs, cards, charts, diagrams." }], callouts: [], highlights: [{ t0: 1.9, t1: 4.5, rect: [236, 275, 808, 84] }] },
  { ...pick("review", [{ a: 1.0, b: 3.8 }], 0), subs: [{ t0: 1.1, t1: 3.8, text: "Review and track changes." }], callouts: [SCENES[5].callouts[0]] },
  { ...pick("nav", [{ a: 7.4, b: 9.8 }], 0), subs: [{ t0: 7.5, t1: 9.8, text: "Cream, or Dark." }], callouts: [] },
];
export const CUT_TITLE = 1.5;
export const CUT_END = 2.2;
