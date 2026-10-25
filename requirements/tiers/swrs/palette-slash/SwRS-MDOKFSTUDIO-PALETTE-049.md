---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-049
uuid: 72354ac1-2c91-4c45-ae45-082243a4ef40
title: Blockquote prefixes the touched lines or removes one quote level
description: When the writer presses Blockquote, the extension SHALL put > and a
  space in front of every touched line, before a list marker, or remove one
  quote level when every non-blank touched line is already quoted.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
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
---

## Blockquote prefixes the touched lines or removes one quote level

### Normative behavior

When the writer presses Blockquote, the extension SHALL put > and a space in front of every touched line, before a list marker, or remove one quote level when every non-blank touched line is already quoted.

### Scenario (nominal): Quote a list

- GIVEN the selection of two list lines - a and - b
- WHEN Blockquote is pressed
- THEN both lines start with > before the list marker

### Scenario (nominal): Blank lines

- GIVEN a selection of a, a blank line and b
- WHEN Blockquote is pressed
- THEN the lines a and b get > and the blank line gets a bare >; a single blank line gets > followed by a space

### Scenario (boundary): Quote levels and line edges

In this table `[ ]` marks the selection and `|` marks the caret.

| Input | Outcome |
| --- | --- |
| `a\|bc` | `> a\|bc` |
| `> a\|bc` | `a\|bc` |
| `>> a\|` | `> a\|` (one level removed) |
| `[- a` newline `- b]` | `[> - a` newline `> - b]` |
| `[> - a` newline `> - b]` | `[- a` newline `- b]` |
| `[1. a` newline `   2. b]` | `[> 1. a` newline `>    2. b]` |
| `x` newline `[a` newline `b]` newline `y` | only the touched lines a and b get `> ` |
| `[a` newline `> b]` (one line already quoted) | `[> a` newline `> > b]` |
| `\|` | `> \|` |
| `> \|` | `\|` |
| `[a` newline `]b` (selection ending at a line start) | `[> a` newline `]b` (the line b is not touched) |

### Verification notes

- Method: test/page/modules/editActions.test.ts (data-driven rows named editActions quote: all scenarios)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Criteria: Pressing the button twice on a quoted selection restores the text; a selection ending at a line start does not touch that line.
