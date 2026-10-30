---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-009
uuid: 5e63ff09-6841-4031-8ddb-cda015f5369b
title: GitHub alerts render as admonitions
description: When a block quote starts with [!NOTE], [!TIP], [!IMPORTANT],
  [!WARNING] or [!CAUTION] in any case, the extension SHALL render it as an
  admonition of that type with the default title and the quoted lines as
  Markdown body, using the text after the marker as the title and ending the
  admonition at the first unquoted line.
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
- src/core/render/mystGithubAlerts.ts
- src/core/render/mystNormalize.ts
- src/page/features/mappedBlocks.ts
tested_in_files:
- test/core/render/alertInsideColonContainer.test.ts
- test/core/render/alertSourceLines.test.ts
- test/core/render/crlfAlerts.test.ts
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/session/alertBlockEditOpen.test.ts
- test/visual/alertEditingScenarios.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-GFM-010
- SwRS-MDOKFSTUDIO-GFM-011
- SwRS-MDOKFSTUDIO-GFM-012
- SwRS-MDOKFSTUDIO-GFM-013
- SwRS-MDOKFSTUDIO-GFM-037
---

## GitHub alerts render as admonitions

### Normative behavior

When a block quote starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION] in any case, the extension SHALL render it as an admonition of that type with the default title and the quoted lines as Markdown body, using the text after the marker as the title and ending the admonition at the first unquoted line.

### Scenario (nominal): Each alert type renders

- GIVEN a block quote starting with > [!warning] and a body line (and likewise [!NOTE], [!TIP], [!IMPORTANT] and [!CAUTION] in any case)
- WHEN the preview is rendered
- THEN an admonition titled Warning contains the body as Markdown

### Scenario (refusal): Unknown alert type

- GIVEN a block quote starting with > [!FOO]
- WHEN the preview is rendered
- THEN it stays a plain block quote

### Scenario (nominal): Title from the marker line

| Input | Outcome |
| --- | --- |
| `> [!WARNING] Read this` | the admonition title is Read this |
| `> [!WARNING]` alone | the title is the default Warning |

### Scenario (nominal): Legacy bold markers

- GIVEN a block quote whose first line is '> **Note**' (or **Important**, **Warning**, in any case) followed by text
- WHEN the preview is rendered
- THEN a simple admonition of the marker's type (Note, Important or Warning) contains the text

### Scenario (refusal): Bold marker with extra text

- GIVEN a block quote line '> **Note** and more'
- WHEN the preview is rendered
- THEN it stays a plain block quote

### Scenario (boundary): Fences keep alert markers literal

| Input | Outcome |
| --- | --- |
| '> [!NOTE]' within a fenced code block | the marker stays literal code and no admonition is produced |
| a fenced block followed by a real alert | the fence content is literal and the alert after it is an admonition |

### Scenario (boundary): The admonition ends at the first unquoted line

| Input | Outcome |
| --- | --- |
| an alert followed directly by an unquoted paragraph | the paragraph is outside the admonition |
| an alert followed by a blank line and a paragraph | the paragraph is outside the admonition and later source line numbers are unchanged |

### Scenario (boundary): Every block keeps the lines of the document

The alert is rewritten into an admonition of more lines before parsing; the source lines of the
blocks (`data-line`, `data-end-line`, which the block editor opens, saves, cuts and moves) are
still the lines of the file as written.

| Input | Outcome |
| --- | --- |
| two consecutive alerts (lines 1-2 and 4-6), then a heading on line 8 and a paragraph on line 10 | the admonitions carry lines 1-2 and 4-6, their paragraphs 2 and 5-6, the heading 8 and the paragraph 10 |
| any alert type, a bold marker or a titled alert, an alert followed directly by an unquoted line, an alert ending the file without a final line break, a CRLF document | the admonition starts on its marker line and ends on its last quoted line; every other block keeps its own lines |
| an alert after a frontmatter block, inside a list item, a grid card, a tab item or between context tags (also kept as one raw HTML block) | the same, counted in the whole file |
| an unclosed fence after an alert | the warning and the opening line shown as code carry the line of the fence |
| alert markers inside a fenced code block | they stay literal and later lines are unchanged |

### Scenario (nominal): A click in the body of an alert opens the whole alert

The admonition of a rewritten alert carries `data-okf-github-alert="true"`. In edit mode, a click
(or Enter or Space) on a block in its body opens one block editor on the whole alert, from the
marker line to the last quoted line, like a click on its title (SwRS-MDOKFSTUDIO-BLOCK-014).

| Clicked block in edit mode | Lines of previewEditOpen and text of the editor |
| --- | --- |
| either paragraph of a `> [!NOTE]` alert of two paragraphs (lines 7 to 10, after a frontmatter block) | lines 7 to 10, the marker line and every quoted line |
| the body of one of several consecutive alerts (`[!NOTE]`, a titled `[!TIP]` of two paragraphs, a `> **Warning**` bold marker, `[!CAUTION]`) | the lines of that alert only, never those of the alert before or after it |
| the second paragraph of an alert indented in a list item | the lines of the alert only, with the indentation of the list item; a click on another item of the list still opens the whole list |
| an item of a list inside an alert | the lines of the whole alert |
| an alert in a tab item | no change: the tab item is the mapped block (SwRS-MDOKFSTUDIO-MYST-098) |

### Scenario (boundary): Alerts inside a colon container

An admonition written with a colon fence closes at the first colon-only line at least as long as
its own, and a container nested in another must use a shorter fence than the outer one; a
`:::{note}` inside a `:::{card}` would therefore end the card early.

| Input | Outcome |
| --- | --- |
| an alert inside a `:::{card}`, a `:::{tab-item}` of a tab set or a three-colon card of a nested grid, followed by a paragraph | the admonition is a backtick directive; the paragraph stays inside the card or tab and the text after the container stays outside |
| the same documents | the blocks carry the lines of the file as written (the tab panels carry the lines of their items) |
| an alert outside every colon container | it is a colon-fence admonition, as before |

### Scenario (boundary): CRLF documents

| Input | Outcome |
| --- | --- |
| an alert written with CRLF line endings | an admonition is produced |
| a CRLF document mixing a fence and an alert | the HTML equals the LF rendering |

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (alert types, unknown type, title, legacy bold markers: unit tests on the render pipeline output).
- Method: test/core/render/mystPaletteRendering.test.ts (alert types, end at the first unquoted line: unit tests on the render pipeline output).
- Method: test/core/render/crlfAlerts.test.ts (fence scenario and CRLF scenario: unit tests on the render pipeline output).
- Method: test/core/render/alertSourceLines.test.ts (every block keeps the lines of the document: unit tests on the `data-line` and `data-end-line` of the rendered blocks, including a README-shaped synthetic fixture with an important alert then a note alert).
- Method: test/session/alertBlockEditOpen.test.ts (the host answers `previewEditOpen` for the paragraph of the second alert of that README with that paragraph's lines, through the real `PreviewManager`; the click in the body of an alert: the rendered and sanitized page is read by `createMappedBlocks(...).editingElementFor`, the range is posted to the real `PreviewManager` and the answer is the whole alert, for the two-paragraph, consecutive, list-item and list-in-alert rows).
- Method: visual scenario gfm/v09-alert-body-opens-whole-alert-dark-900 in test/visual/alertEditingScenarios.ts (a real click on the second paragraph of a two-paragraph note: one `previewEditOpen` for lines 5 to 8, the editor holds the whole alert and the alerts after it stay rendered). The tab item row is not asserted for the click.
- Method: test/core/render/alertInsideColonContainer.test.ts (alerts inside a card, a tab item and a nested grid card: unit tests on the rendered structure and on the `data-line` and `data-end-line` of the blocks).
- Criteria: One admonition per known type and none for unknown types; the title equals the marker trailing text, else the default; simple admonitions only for lone bold markers; no admonition inside a fence while alerts outside are unaffected; the admonition body contains only quoted lines; CRLF and LF outputs are identical; every rendered block's `data-line` and `data-end-line` are the lines of the file as written; a click in the body of a mapped alert posts the alert's own range, never a paragraph's or the enclosing list's; an alert inside a colon container is a backtick directive whose fence is longer than any backtick fence of its body, so neither the body nor its closing line ends the container.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-002](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-002.md): GitHub Flavored Markdown renders as on GitHub, safely
- Supersedes:
  - [SwRS-MDOKFSTUDIO-GFM-010](SwRS-MDOKFSTUDIO-GFM-010.md): Alert marker text becomes the title
  - [SwRS-MDOKFSTUDIO-GFM-011](SwRS-MDOKFSTUDIO-GFM-011.md): Legacy bold markers render as admonitions
  - [SwRS-MDOKFSTUDIO-GFM-012](SwRS-MDOKFSTUDIO-GFM-012.md): Alert markers inside fences stay literal
  - [SwRS-MDOKFSTUDIO-GFM-013](SwRS-MDOKFSTUDIO-GFM-013.md): Alerts render the same in CRLF documents
  - [SwRS-MDOKFSTUDIO-GFM-037](SwRS-MDOKFSTUDIO-GFM-037.md): Alerts end at the first unquoted line
<!-- okf:links:end -->
