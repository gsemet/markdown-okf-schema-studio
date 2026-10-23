/**
 * The large document of the preview performance probe: about 110 KB of Markdown in the shape of a
 * long book chapter (frontmatter, about 80 sections with wrapped paragraphs, links, sub-headings,
 * tables, lists, code and a Mermaid diagram every tenth section). Generated, so every run measures the
 * same text; the windowless and the real-window probes share it.
 */

export const PROBE_SECTION_COUNT = 80;
export const PROBE_MERMAID_EVERY = 10;

/** The paragraph the probes type into and open an inline editor on (unique text). */
export const PROBE_EDIT_PARAGRAPH = "The probe edits this paragraph in section 41.";

function wrappedParagraph(section: number, label: string, sentences: number): string {
  // Source lines of about 90 characters: a paragraph spans several source lines, like a chapter
  // wrapped at 100 columns (the runtime measures where each source line starts).
  const lines: string[] = [];
  for (let index = 1; index <= sentences; index += 1) {
    lines.push(`${label} sentence ${index} of section ${section} keeps the reader busy with ordinary words.`);
  }
  return lines.join("\n");
}

export function probeChapter(): string {
  const parts: string[] = [
    "---",
    "title: Performance probe chapter",
    "author: Studio maintainers",
    "status: draft",
    "tags:",
    "  - performance",
    "  - probe",
    "---",
    "",
    "# Performance probe chapter",
    "",
  ];
  for (let section = 1; section <= PROBE_SECTION_COUNT; section += 1) {
    parts.push(`## Section ${section}`, "");
    parts.push(section === 41 ? PROBE_EDIT_PARAGRAPH : wrappedParagraph(section, "Opening", 6), "");
    parts.push(wrappedParagraph(section, "Second **bold** and `code`", 4), "");
    // A link per section: VS Code gives every link of a loaded page a title (its href).
    parts.push(`Read more in [the notes of section ${section}](https://example.com/notes/${section}).`, "");
    parts.push(`### Details of section ${section}`, "");
    parts.push(
      "| Name | Value | Note |",
      "|------|-------|------|",
      ...Array.from({ length: 4 }, (_, row) => `| item ${row} | ${section * 10 + row} | row note |`),
      "",
    );
    parts.push(...Array.from({ length: 4 }, (_, item) => `- list item ${item} of section ${section}`), "");
    if (section % PROBE_MERMAID_EVERY === 0) {
      parts.push(
        "```{mermaid}",
        "graph TD",
        `  S${section}[Section ${section}] --> A${section}[Analyse]`,
        `  A${section} --> B${section}[Build]`,
        `  B${section} --> C${section}[Check]`,
        "```",
        "",
      );
    }
    if (section % 7 === 0) {
      parts.push("```python", `def section_${section}():`, `    return ${section}`, "```", "");
    }
  }
  parts.push("The last paragraph.", "");
  return parts.join("\n");
}

/** Number of Mermaid diagrams in {@link probeChapter}. */
export const PROBE_MERMAID_COUNT = Math.floor(PROBE_SECTION_COUNT / PROBE_MERMAID_EVERY);
