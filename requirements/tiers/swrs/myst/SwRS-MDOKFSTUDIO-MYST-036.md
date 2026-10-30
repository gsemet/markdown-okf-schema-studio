---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-036
uuid: 28989353-0a2b-4cdd-bf26-95bf60fcb267
title: Labels show an anchor icon on the next block
description: "When a document holds a `(name)=` label, the extension SHALL show a
  faint anchor icon with the tooltip Anchor: name as the first child of the next paragraph
  or heading without moving the text, make it a link target without duplicating an
  existing id, and keep the icon out of the mapped blocks and the Tab order with the
  absolute source line of its label."
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystInlineTransforms.ts
tested_in_files:
- test/core/render/mystPaletteRendering.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-037
---

## Labels show an anchor icon on the next block

### Normative behavior

When a document holds a `(name)=` label, the extension SHALL show a faint anchor icon with the tooltip Anchor: name as the first child of the next paragraph or heading without moving the text, make it a link target without duplicating an existing id, and keep the icon out of the mapped blocks and the Tab order with the absolute source line of its label.

### Scenario (nominal): The icon sits on the next paragraph or heading
- GIVEN `(intro)=` before a paragraph or heading
- WHEN the preview renders
- THEN the icon sits in the left margin, the text does not move and the id is the label unless the heading or figure already carries it

### Scenario (boundary): A label before another block or at the end
- GIVEN a label before a list, table, figure, code block or at document end
- WHEN the preview renders
- THEN the icon sits alone in a zero-height row

| Input | Outcome |
| --- | --- |
| Label characters: letters, digits and `_ . : -` | accepted in a label name |
| Consecutive labels | each gets an icon |

### Scenario (nominal): The icon is not a mapped block and carries its source line
- GIVEN a document with frontmatter and a label
- WHEN the preview renders
- THEN the icon has no data-line, data-sphinx-preview-block or tabindex, data-okf-label-line counts the frontmatter lines, and the icon has role img and aria-label Anchor: name

### Scenario (boundary): The labelled block keeps its own mapping
- GIVEN the labelled paragraph or heading
- WHEN the preview renders
- THEN it keeps its own mapping

### Verification notes
- Method: test/core/render/mystPaletteRendering.test.ts ("a label before a paragraph renders an anchor icon span that is the link target": scenarios 1, 3 and 4)
- Method: visual scenario `figure-anchors-${theme}-${mode ?? "theme"}` in test/visual/scenarioDefinitions2.ts (scenarios 1 and 2: icon in the margin, zero-height row)
- Criteria: Label characters are letters, digits and _ . : -; consecutive labels each get an icon. The icon has role img and aria-label Anchor: name.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Supersedes:
  - [SwRS-MDOKFSTUDIO-MYST-037](SwRS-MDOKFSTUDIO-MYST-037.md): The anchor icon is not a mapped block and carries its source line
<!-- okf:links:end -->
