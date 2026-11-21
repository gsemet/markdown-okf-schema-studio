import { cardDocument, escapeHtml } from "../socialCard";
import type { Area, ViewerModel } from "./model";

/** The pictures of the viewer: the index card and one card per area (feature category), each a headline and the three layers. */

const LAYERS: readonly { name: string; code: string }[] = [
  { name: "Use case", code: "StRS" },
  { name: "Behaviour", code: "SwRS" },
  { name: "Code and tests", code: "@implements_req" },
];

const CARD_STYLE = `<style>
.chain { flex: 0 0 360px; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 22px; }
.chain li { position: relative; padding: 18px 24px; border: 2px solid var(--line); border-radius: 12px; background: var(--paper); color: var(--soft); }
.chain li + li::before { content: ""; position: absolute; left: 50%; top: -22px; width: 3px; height: 22px; background: var(--line); }
.chain b { display: block; font-size: 30px; font-weight: 600; }
.chain code { font-size: 18px; }
.chain.areas li { border-color: var(--link); }
.headline { font-size: 64px; }
</style>`;

function chainHtml(): string {
  return LAYERS.map((layer) => `<li><b>${escapeHtml(layer.name)}</b><code>${escapeHtml(layer.code)}</code></li>`).join("");
}

/** Body of the index card: a headline and the three layers, all outlined. */
export function levelCardBody(_level: "areas"): string {
  return `${CARD_STYLE}<div class="text"><p class="eyebrow">Requirements</p><h1 class="headline">Studio requirements</h1><p class="line">Every feature, from use case to test</p></div><ol class="chain areas">${chainHtml()}</ol>`;
}

/** Body of the card of an area: "Feature category", its title and the three layers, in the colour of the area. */
export function categoryCardBody(area: Area): string {
  const colour = escapeHtml(area.colour);
  const style = `<style>
.band { background: ${colour}; }
.eyebrow { color: ${colour}; }
.chain li { border-color: ${colour}; }
.headline { font-size: 56px; overflow-wrap: anywhere; }
</style>`;
  return `${CARD_STYLE}${style}<div class="text"><p class="eyebrow">Feature category</p><h1 class="headline">${escapeHtml(area.title)}</h1><p class="line">Use cases and behaviours, linked to code and tests</p></div><ol class="chain areas">${chainHtml()}</ol>`;
}

/** The index card, then one card per area; named like the pictures `requirements/og/<name>.png`. */
// @implements_req SwRS-MDOKFSTUDIO-CORE-085
export function viewerCards(model: ViewerModel | undefined): { name: string; html: string }[] {
  const cards = [{ name: "areas-card", html: cardDocument(levelCardBody("areas")) }];
  for (const area of model?.areas ?? []) cards.push({ name: `area-${area.id}`, html: cardDocument(categoryCardBody(area)) });
  return cards;
}
