---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-008
uuid: fae00a2f-255b-46fc-b3da-95c9708eb762
title: Strikethrough, footnotes and pipe tables render as on GitHub
description: When prose contains ~~text~~, a footnote reference with its
  definition, or a GFM pipe table, the extension SHALL render the text struck
  through, the reference with its footnote text, and the table header with the
  alignment of the delimiter row on every cell of the column, leaving a single
  ~x~ pair and tildes in code literal.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystEngine.ts
- src/core/render/mystRenderer.ts
- src/core/render/mystTables.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/core/render/mystTablesTree.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-GFM-014
- SwRS-MDOKFSTUDIO-GFM-015
---

## Strikethrough, footnotes and pipe tables render as on GitHub

### Normative behavior

When prose contains ~~text~~, a footnote reference with its definition, or a GFM pipe table, the extension SHALL render the text struck through, the reference with its footnote text, and the table header with the alignment of the delimiter row on every cell of the column, leaving a single ~x~ pair and tildes in code literal.

### Scenario (nominal): Struck text in prose and tables

- GIVEN ~~old~~ in a paragraph, a list item and a table cell
- WHEN the preview is rendered
- THEN each is rendered struck through

### Scenario (boundary): Single tildes and code

- GIVEN '~x~' in prose and '~~x~~' in inline code
- WHEN the preview is rendered
- THEN both stay literal text

### Scenario (nominal): Footnote renders

- GIVEN a paragraph with [^1] and a definition [^1]: Text
- WHEN the preview is rendered
- THEN a reference and the footnote text are present

### Scenario (boundary): Reference without definition

- GIVEN a [^2] reference with no definition
- WHEN the preview is rendered
- THEN no footnote text is invented and rendering succeeds

### Scenario (nominal): Aligned column

- GIVEN a pipe table with a '---:' column
- WHEN the preview is rendered
- THEN each cell of that column is right-aligned and the header row is a header

### Scenario (boundary): Unaligned columns

- GIVEN a pipe table with plain '---' columns
- WHEN the preview is rendered
- THEN no alignment is applied

### Scenario (boundary): Source lines of a table without a second parse

- GIVEN a pipe table with plain '---' columns, next to a paragraph with the text 'a --> b'
- WHEN the preview is rendered
- THEN the table carries its data-line and data-end-line from the syntax tree and the paragraph text reaches the page as the writer wrote it; only aligned columns, list-tables and raw HTML tables are completed on the written HTML

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (all six scenarios: unit tests on the render pipeline output).
- Method: test/core/render/mystPaletteRendering.test.ts (footnote and pipe table scenarios: unit tests on the render pipeline output).
- Method: test/core/render/mystTablesTree.test.ts (Source lines of a table without a second parse): "a pipe table gets its source lines from the syntax tree, with no second parse of the HTML", "aligned columns and list-tables still go through the HTML pass", "only list-tables, raw HTML tables and aligned columns need the HTML pass".
- Criteria: Strikethrough elements exist only for double-tilde prose pairs; footnote reference and definition elements are present for defined notes; alignment appears on all cells of aligned columns only.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Supersedes:
  - [SwRS-MDOKFSTUDIO-GFM-014](SwRS-MDOKFSTUDIO-GFM-014.md): Footnotes render reference and text
  - [SwRS-MDOKFSTUDIO-GFM-015](SwRS-MDOKFSTUDIO-GFM-015.md): Pipe tables keep header and column alignment
<!-- okf:links:end -->
