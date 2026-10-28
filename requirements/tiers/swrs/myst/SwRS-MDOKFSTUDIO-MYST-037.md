---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-037
uuid: b093d625-f3c3-4ad5-aa66-b7a5eb709639
title: The anchor icon is not a mapped block and carries its source line
description: When an anchor icon renders, the extension SHALL leave it out of
  the mapped blocks and Tab order and give it data-okf-label-line with the
  absolute source line of its label.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-036; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-036
default_owner_email: gaetan@xeberon.net
---

## The anchor icon is not a mapped block and carries its source line

### Normative behavior

When an anchor icon renders, the extension SHALL leave it out of the mapped blocks and Tab order and give it data-okf-label-line with the absolute source line of its label.

### Scenario: Nominal

- GIVEN a document with frontmatter and a label
- WHEN the preview renders
- THEN the icon has no data-line, data-sphinx-preview-block or tabindex and data-okf-label-line counts the frontmatter lines

### Scenario: Boundary or refusal

- GIVEN the labelled paragraph or heading
- WHEN the preview renders
- THEN it keeps its own mapping

### Verification notes

- Method: Unit test "a label before a paragraph renders an anchor icon span that is the link target" in test/core/render/mystPaletteRendering.test.ts
- Criteria: The icon has role img and aria-label Anchor: name.
