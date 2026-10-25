---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-016
uuid: d811b979-2c9b-409b-a238-db546a61e8e3
title: Task list markers render as checkboxes with their source position
description: When a task-list item, paragraph, table cell, directive body or
  admonition title contains [ ], [x] or [X], the extension SHALL render a
  checkbox carrying its source line and UTF-16 column, marking a task-list item
  so that the checkbox replaces the bullet and keeping the checkbox input and
  its attributes in the sanitized webview HTML.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/checkboxMarkers.ts
- src/core/render/mystInlineTransforms.ts
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/core/render/checkboxMarkers.test.ts
- test/core/render/checkboxRendering.test.ts
---

## Task list markers render as checkboxes with their source position

### Normative behavior

When a task-list item, paragraph, table cell, directive body or admonition title contains [ ], [x] or [X], the extension SHALL render a checkbox carrying its source line and UTF-16 column, marking a task-list item so that the checkbox replaces the bullet and keeping the checkbox input and its attributes in the sanitized webview HTML.

### Scenario (nominal): Markers become checkboxes

- GIVEN '- [ ] a' in a list, '[x]' in a table cell, and a document with frontmatter
- WHEN the preview is rendered
- THEN each marker is a checkbox whose line and column equal the marker position, frontmatter lines included

### Scenario (boundary): Line and column counting

| Input | Outcome |
| --- | --- |
| a line with an astral character before '[ ]' | the column counts UTF-16 units |
| a CRLF task list | each checkbox column equals its marker column, the same line and column as in the LF document |
| a document mixing LF and CRLF lines | line numbers count each line break once |

### Scenario (nominal): Task-list checkboxes sit in the bullet gutter

| Input | Outcome |
| --- | --- |
| '- [ ] a' and '- [x] b' | the items have task-list-item and the list has contains-task-list |
| '- a' without a marker | no task-list class is added |

### Scenario (refusal): Markers stay literal where they have another meaning

| Input | Outcome |
| --- | --- |
| `` `[ ]` `` (inline code) | no checkbox |
| `\[ ]` (escape) | no checkbox |
| `[x](url)` (link text) | no checkbox |
| `## [ ] h` (ATX heading) | no checkbox |
| [ ] or [x] in code, math, diagrams, URLs, images, raw HTML, directive arguments, wikilink or reference syntax | literal text, no checkbox |

### Scenario (boundary): Defined reference label

- GIVEN a document defining '[x]: url' and using '[x]' and '[ ]'
- WHEN the preview is rendered
- THEN [x] stays a link and [ ] is a checkbox

### Scenario (nominal): The webview keeps checkbox inputs

- GIVEN rendered HTML with a checkbox input, and a checked checkbox input with line and column attributes
- WHEN it is sanitized for the webview
- THEN the input and its source attributes remain, the checked state, line and column attributes all kept

### Verification notes

- Method: test/core/render/checkboxRendering.test.ts (markers, line and column counting, gutter classes, literal contexts, defined reference label: unit and integration tests on the render pipeline output and DOM classes; sanitizer scenario: unit test on the sanitizer output).
- Method: test/core/render/checkboxMarkers.test.ts (literal contexts and defined reference label: unit tests on the render pipeline output).
- Criteria: Checkbox count and positions equal the source markers, in LF and CRLF; class names are present only for task lists; checkbox elements appear only in the allowed contexts; checkbox inputs keep their state and source attributes after sanitizing.
