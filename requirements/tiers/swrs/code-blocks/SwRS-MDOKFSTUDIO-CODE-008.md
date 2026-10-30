---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-008
uuid: 5a915238-f748-40fd-b42b-c4494c91bbbc
title: Diff blocks show additions and deletions
description: When a `diff` or `patch` block is shown, the extension SHALL mark
  each line starting with `+` as an addition and each line starting with `-` as
  a deletion, keeping the literal markers, and display the block as a full-width
  panel with square corners and no border.
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
- src/core/preview/styles/contentBlockStyles.ts
- src/core/render/highlight.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/render/highlight.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CODE-009
- SwRS-MDOKFSTUDIO-CODE-010
- SwRS-MDOKFSTUDIO-CODE-036
---

## Diff blocks show additions and deletions

### Normative behavior

When a `diff` or `patch` block is shown, the extension SHALL mark each line starting with `+` as an addition and each line starting with `-` as a deletion, keeping the literal markers, and display the block as a full-width panel with square corners and no border.

### Scenario (nominal): Additions and deletions are marked

- GIVEN a `diff` block with one `+` line, one `-` line and one context line
- WHEN the preview renders it
- THEN the `+` line shows as an addition, the `-` line as a deletion and the context line is unmarked, all with their markers

### Scenario (boundary): The first character decides the mark

| Line | Outcome |
| --- | --- |
| `+x` | Addition, marker kept in the text |
| `-x` | Deletion, marker kept in the text |
| `--- a/f` (file header) | Deletion, like an ordinary `-` line |
| `+++ b/f` (file header) | Addition, like an ordinary `+` line |
| context line starting with a space | Unmarked |
| empty line | Unmarked |
| `@@ -1 +1 @@` | Unmarked |
| `diff --git` header line | Unmarked |

A two-file diff has two deletion and two addition lines; `patch` blocks are marked the same way as `diff` blocks.

### Scenario (nominal): The panel is full width, square and borderless

- GIVEN a `diff` block in a prose paragraph context
- WHEN the preview renders it
- THEN the panel spans the block width with square corners and no border

### Scenario (boundary): A nested diff block keeps the look

- GIVEN a `diff` block nested in a list or admonition
- WHEN the preview renders it
- THEN the panel spans its container width with the same square, borderless look

### Scenario (nominal): Forced-colours mode uses system colours

- GIVEN forced-colours mode is active and a diff block is shown
- WHEN the preview renders it
- THEN additions use the system Mark colours and deletions the system Highlight colours

### Scenario (boundary): Outside forced-colours mode the theme colours apply

- GIVEN forced-colours mode is inactive
- WHEN the preview renders the same block
- THEN the theme-aware addition and deletion colours apply instead

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-005: wraps diff blocks into lines
- SwRS-MDOKFSTUDIO-CODE-007: colours addition and deletion tokens from the VS Code theme

### Verification notes

- Method: test/core/render/highlight.test.ts (marks per line, file header lines, literal markers, `diff` and `patch` fences)
- Method: test/core/preview/previewStyles.test.ts (square borderless panel, forced-colours rules)
- Method: test/visual/scenarioDefinitions1.ts (diff visual scenarios: marks and panel)
- Criteria: line classes match the first character and the markers stay in the text; two deletion and two addition lines for a two-file diff; computed radius 0, border none, width equal to the container; the Mark and Highlight rules exist inside the forced-colours media query for both line classes

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CODE-009](SwRS-MDOKFSTUDIO-CODE-009.md): Colour diff file header lines like ordinary lines
  - [SwRS-MDOKFSTUDIO-CODE-010](SwRS-MDOKFSTUDIO-CODE-010.md): Use system colours for diff lines in forced-colours mode
  - [SwRS-MDOKFSTUDIO-CODE-036](SwRS-MDOKFSTUDIO-CODE-036.md): Show diff blocks as a full-width square panel
<!-- okf:links:end -->
