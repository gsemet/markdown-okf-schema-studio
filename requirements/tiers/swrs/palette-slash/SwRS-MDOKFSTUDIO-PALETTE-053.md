---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-053
uuid: 6f358aeb-50e8-40a8-a684-a53146e17207
title: Numbered list numbers the touched non-blank lines
description: When the writer runs Numbered list, the extension SHALL put 1. , 2.
  and so on in front of the touched non-blank lines, replacing a bullet marker,
  and remove the markers when every non-blank touched line already has one.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
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
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
---

## Numbered list numbers the touched non-blank lines

### Normative behavior

When the writer runs Numbered list, the extension SHALL put 1. , 2. and so on in front of the touched non-blank lines, replacing a bullet marker, and remove the markers when every non-blank touched line already has one.

### Scenario (nominal): Numbering

- GIVEN the selection of a, a blank line and b
- WHEN Numbered list runs
- THEN the lines read 1. a and 2. b and the blank line is unchanged

### Scenario (nominal): Toggle off

- GIVEN lines that all start with a number and a dot
- WHEN Numbered list runs again
- THEN the markers are removed

### Scenario (boundary): Lines and markers

| Input | Outcome |
| --- | --- |
| empty text, caret at 0 | `1. ` with the caret after it |
| `a`, `b`, blank line, `c` all selected | `1. a`, `2. b`, blank line, `3. c` |
| `1. a` newline `2. b` all selected | `a` newline `b` |
| `- a` newline `- b` all selected | `1. a` newline `2. b` (a bullet marker is replaced) |
| `word` with the caret at its end | `1. word` |
| `/numbered` typed in the gfm mode, then Tab | the text gets the prefix `1. ` as one edit |

The action exists only as a slash menu entry, like Bulleted list (see SwRS-MDOKFSTUDIO-PALETTE-052).

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-052: both list actions are slash menu only, with no palette button and no shortcut.

### Verification notes

- Method: test/page/modules/editActions.test.ts (P11: Numbered list numbers the non-blank lines and toggles off; all scenarios)
- Method: test/page/modules/slashMenu.test.ts (P11 r2: choosing the list entries writes the list prefix as one edit; the /numbered row of the boundary scenario)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Criteria: The recognised markers are digits (one to nine) followed by a dot or a parenthesis.
