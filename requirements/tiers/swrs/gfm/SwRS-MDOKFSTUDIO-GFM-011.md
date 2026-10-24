---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-011
uuid: 462452ea-b807-4726-a8a9-d5990bf1696b
title: Legacy bold markers render as admonitions
description: When a block quote line contains only **Note**, **Important** or
  **Warning** in any case, the extension SHALL render the quote as a simple
  admonition of that type.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Legacy bold markers render as admonitions

### Normative behavior

When a block quote line contains only **Note**, **Important** or **Warning** in any case, the extension SHALL render the quote as a simple admonition of that type.

### Scenario: Bold Note marker

- GIVEN a block quote whose first line is '> **Note**' followed by text
- WHEN the preview is rendered
- THEN a simple Note admonition contains the text

### Scenario: Marker with extra text

- GIVEN a block quote line '> **Note** and more'
- WHEN the preview is rendered
- THEN it stays a plain block quote

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Simple admonitions only for lone bold markers.
