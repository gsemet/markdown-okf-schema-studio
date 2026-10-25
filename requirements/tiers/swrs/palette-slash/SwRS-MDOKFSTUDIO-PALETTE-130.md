---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-130
uuid: 42740697-c082-4334-8160-0c6e73e1b4d8
title: Custom writes a titled admonition with a class
description: "When the writer chooses Custom in the Admonition menu, the extension
  SHALL write `:::{admonition} Title` with the option `:class: note`, and select the
  word Title."
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-127
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## Custom writes a titled admonition with a class

### Normative behavior

When the writer chooses Custom in the Admonition menu, the extension SHALL write `:::{admonition} Title` with the option `:class: note`, and select the word Title.

### Scenario (nominal): Wrap

- GIVEN the selected text Body
- WHEN Custom is chosen
- THEN the text is the titled fence with the option and Body, and Title is selected

### Scenario (nominal): Empty

- GIVEN the caret after Intro
- WHEN Custom is chosen
- THEN a new titled fence follows Intro, set apart by a blank line, with Title selected

### Scenario (boundary): Option line

| Input | Outcome |
| --- | --- |
| Custom chosen | The option line `:class: note` is followed by a blank line |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-127: the Admonition menu, the colon fence and the refusal of an unknown type.

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit test "custom admonition writes a titled block with a class and selects the title": scenarios Wrap, Empty and Option line)
- Criteria: The option line is followed by a blank line.
