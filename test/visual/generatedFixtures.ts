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

/** The sibling of the link hint fixture: its stem sorts past the first 500 stems of the fixtures folder. */
export const LINK_HINT_TARGET = "gen-related-target";
/** Filler stems far from the link hint fixture (one folder down) that sort before its sibling. */
const LINK_HINT_FILLER_STEMS = 600;

/** A filename-stem link list whose item is a sibling file of the document (CR 220). */
export function linkHintDocument(): string {
  return [
    "---",
    "type: link-hint",
    "title: Link list hint",
    "related:",
    `  - ${LINK_HINT_TARGET}`,
    "---",
    "",
    "# Link list hint",
    "",
    `The related note \`${LINK_HINT_TARGET}\` sits next to this file; the fixtures folder holds more than`,
    "500 Markdown files, so its stem sorts past the 500 entries of the suggestion list.",
    "",
  ].join("\n");
}

export const GENERATED_FIXTURES: Readonly<Record<string, () => string>> = {
  "gen-huge-document": hugeDocument,
  "gen-link-hint": linkHintDocument,
};

/**
 * Other generated files (path relative to the fixtures folder, git-ignored like the generated
 * fixtures and the `gen-*` folders): the sibling and the filler stems of the link hint fixture.
 */
function generatedFiles(): Record<string, string> {
  const files: Record<string, string> = { [`${LINK_HINT_TARGET}.md`]: "# Related target\n\nA sibling note of the link hint fixture.\n" };
  for (let index = 0; index < LINK_HINT_FILLER_STEMS; index += 1) {
    files[`gen-link-hint-stems/a-${String(index).padStart(3, "0")}.md`] = `# Filler ${index}\n`;
  }
  return files;
}

/** Writes every generated fixture into `directory` (rewritten only when the content changed). */
export function writeGeneratedFixtures(directory: string): string[] {
  const written: string[] = [];
  for (const [name, generate] of Object.entries(GENERATED_FIXTURES)) {
    const file = path.join(directory, `${name}.md`);
    const content = generate();
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) fs.writeFileSync(file, content, "utf8");
    written.push(file);
  }
  for (const [relative, content] of Object.entries(generatedFiles())) {
    const file = path.join(directory, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) fs.writeFileSync(file, content, "utf8");
  }
  return written;
}
