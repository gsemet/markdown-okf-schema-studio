/**
 * Fixtures that are generated instead of committed (too large or too repetitive to keep as files).
 * `npm run visual:render` writes them as `fixtures/gen-<name>.md` before rendering; the files are
 * git-ignored (`/test/visual/fixtures/gen-*.md`). The capture driver reads fixtures by file name,
 * so a generated fixture is an ordinary fixture name starting with `gen-`.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export const HUGE_DOCUMENT_SENTINEL = "End of the huge document: the last paragraph is reachable.";
export const HUGE_DOCUMENT_SECTIONS = 335;

/** About 6000 lines: 335 sections of heading, paragraph, bullet list, code fence and table. */
export function hugeDocument(): string {
  const lines: string[] = ["# Huge document", "", "A generated document to check long pages: every section repeats the same blocks.", ""];
  for (let section = 1; section <= HUGE_DOCUMENT_SECTIONS; section += 1) {
    const label = String(section).padStart(3, "0");
    lines.push(
      `## Section ${label}`,
      "",
      `Paragraph of section ${label} with **bold**, *italic*, \`inline code\` and a [link](https://example.com/${label}).`,
      "The sentence continues over a second line so that the paragraph wraps in a narrow pane.",
      "",
      "- first item",
      "- second item",
      `- third item of section ${label}`,
      "",
      "```python",
      `def section_${label}(value):`,
      "    return value * 2",
      "```",
      "",
      "| Column | Value |",
      "| --- | --- |",
      `| section | ${label} |`,
      "",
    );
  }
  lines.push("## The end", "", HUGE_DOCUMENT_SENTINEL, "");
  return lines.join("\n");
}

export const GENERATED_FIXTURES: Readonly<Record<string, () => string>> = {
  "gen-huge-document": hugeDocument,
};

/** Writes every generated fixture into `directory` (rewritten only when the content changed). */
export function writeGeneratedFixtures(directory: string): string[] {
  const written: string[] = [];
  for (const [name, generate] of Object.entries(GENERATED_FIXTURES)) {
    const file = path.join(directory, `${name}.md`);
    const content = generate();
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) fs.writeFileSync(file, content, "utf8");
    written.push(file);
  }
  return written;
}
