---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-007
uuid: a9e2c6ed-4d23-4ee1-a77c-663ca28f4e90
title: Code blocks use one font scale, one box and scroll long lines
description: When a code block is shown, the extension SHALL style the block
  with the editor foreground colour, a font size of 0.92em, a 4 px radius, a
  border and the code-block background, scroll a line wider than the block
  inside it outside Auto width mode, and keep the background soft and readable
  in the forced white and cream themes.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.markers.ts
tested_in_files:
- test/core/preview/creamTheme.test.ts
- test/core/preview/previewStyles.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CODE-012
- SwRS-MDOKFSTUDIO-CODE-013
- SwRS-MDOKFSTUDIO-CODE-016
---

## Code blocks use one font scale, one box and scroll long lines

### Normative behavior

When a code block is shown, the extension SHALL style the block with the editor foreground colour, a font size of 0.92em, a 4 px radius, a border and the code-block background, scroll a line wider than the block inside it outside Auto width mode, and keep the background soft and readable in the forced white and cream themes.

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
| cream, with a Python block | The block has a soft background and readable text while the dark background setting is off; by default it is the Dark+ surface (SwRS-MDOKFSTUDIO-CODE-040) |
| white, with a Python block | The text stays readable on the soft background while the dark background setting is off |

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-001: highlights fenced code
- SwRS-MDOKFSTUDIO-CODE-008: colours and shapes diff blocks
- SwRS-MDOKFSTUDIO-CODE-040: draws code blocks on the dark background and sets the token colours

### Verification notes

- Method: test/core/preview/previewStyles.test.ts (block style on top-level and nested blocks, white and cream rules; one font scale, one box and the scroll rule: "code blocks use one font scale, one box, and scroll a long line only when it does not fit")
- Method: test/core/preview/creamTheme.test.ts (cream and white soft background and readable text)
- Method: test/visual/scenarioDefinitions1.ts (long line scroll at 460 px with geometry check, exact-fit line)
- Criteria: computed values equal the stated style on top-level and nested blocks; block scrollWidth exceeds clientWidth for the long line, equals it for the exact-fit line and the document never overflows; the white and cream rules set a soft background and a readable text colour

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-012](SwRS-MDOKFSTUDIO-CODE-012.md): Style fenced code blocks with one font scale and the code background
  - [SwRS-MDOKFSTUDIO-CODE-013](SwRS-MDOKFSTUDIO-CODE-013.md): Scroll long code lines inside their block
  - [SwRS-MDOKFSTUDIO-CODE-016](SwRS-MDOKFSTUDIO-CODE-016.md): Keep code backgrounds soft and readable in the forced white and cream themes
<!-- okf:links:end -->
