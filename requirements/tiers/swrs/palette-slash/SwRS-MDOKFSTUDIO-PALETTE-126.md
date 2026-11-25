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
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-020
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

- SwRS-MDOKFSTUDIO-CORE-071: the rendering of a kbd element.

### Verification notes

- Method: test/page/modules/editActions.test.ts (T26: kbd wraps the selection, unwraps it, and inserts a sample on a caret; scenarios wrap and unwrap, sample)
- Method: test/page/modules/editPalette.test.ts (T26: Details, Footnote, Mermaid and Key are one-click actions; scenario sample and table cell)
- Criteria: Key works in a table cell too.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-020](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-020.md): A writer inserts GitHub Flavored Markdown constructs
- Superseded by:
  - [SwRS-MDOKFSTUDIO-PALETTE-276](SwRS-MDOKFSTUDIO-PALETTE-276.md): Inline marker buttons toggle their markers around the selection
<!-- okf:links:end -->
