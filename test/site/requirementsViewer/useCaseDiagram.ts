import * as path from "node:path";

import { chromium } from "playwright-core";

import { EXTENSION_ROOT } from "../../reportPaths";
import { SITE_TOKENS } from "../siteTheme";
import { shortId } from "./urls";

/** The use case diagram of a StRS: the `### Use case diagram` Mermaid fence, and its drawing at site build time. */

/** The SVG of one diagram, drawn by Mermaid. */
export type UseCaseDiagram = string;

/** The Mermaid `themeVariables` of a drawing; the site passes the cream one only (the site has no dark mode). */
export type DiagramTheme = Readonly<Record<string, string>>;

const SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

export const CREAM_DIAGRAM_THEME: DiagramTheme = {
  background: "transparent",
  primaryColor: SITE_TOKENS["--paper"] ?? "",
  primaryTextColor: SITE_TOKENS["--ink"] ?? "",
  primaryBorderColor: SITE_TOKENS["--line"] ?? "",
  lineColor: SITE_TOKENS["--soft"] ?? "",
  secondaryColor: SITE_TOKENS["--quote-bg"] ?? "",
  tertiaryColor: SITE_TOKENS["--bg"] ?? "",
  fontFamily: SANS,
};

const MERMAID_BUNDLE = path.join(EXTENSION_ROOT, "node_modules", "mermaid", "dist", "mermaid.min.js");
const SECTION = /^###\s+Use case diagram\s*$/mu;
const FENCE = /^```mermaid[^\n]*\n([\s\S]*?)\n```[^\S\n]*$/mu;

/**
 * The source of the first Mermaid fence of the `### Use case diagram` section of a requirement file
 * (the text before the generated links block), or undefined when there is no section or no fence.
 * The section ends at the next heading of level 1 to 3 or at an HTML comment.
 */
export function parseUseCaseDiagram(text: string): string | undefined {
  const body = text.split("<!-- okf:links:start -->")[0] ?? "";
  const start = SECTION.exec(body);
  if (!start) return undefined;
  const lines: string[] = [];
  let fenced = false;
  for (const line of body.slice(start.index + start[0].length).split("\n")) {
    if (/^```/u.test(line)) fenced = !fenced;
    else if (!fenced && /^(?:#{1,3}\s|<!--)/u.test(line)) break;
    lines.push(line);
  }
  const trimmed = FENCE.exec(lines.join("\n"))?.[1]?.trim();
  return trimmed ? trimmed : undefined;
}

interface Outcome {
  readonly svg?: string;
  readonly error?: string;
}

/**
 * Draws each source (StRS id to Mermaid text) as an SVG with one headless Chromium, started only when
 * there is a source. A fence that Mermaid cannot draw rejects with the StRS id, its file and Mermaid's message.
 */
// @implements_req SwRS-MDOKFSTUDIO-CORE-087
export async function renderUseCaseDiagrams(
  sources: ReadonlyMap<string, string>,
  theme: DiagramTheme = CREAM_DIAGRAM_THEME,
  files: ReadonlyMap<string, string> = new Map(),
): Promise<Map<string, UseCaseDiagram>> {
  const drawn = new Map<string, UseCaseDiagram>();
  if (sources.size === 0) return drawn;
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    throw new Error("Cannot draw the use case diagrams: Chromium does not start (run `just dev` to install it)");
  }
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ path: MERMAID_BUNDLE });
    await page.evaluate(
      ({ themeVariables }) => {
        const mermaid = (globalThis as unknown as { mermaid: { initialize(options: object): void } }).mermaid;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base", themeVariables });
        return document.fonts.ready.then(() => undefined);
      },
      { themeVariables: { ...theme } },
    );
    for (const [id, source] of sources) {
      const outcome: Outcome = await page.evaluate(async ({ domId, text }) => {
        const mermaid = (globalThis as unknown as { mermaid: { render(id: string, text: string): Promise<{ svg: string }> } }).mermaid;
        try {
          return { svg: (await mermaid.render(domId, text)).svg };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      }, { domId: `ucd-${shortId(id).toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`, text: source });
      if (outcome.svg === undefined) {
        const file = files.get(id);
        throw new Error(`Cannot draw the use case diagram of ${id}${file ? ` (${file})` : ""}: ${outcome.error ?? "unknown error"}`);
      }
      drawn.set(id, outcome.svg);
    }
  } finally {
    await browser.close();
  }
  return drawn;
}
