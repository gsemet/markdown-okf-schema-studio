---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-133
uuid: 66ee8a92-da4c-487c-a01c-4294ac6ed632
title: Math wraps the selection in an inline, display or aligned equation
description: When the writer presses Math and chooses a kind of the menu of
  `Inline $…$`, `Display $$` and Aligned equations, the extension SHALL write
  the selection, or a sample, as `$text$`, as a `$$` block or as a `$$` block
  with a begin and end align environment, and refuse any other kind.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Math wraps the selection in an inline, display or aligned equation

### Normative behavior

When the writer presses Math and chooses a kind of the menu of `Inline $…$`, `Display $$` and Aligned equations, the extension SHALL write the selection, or a sample, as `$text$`, as a `$$` block or as a `$$` block with a begin and end align environment, and refuse any other kind.

### Scenario (nominal): The menu

- GIVEN the MyST mode
- WHEN the writer presses Math
- THEN the menu has the three entries with the values inline, display and aligned, and the tooltip reads Math (choose inline, display or aligned)

### Scenario (nominal): Inline

- GIVEN the text a b c with b selected
- WHEN Inline is chosen
- THEN the text is `a $b$ c` with b selected

### Scenario (nominal): Block

- GIVEN the caret after Intro
- WHEN Aligned is chosen
- THEN a `$$` block with the align environment and the sample a &= b follows Intro after a blank line, with the sample selected

### Scenario (boundary): Samples with no selection

| Kind | Sample written with no selection |
| --- | --- |
| Inline | x |
| Display | E = mc^2 |
| Aligned | a &= b |

### Scenario (refusal): Unknown kind

- GIVEN the argument bogus
- WHEN the math action runs
- THEN no edit is produced

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit tests "the MyST actions are myst-only with no shortcut; sub and sup also work in a cell": scenario The menu; "math inline, display and aligned": scenarios Inline, Block, Samples with no selection and Unknown kind, the argument bogus)
- Criteria: The tooltip reads Math (choose inline, display or aligned); with no selection the inline sample is x and the display sample is E = mc^2.
