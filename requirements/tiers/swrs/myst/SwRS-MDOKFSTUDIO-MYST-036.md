---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-036
uuid: 28989353-0a2b-4cdd-bf26-95bf60fcb267
title: Labels show an anchor icon on the next block
description: 'When a document holds a `(name)=` label, the extension SHALL show a
  faint anchor icon with the tooltip Anchor: name as the first child of the next paragraph
  or heading without moving the text, and make it a link target without duplicating
  an existing id.'
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Labels show an anchor icon on the next block

### Normative behavior

When a document holds a `(name)=` label, the extension SHALL show a faint anchor icon with the tooltip Anchor: name as the first child of the next paragraph or heading without moving the text, and make it a link target without duplicating an existing id.

### Scenario: Nominal

- GIVEN `(intro)=` before a paragraph or heading
- WHEN the preview renders
- THEN the icon sits in the left margin, text does not move and the id is the label unless the heading or figure already carries it

### Scenario: Boundary or refusal

- GIVEN a label before a list, table, figure, code block or at document end
- WHEN the preview renders
- THEN the icon sits alone in a zero-height row

### Verification notes

- Method: test
- Criteria: Label characters are letters, digits and _ . : -; consecutive labels each get an icon.
