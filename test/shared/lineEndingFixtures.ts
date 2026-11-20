/** The real line-ending fixtures of `test/fixtures/markdown-line-endings/`, read as raw bytes. */

import * as fs from "node:fs";
import * as path from "node:path";

/** From `out/test/shared` to the source folder of the fixtures. */
export const LINE_ENDING_FIXTURES = path.resolve(__dirname, "../../../test/fixtures/markdown-line-endings");

/** The names of the fixtures: LF only, CRLF only (with and without a final line break) and mixed. */
export const LINE_ENDING_FIXTURE_NAMES = ["document.lf.md", "document.crlf.md", "no-final-newline.crlf.md", "document.mixed.md"] as const;

/** A fixture's text exactly as stored: never an autocrlf-converted copy. */
export function readLineEndingFixture(name: (typeof LINE_ENDING_FIXTURE_NAMES)[number]): string {
  return fs.readFileSync(path.join(LINE_ENDING_FIXTURES, name)).toString("utf8");
}

/** The lines of `text`, each with its own line ending kept. */
function linesWithEndings(text: string): string[] {
  return text.match(/[^\r\n]*(?:\r\n|\n|\r)|[^\r\n]+$/gu) ?? [];
}

/** The block of the 1-based source lines `line` to `endLine`, with the offset where it starts. */
export function blockAt(text: string, line: number, endLine: number): { start: number; text: string } {
  const lines = linesWithEndings(text);
  const start = lines.slice(0, line - 1).join("").length;
  return { start, text: lines.slice(line - 1, endLine).join("") };
}
