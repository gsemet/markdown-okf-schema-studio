---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-280
uuid: 561c3599-785f-420a-8727-70dd2b399109
title: The Horizontal rule button is drawn as three dashes
description: While a block editor is open, the extension SHALL draw the
  Horizontal rule button of its edit bar as three separate dashes on one line.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-019
scenarios:
- id: S1
  title: The rule icon
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteIcons.ts
tested_in_files:
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Horizontal rule button is drawn as three dashes

### Normative behavior

While a block editor is open, the extension SHALL draw the icon of the Horizontal rule button of its edit bar as three separate short dashes on one line.

### Scenario S1 (nominal): The rule icon

- GIVEN the edit bar of a paragraph editor
- WHEN the buttons are built
- THEN the Horizontal rule icon is three separate dashes on one line, not the lines of centred text

### Verification notes

- Method: test/page/runtimeEditPalette.test.ts (T21b: the rule icon is dashes)
- Criteria: The rule icon path has no segment other than three short horizontal dashes.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-019](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-019.md): A writer formats text with buttons and shortcuts
<!-- okf:links:end -->
