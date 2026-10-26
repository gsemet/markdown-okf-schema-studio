/**
 * The admonition directives (`{note}`, `{warning}`, …, `{admonition}`): the render pass, the
 * stylesheet of the callout and the palette actions that insert one. Pure module: no host API, no
 * DOM, no Node built-ins.
 */

import { CALLOUT_ICONS } from "../preview/calloutIcons";
import { findNode, type MystNode, takeAdmonitionTitle } from "../render/mystNode";
import type { MystDirectiveDescriptor } from "./directive";

// @implements_req SwRS-MDOKFSTUDIO-MYST-001
/** The default title of each admonition kind (also the kinds of `callout-*` divs). */
export const ADMONITION_TITLES: Record<string, string> = {
  attention: "Attention",
  caution: "Caution",
  danger: "Danger",
  error: "Error",
  hint: "Hint",
  important: "Important",
  note: "Note",
  seealso: "See Also",
  tip: "Tip",
  warning: "Warning",
};

// @implements_req SwRS-MDOKFSTUDIO-MYST-006
/**
 * The admonition directive gives its position to the admonition the parser built beneath it, and
 * an admonition without arguments or title takes its title from a leading heading or bold line.
 */
function renderAdmonition(node: MystNode): void {
  const admonition = findNode(node, "admonition");
  if (admonition && node.position) {
    admonition.position = {
      ...node.position,
      ...(admonition.position ?? {}),
      end: node.position.end ?? admonition.position?.end,
    };
  }
  if (
    admonition
    && !node.args?.trim()
    && !admonition.children?.some((child) => child.type === "admonitionTitle")
  ) {
    const inferredTitle = takeAdmonitionTitle(admonition.children ?? []);
    if (inferredTitle) {
      admonition.children = [inferredTitle.title, ...inferredTitle.body];
    }
  }
}

/** The admonition plug-in. */
export const ADMONITION_DIRECTIVE: MystDirectiveDescriptor = {
  id: "admonition",
  names: ["admonition", ...Object.keys(ADMONITION_TITLES)],
  render: renderAdmonition,
  paletteActions: ["admonition", "dropdown"],
  style: `/* Admonitions: tinted panel with a thick accent bar, matching VS Code alert styling. */
#sphinx-myst-preview-content :where(.admonition, div[class*="admonition-"], .attention, .caution, .danger, .error, .hint, .important, .note, .seealso, .tip, .tips, .warning) {
  --sphinx-preview-accent: var(--studio-textLink-foreground, #4488dd);
  --sphinx-preview-icon: ${CALLOUT_ICONS.info};
  display: block;
  margin: 1.2em 0;
  padding: 0.85em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-inline-start: 4px solid var(--sphinx-preview-accent);
  /* Fallback first: themes without color-mix still get a panel distinct from the page. */
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  background: color-mix(in srgb, var(--sphinx-preview-accent) 14%, var(--studio-editor-background, Canvas));
  color: var(--studio-editor-foreground, CanvasText);
  overflow: auto;
}

#sphinx-myst-preview-content :where(.admonition, .attention, .caution, .danger, .error, .hint, .important, .note, .seealso, .tip, .tips, .warning) > :where(.admonition-title, p.admonition-title) {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0 0 0.5em;
  padding: 0;
  border: 0;
  background: none;
  color: var(--sphinx-preview-accent);
  font-weight: 600;
  font-size: 1em;
  line-height: var(--sphinx-preview-line-height);
}

/* The badge is a mask, not an image, so it takes the accent colour of its callout. */
#sphinx-myst-preview-content :where(.admonition-title, p.admonition-title)::before {
  content: "";
  flex: none;
  width: 1.05em;
  height: 1.05em;
  background-color: currentColor;
  -webkit-mask: var(--sphinx-preview-icon) no-repeat center / contain;
  mask: var(--sphinx-preview-icon) no-repeat center / contain;
}

#sphinx-myst-preview-content :where(.admonition, .attention, .caution, .danger, .error, .hint, .important, .note, .seealso, .tip, .tips, .warning) > :last-child {
  margin-bottom: 0;
}

#sphinx-myst-preview-content .admonition.simple {
  padding: 0.45em 0 0.45em 1em;
  border: 0;
  border-inline-start: 3px solid var(--sphinx-preview-accent);
  background: none;
  overflow: visible;
}

#sphinx-myst-preview-content .admonition.no-icon > :where(.admonition-title, p.admonition-title)::before {
  display: none;
}

/* A dropdown shows its state at the right of the title: a chevron pointing right when closed, down when open. */
#sphinx-myst-preview-content details.admonition > summary.admonition-title {
  cursor: pointer;
  list-style: none;
}

#sphinx-myst-preview-content details.admonition > summary.admonition-title::-webkit-details-marker {
  display: none;
}

#sphinx-myst-preview-content details.admonition > summary.admonition-title::after {
  content: "";
  flex: none;
  box-sizing: border-box;
  width: 0.5em;
  height: 0.5em;
  margin-inline: auto 0.3em;
  border-inline-end: 2px solid currentColor;
  border-block-end: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.15s ease;
}

#sphinx-myst-preview-content details.admonition[open] > summary.admonition-title::after {
  transform: rotate(45deg);
}

#sphinx-myst-preview-content .note {
  --sphinx-preview-accent: var(--studio-charts-blue, #3794ff);
}

#sphinx-myst-preview-content .seealso {
  --sphinx-preview-accent: var(--studio-charts-blue, #3794ff);
  --sphinx-preview-icon: ${CALLOUT_ICONS.arrow};
}

#sphinx-myst-preview-content :where(.tip, .tips, .hint, .versionadded) {
  --sphinx-preview-accent: var(--studio-charts-green, #89d185);
  --sphinx-preview-icon: ${CALLOUT_ICONS.bulb};
}

#sphinx-myst-preview-content .important {
  --sphinx-preview-accent: var(--studio-charts-purple, #b180d7);
  --sphinx-preview-icon: ${CALLOUT_ICONS.star};
}

#sphinx-myst-preview-content :where(.warning, .attention, .versionchanged) {
  --sphinx-preview-accent: var(--studio-charts-yellow, #cca700);
  --sphinx-preview-icon: ${CALLOUT_ICONS.triangle};
}

#sphinx-myst-preview-content .caution {
  --sphinx-preview-accent: var(--studio-charts-red, #f14c4c);
  --sphinx-preview-icon: ${CALLOUT_ICONS.octagon};
}

#sphinx-myst-preview-content :where(.danger, .error, .deprecated) {
  --sphinx-preview-accent: var(--studio-charts-red, #f14c4c);
  --sphinx-preview-icon: ${CALLOUT_ICONS.cross};
}
`,
};
