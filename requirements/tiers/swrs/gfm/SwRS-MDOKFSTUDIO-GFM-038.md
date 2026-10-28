---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-038
uuid: 8a6fd492-585e-4e79-9df5-3b5090c42093
title: Raw HTML tables remove active content
description: When a raw HTML table contains script, style, iframe, svg, form,
  embed or object elements, the extension SHALL remove them with their content
  and drop comments.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-031; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-031
default_owner_email: gaetan@xeberon.net
---

## Raw HTML tables remove active content

### Normative behavior

When a raw HTML table contains script, style, iframe, svg, form, embed or object elements, the extension SHALL remove them with their content and drop comments.

### Scenario: Active content removed

- GIVEN a raw table cell containing a script element and an iframe element with text inside
- WHEN the preview is rendered
- THEN both are removed with their content

### Scenario: Unknown tag and comment

- GIVEN a cell with an unknown tag around text and an HTML comment
- WHEN the preview is rendered
- THEN the tag is unwrapped, its text is kept and the comment is dropped

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: No active element or comment in the output.
