---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-126
uuid: c2e08d85-64c9-4f40-9167-57a8b4053ac1
title: Key wraps the selection in kbd tags, removes them, or inserts a sample
description: When the writer presses Key, the extension SHALL wrap the selection
  in a kbd element, remove the tags when the selection or its surroundings
  already have them, and insert a kbd element with the sample Key selected when
  nothing is selected.
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
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## Key wraps the selection in kbd tags, removes them, or inserts a sample

### Normative behavior

When the writer presses Key, the extension SHALL wrap the selection in a kbd element, remove the tags when the selection or its surroundings already have them, and insert a kbd element with the sample Key selected when nothing is selected.

### Scenario (nominal): Wrap and unwrap

- GIVEN a selected word
- WHEN Key is pressed twice
- THEN the word is wrapped in kbd tags and then unwrapped

### Scenario (boundary): Sample and table cell

| Input | Outcome |
| --- | --- |
| The caret with no selection | A kbd element holding Key is inserted with Key selected |
| Key pressed in a table cell editor | Key works in a table cell too |

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-029: the rendering of a kbd element.

### Verification notes

- Method: test/page/modules/editActions.test.ts (T26: kbd wraps the selection, unwraps it, and inserts a sample on a caret; scenarios wrap and unwrap, sample)
- Method: test/page/modules/editPalette.test.ts (T26: Details, Footnote, Mermaid and Key are one-click actions; scenario sample and table cell)
- Criteria: Key works in a table cell too.
