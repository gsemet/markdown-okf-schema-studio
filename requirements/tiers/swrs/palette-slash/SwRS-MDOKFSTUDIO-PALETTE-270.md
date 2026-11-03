---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-270
uuid: 1a337252-7ad1-4556-8a92-df4651e8b26e
title: Card form inserts a MyST card
description: When the writer chooses Card from the MyST palette or the slash
  menu, the extension SHALL open a form for the card title, header, footer and
  link and, on Insert, write a {card} directive with the filled options after
  the selection.
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
- src/core/palette/paletteActions.ts
- src/page/features/editorChrome.ts
- src/page/modules/cardGridDirectives.ts
- src/page/modules/directivePanel.ts
tested_in_files:
- test/page/modules/cardGridDirectives.test.ts
- test/page/runtimePaletteActions.test.ts
- test/visual/cardGridFormScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Card form inserts a MyST card

### Normative behavior

When the writer chooses Card from the MyST palette or the slash menu, the extension SHALL open a form for the card title, header, footer and link and, on Insert, write a {card} directive with the filled options after the selection.

### Scenario (nominal): Open the form and insert

- GIVEN a block editor in the MyST palette mode
- WHEN the writer presses the Card button, or chooses Card in the slash menu (the typed /query is removed first)
- THEN a form opens under the palette with the fields Title, Header, Footer and Link; Insert writes a {card} directive after the selection, with a :header:, :footer: and :link: option for each filled field, an empty field leaving its option out, and selects the body placeholder

### Scenario (boundary): Cancel, empty title and line breaks

| Input | Outcome |
| --- | --- |
| Escape or Cancel | The form closes and the text is unchanged |
| Empty Title | The directive is written as {card} without an argument |
| A value with line breaks or runs of spaces | It is written on one line with single spaces |
| The text typed in the text box while the form is open | The form closes |

### Verification notes

- Method: test/page/modules/cardGridDirectives.test.ts (generated MyST of the card for each option and for the empty values)
- Method: test/page/runtimePaletteActions.test.ts (the form opens from the toolbar button and from the slash menu, Insert writes the card, Escape leaves the text unchanged)
- Criteria: The text written is the {card} directive the renderer draws as a card; the Card button shows in the MyST and Full palette modes only.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
