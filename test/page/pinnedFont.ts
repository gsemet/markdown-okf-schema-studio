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

const FACES: ReadonlyArray<{ family: string; file: string; weight: string }> = [
  { family: PINNED_SANS_FAMILY, file: "KaTeX_SansSerif-Regular.woff2", weight: "normal" },
  { family: PINNED_SANS_FAMILY, file: "KaTeX_SansSerif-Bold.woff2", weight: "bold" },
  { family: PINNED_MONO_FAMILY, file: "KaTeX_Typewriter-Regular.woff2", weight: "normal" },
];

/**
 * Loads the pinned faces from `fonts` in `page` and points the theme's font variables to them;
 * throws when a face does not load, which fails the test (the browser is closed).
 */
export async function pinTestFonts(page: Page, fonts: string = FONTS): Promise<void> {
  const faces = FACES.map((face) => ({ ...face, bytes: fs.readFileSync(path.join(fonts, face.file)).toString("base64") }));
  const failed = await page.evaluate(async ({ items, sans, mono }) => {
    const failures: string[] = [];
    for (const item of items) {
      const binary = atob(item.bytes);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const face = new FontFace(item.family, bytes, { weight: item.weight });
      document.fonts.add(face);
      try {
        await face.load();
      } catch {
        // The status below reports it.
      }
      if (face.status !== "loaded") failures.push(`${item.file} (${face.status})`);
    }
    // On body, over the theme's values, and on the root element, where VS Code sets them: the
    // page's prose font (`--sphinx-preview-font`) is resolved on the root element.
    for (const element of [document.documentElement, document.body]) {
      element.style.setProperty("--vscode-font-family", `"${sans}"`);
      element.style.setProperty("--vscode-markdown-font-family", `"${sans}"`);
      element.style.setProperty("--vscode-editor-font-family", `"${mono}"`);
    }
    return failures;
  }, { items: faces, sans: PINNED_SANS_FAMILY, mono: PINNED_MONO_FAMILY });
  if (failed.length > 0) throw new Error(`the pinned test font did not load: ${failed.join(", ")} from ${fonts}`);
}
