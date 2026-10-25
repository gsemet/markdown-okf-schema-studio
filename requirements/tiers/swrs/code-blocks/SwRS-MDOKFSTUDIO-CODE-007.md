---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-007
uuid: a9e2c6ed-4d23-4ee1-a77c-663ca28f4e90
title: Code blocks use one font scale, the theme colours and scroll long lines
description: When a code block is shown, the extension SHALL colour keywords,
  strings, numbers, additions, titles, attributes, deletions and comments with
  the matching VS Code chart colours, comments muted and italic, style the block
  with the editor foreground colour, a font size of 0.92em, a 4 px radius, a
  border and the code-block background, scroll a line wider than the block
  inside it outside Auto width mode, and keep the background soft and readable
  in the forced white and cream themes.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
tested_in_files:
- test/core/preview/creamTheme.test.ts
- test/core/preview/previewStyles.test.ts
- test/visual/scenarioDefinitions1.ts
---

## Code blocks use one font scale, the theme colours and scroll long lines

### Normative behavior

When a code block is shown, the extension SHALL colour keywords, strings, numbers, additions, titles, attributes, deletions and comments with the matching VS Code chart colours, comments muted and italic, style the block with the editor foreground colour, a font size of 0.92em, a 4 px radius, a border and the code-block background, scroll a line wider than the block inside it outside Auto width mode, and keep the background soft and readable in the forced white and cream themes.

### Scenario (nominal): Token classes use the theme colours

- GIVEN a dark VS Code theme and a highlighted block
- WHEN the preview renders it
- THEN each token class uses its theme colour variable and comments are italic and muted

### Scenario (boundary): A theme without chart colours uses the defaults

- GIVEN a theme that defines no chart colours
- WHEN the preview renders it
- THEN each token class uses its built-in default colour and comments stay italic

### Scenario (nominal): Fenced blocks share one style

- GIVEN any fenced block in the preview
- WHEN the page renders
- THEN the block has the editor foreground colour, a font size of 0.92em, the code-block background, border and a 4 px radius, and the inner code has no own box

### Scenario (boundary): A nested block has the same style

- GIVEN a block nested in a list or admonition
- WHEN the page renders
- THEN it uses the same style as a top-level block

### Scenario (nominal): A long line scrolls inside its block

- GIVEN a Python block with a very long line in a 460 px panel outside Auto width mode
- WHEN the reader scrolls the block to the right
- THEN the line's far end becomes visible and the page has no horizontal overflow

### Scenario (boundary): An exact-fit line needs no scrollbar

- GIVEN a block whose longest line is exactly as wide as the block
- WHEN the preview renders it
- THEN the block shows no horizontal scrollbar and the page has no overflow

### Scenario (boundary): Forced white and cream themes

| Forced theme | Outcome |
| --- | --- |
| cream, with a Python block | The block has a soft background and readable text |
| white, with a Python block | The text stays readable on the soft background |

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-001: highlights fenced code
- SwRS-MDOKFSTUDIO-CODE-008: colours and shapes diff blocks

### Verification notes

- Method: test/core/preview/previewStyles.test.ts (token colour variables and defaults, block style on top-level and nested blocks, white and cream rules)
- Method: test/core/preview/creamTheme.test.ts (cream and white soft background and readable text)
- Method: test/visual/scenarioDefinitions1.ts (long line scroll at 460 px with geometry check, exact-fit line)
- Criteria: each token class resolves to its chart colour variable, or to its built-in default when the variable is undefined, and comments are italic; computed values equal the stated style on top-level and nested blocks; block scrollWidth exceeds clientWidth for the long line, equals it for the exact-fit line and the document never overflows; the white and cream rules set a soft background and a readable text colour
