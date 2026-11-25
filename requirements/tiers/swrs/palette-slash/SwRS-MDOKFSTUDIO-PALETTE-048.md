---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-048
uuid: 20fba19a-e3c2-41c2-aaa0-5d4265596f2c
title: Strikethrough toggles a double tilde pair
description: When the writer presses Strikethrough, the extension SHALL wrap the
  selection, or the word at a collapsed caret, in ~~ markers, insert an empty
  pair at a caret outside a word, and remove the markers when they are already
  there.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-019
depends_on: []
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-PALETTE-276; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
superseded_by:
- SwRS-MDOKFSTUDIO-PALETTE-276
---

## Strikethrough toggles a double tilde pair

### Normative behavior

When the writer presses Strikethrough, the extension SHALL wrap the selection, or the word at a collapsed caret, in ~~ markers, insert an empty pair at a caret outside a word, and remove the markers when they are already there.

### Scenario (nominal): Wrap

- GIVEN the text say foo now with foo selected
- WHEN Strikethrough is pressed
- THEN the text is say ~~foo~~ now with foo selected

### Scenario (nominal): Unwrap from the caret

- GIVEN the caret inside ~~foo~~
- WHEN Strikethrough is pressed
- THEN the markers are removed and the caret stays in the word

### Scenario (boundary): Selection edges, empty pair and lines

In this table `[ ]` marks the selection and `|` marks the caret.

| Input | Outcome |
| --- | --- |
| `say ~~[foo]~~ now` (markers outside the selection) | `say [foo] now` |
| `say [~~foo~~] now` (markers inside the selection) | `say [foo] now` |
| `say ~~fo\|o~~ now` | `say fo\|o now` |
| `say \| now` (caret outside a word) | `say ~~\|~~ now` |
| `x ~~\|~~ y` (empty pair) | `x \| y` |
| `a[ foo ]b` (blanks at the selection edges are ignored) | `a ~~[foo]~~ b` |
| `[a` newline `b]` (multi-line selection) | `~~[a` newline `b]~~` |

The button has no keyboard shortcut.

### Verification notes

- Method: test/page/modules/editActions.test.ts (data-driven rows named editActions strikethrough: all scenarios)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Criteria: The edges of the selection ignore surrounding blanks; the button has no keyboard shortcut.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-019](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-019.md): A writer formats text with buttons and shortcuts
- Superseded by:
  - [SwRS-MDOKFSTUDIO-PALETTE-276](SwRS-MDOKFSTUDIO-PALETTE-276.md): Inline marker buttons toggle their markers around the selection
<!-- okf:links:end -->
