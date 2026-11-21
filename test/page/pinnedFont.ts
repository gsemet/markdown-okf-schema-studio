/**
 * One font for the layout tests, the same on every machine: KaTeX's sans (regular and bold) for
 * prose and its typewriter face for code, read from the `katex` package (a runtime dependency, so
 * `npm ci` installs it everywhere). The faces are added to the page from bytes read in Node (no
 * fetch, so the page's Content Security Policy is not involved), and the theme's font variables
 * point to them. A face that does not load is an error, never a silent fallback to the platform's
 * font.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { Page } from "playwright-core";

const EXTENSION_ROOT = path.resolve(__dirname, "../../..");
const FONTS = path.join(EXTENSION_ROOT, "node_modules", "katex", "dist", "fonts");

/** The family the page draws its prose in (tables, headings, paragraphs). */
export const PINNED_SANS_FAMILY = "Studio Test Sans";
/** The family the page draws its code in (inline code, code blocks). */
export const PINNED_MONO_FAMILY = "Studio Test Mono";

interface Face {
  readonly family: string;
  readonly file: string;
  readonly weight: string;
  readonly style?: string;
}

const FACES: ReadonlyArray<Face> = [
  { family: PINNED_SANS_FAMILY, file: "KaTeX_SansSerif-Regular.woff2", weight: "normal" },
  { family: PINNED_SANS_FAMILY, file: "KaTeX_SansSerif-Bold.woff2", weight: "bold" },
  { family: PINNED_MONO_FAMILY, file: "KaTeX_Typewriter-Regular.woff2", weight: "normal" },
];

/** The family the published site draws what is read in (the viewer's captions and prose). */
export const PINNED_SERIF_FAMILY = "Studio Test Serif";

/** The faces of `pinTestFonts` and a pinned serif, regular and italic. */
const SITE_FACES: ReadonlyArray<Face> = [
  ...FACES,
  { family: PINNED_SERIF_FAMILY, file: "KaTeX_Main-Regular.woff2", weight: "normal" },
  { family: PINNED_SERIF_FAMILY, file: "KaTeX_Main-Italic.woff2", weight: "normal", style: "italic" },
];

/** Adds `faces` to `page` from bytes read in Node and returns the files that did not load. */
async function loadFaces(page: Page, faces: ReadonlyArray<Face>, fonts: string): Promise<string[]> {
  const items = faces.map((face) => ({ ...face, bytes: fs.readFileSync(path.join(fonts, face.file)).toString("base64") }));
  return page.evaluate(async (list) => {
    const failures: string[] = [];
    for (const item of list) {
      const binary = atob(item.bytes);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const face = new FontFace(item.family, bytes, { weight: item.weight, style: item.style ?? "normal" });
      document.fonts.add(face);
      try {
        await face.load();
      } catch {
        // The status below reports it.
      }
      if (face.status !== "loaded") failures.push(`${item.file} (${face.status})`);
    }
    return failures;
  }, items);
}

/**
 * Loads the pinned faces from `fonts` in `page` and points the theme's font variables to them;
 * throws when a face does not load, which fails the test (the browser is closed).
 */
export async function pinTestFonts(page: Page, fonts: string = FONTS): Promise<void> {
  const failed = await loadFaces(page, FACES, fonts);
  await page.evaluate(({ sans, mono }) => {
    // On body, over the theme's values, and on the root element, where VS Code sets them: the
    // page's prose font (`--sphinx-preview-font`) is resolved on the root element.
    for (const element of [document.documentElement, document.body]) {
      element.style.setProperty("--vscode-font-family", `"${sans}"`);
      element.style.setProperty("--vscode-markdown-font-family", `"${sans}"`);
      element.style.setProperty("--vscode-editor-font-family", `"${mono}"`);
    }
  }, { sans: PINNED_SANS_FAMILY, mono: PINNED_MONO_FAMILY });
  if (failed.length > 0) throw new Error(`the pinned test font did not load: ${failed.join(", ")} from ${fonts}`);
}

/**
 * The same pinned faces for the published site, plus a pinned serif: points the site's `--sans`,
 * `--serif` and `--mono` to them on the root element, so every measure of a site page is the same
 * on every machine. Throws when a face does not load.
 */
export async function pinSiteFonts(page: Page, fonts: string = FONTS): Promise<void> {
  const failed = await loadFaces(page, SITE_FACES, fonts);
  await page.evaluate(({ sans, serif, mono }) => {
    const root = document.documentElement.style;
    root.setProperty("--sans", `"${sans}"`);
    root.setProperty("--serif", `"${serif}"`);
    root.setProperty("--mono", `"${mono}"`);
  }, { sans: PINNED_SANS_FAMILY, serif: PINNED_SERIF_FAMILY, mono: PINNED_MONO_FAMILY });
  if (failed.length > 0) throw new Error(`the pinned site font did not load: ${failed.join(", ")} from ${fonts}`);
}
