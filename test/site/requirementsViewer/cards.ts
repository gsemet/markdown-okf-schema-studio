import { cardDocument, escapeHtml } from "../socialCard";
import { LEVELS, type Level } from "./shell";

/** The four pictures of the viewer, one per level: a headline and the three layers with the level lit. */

const LAYERS: readonly { name: string; code: string }[] = [
  { name: "Use case", code: "StRS" },
  { name: "Behaviour", code: "SwRS" },
  { name: "Code and tests", code: "@implements_req" },
];

const CARD_STYLE = `<style>
.chain { flex: 0 0 360px; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 22px; }
.chain li { position: relative; padding: 18px 24px; border: 2px solid var(--line); border-radius: 12px; background: #ffffff; color: var(--muted); }
.chain li + li::before { content: ""; position: absolute; left: 50%; top: -22px; width: 3px; height: 22px; background: var(--line); }
.chain b { display: block; font-size: 30px; font-weight: 600; }
.chain code { font-size: 18px; }
.chain li.on { border-color: var(--accent); color: var(--ink); box-shadow: 0 0 0 5px rgba(14, 105, 116, .16); }
.chain.areas li { border-color: var(--accent); }
.headline { font-size: 64px; }
</style>`;

const HEADLINES: Readonly<Record<Level, string>> = {
  areas: "Studio requirements",
  area: "A product area",
  "use-case": "A use case",
  behaviour: "A behaviour",
};

/** Body of the card of a level. */
export function levelCardBody(level: Level): string {
  const info = LEVELS[level];
  const chain = LAYERS.map((layer, index) => `<li${index === info.on ? ' class="on"' : ""}><b>${escapeHtml(layer.name)}</b><code>${escapeHtml(layer.code)}</code></li>`).join("");
  return `${CARD_STYLE}<div class="text"><p class="eyebrow">${escapeHtml(info.kind)}</p><h1 class="headline">${escapeHtml(HEADLINES[level])}</h1><p class="line">${escapeHtml(info.line)}</p></div><ol class="chain${level === "areas" ? " areas" : ""}">${chain}</ol>`;
}

/** The four cards, named like the pictures `requirements/og/<level>.png`. */
export function levelCards(): { name: Level; html: string }[] {
  return (Object.keys(LEVELS) as Level[]).map((level) => ({ name: level, html: cardDocument(levelCardBody(level)) }));
}
