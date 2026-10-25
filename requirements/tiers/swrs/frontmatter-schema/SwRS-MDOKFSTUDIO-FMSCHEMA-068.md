---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-068
uuid: eb046725-2437-44d5-9d98-362ddd337ef9
title: A link shows an excerpt of the linked file
description: When a link annotation lists `preview_shows_fields`, the extension
  SHALL show beside the resolved link one excerpt made of those field values
  with whitespace collapsed and joined by "; ", clipped with an ellipsis, with
  the full text in its own tooltip.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-067; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-067
---

## A link shows an excerpt of the linked file

### Normative behavior

When a link annotation lists `preview_shows_fields`, the extension SHALL show beside the resolved link one excerpt made of those field values with whitespace collapsed and joined by "; ", clipped with an ellipsis, with the full text in its own tooltip.

### Scenario: Excerpt

- GIVEN preview_shows_fields description and a target whose description spans two lines
- WHEN the table is rendered
- THEN the excerpt shows the two lines joined by a single space

### Scenario: No value

- GIVEN a preview field that the target does not define
- WHEN the table is rendered
- THEN no excerpt is shown

### Verification notes

- Method: Unit test of the table renderer; visual scenario.
- Criteria: The clipping is done by CSS; the excerpt element has the full text in its title.
