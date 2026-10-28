// Writes demo.srt and cut15.srt from src/data.ts (same timing as the burned-in subtitles).
import { writeFileSync, mkdirSync } from "node:fs";
import { SCENES, CUT_SCENES, CUT_TITLE, CUT_END, CUT_TRANSITION, absoluteSubs, TITLE_SEC, END_SEC } from "../src/data.ts";

const ts = (s: number) => {
  const ms = Math.round(s * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const srt = (subs: { t0: number; t1: number; text: string }[]) =>
  subs.map((s, i) => `${i + 1}\n${ts(s.t0)} --> ${ts(s.t1)}\n${s.text}\n`).join("\n");
mkdirSync("out", { recursive: true });
writeFileSync("out/demo.srt", srt(absoluteSubs(SCENES, TITLE_SEC, END_SEC)));
writeFileSync("out/cut15.srt", srt(absoluteSubs(CUT_SCENES, CUT_TITLE, CUT_END, CUT_TRANSITION)));
console.log("srt written");
