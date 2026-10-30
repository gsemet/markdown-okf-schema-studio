---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-050
uuid: 3b956431-9f34-43bf-b66d-93fbb84051db
title: Horizontal rule puts three dashes between blank lines
description: When the writer presses Horizontal rule, the extension SHALL insert
  --- on its own line, set apart by blank lines, after the line the selection
  ends on, with the caret after it.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Horizontal rule puts three dashes between blank lines

### Normative behavior

When the writer presses Horizontal rule, the extension SHALL insert --- on its own line, set apart by blank lines, after the line the selection ends on, with the caret after it.

### Scenario (nominal): After a paragraph

- GIVEN the caret in the text para
- WHEN Horizontal rule is pressed
- THEN the text becomes para, a blank line, ---, a blank line, with the caret on the last line

### Scenario (nominal): Empty text

- GIVEN an empty text
- WHEN Horizontal rule is pressed
- THEN the text is --- followed by a blank line

### Scenario (boundary): Caret position and existing blank lines

In this table `[ ]` marks the selection and `|` marks the caret; the rule is written on the line the selection ends on.

| Input | Outcome |
| --- | --- |
| `para\|` | `para`, blank line, `---`, blank line, `\|` |
| `pa\|ra` | `para`, blank line, `---`, blank line, `\|` |
| `a\|` newline `b` | `a`, blank line, `---`, blank line, `\|b` |
| `\|` | `---`, blank line, `\|` |
| `a` newline `\|` | `a`, blank line, `---`, blank line, `\|` (no extra blank line) |
| `a`, blank line, `\|` | `a`, blank line, `---`, blank line, `\|` (no extra blank line) |
| `[a` newline `b]` | `a` newline `b`, blank line, `---`, blank line, `\|` |

### Verification notes

- Method: test/page/modules/editActions.test.ts (data-driven rows named editActions rule: all scenarios)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Criteria: No extra blank line is added where one already exists.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
