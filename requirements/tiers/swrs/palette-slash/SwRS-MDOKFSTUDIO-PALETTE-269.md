---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-269
uuid: 0415d3cc-3f2f-4d87-b2fe-acf8016b2f43
title: Caret on an alert or admonition type lists the types
description: When the caret is on the type of a GitHub alert head or of a MyST
  admonition directive, the extension SHALL show above it a list of the types of
  that syntax with their icons, and a chosen type replaces the type text only.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/calloutIcons.ts
- src/page/modules/blockEditActions.ts
- src/page/modules/editActions.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/page/modules/editPalette.test.ts
- test/visual/admonitionTypePickerScenarios.ts
- test/visual/releaseShowcaseScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Caret on an alert or admonition type lists the types

### Normative behavior

When the caret is on the type of a GitHub alert head or of a MyST admonition directive, the extension SHALL show above it a list of the types of that syntax with their icons, and a chosen type replaces the type text only.

### Scenario (nominal): Choosing a type

- GIVEN the caret on the type word of `> [!NOTE]` in GFM, MyST or Full mode, or on the type of `:::{note}` in MyST or Full mode
- WHEN the caret arrives there (a click, an arrow key, typing)
- THEN a list opens with an icon per type, none lit: the five GFM types NOTE, TIP, IMPORTANT, WARNING and CAUTION for an alert, the admonition types of the Admonition list (without Custom) for a directive
- AND choosing a type replaces the type text only, as one more edit; the title, the body and the caret stay in place
- AND the arrow keys move the lit type, Enter chooses it and Escape closes the list

### Scenario (boundary): Where the list does not open

| Input | Outcome |
| --- | --- |
| The caret elsewhere on the head line or in the body | No list; a list opened for the type closes when the caret leaves it |
| A selection instead of a caret | No list |
| An admonition directive in GFM mode, or an alert in strict mode | No list: the list follows the palette mode |
| The same type after Escape or a choice | The list stays closed until the caret has left the type |
| The caret measurable, with room above the line | The list sits above the caret line; otherwise it sits under it |

### Verification notes

- Method: page test of the palette (`test/page/modules/editPalette.test.ts`) and simulated visual
  scenarios `palette-slash/v36` to `v39` (`test/visual/admonitionTypePickerScenarios.ts`): the GFM
  list and the MyST list in the light and dark themes, with the caret on the type of the opened head.
- Criteria: the options, their icons, the replaced text and the keys are as above. In the visual
  scenarios the caret is on the first line of the block editor, directly under the edit bar: there
  is no room above it, so the list sits under the caret line.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
