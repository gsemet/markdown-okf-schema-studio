---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-010
uuid: cfc9f72d-748b-44fc-a4ce-4518c9179327
title: Alert marker text becomes the title
description: When an alert marker is followed by text on its line, the extension
  SHALL use that text as the admonition title.
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

## Alert marker text becomes the title

### Normative behavior

When an alert marker is followed by text on its line, the extension SHALL use that text as the admonition title.

### Scenario: Explicit title

- GIVEN a block quote '> [!WARNING] Read this'
- WHEN the preview is rendered
- THEN the admonition title is Read this

### Scenario: No title text

- GIVEN a block quote '> [!WARNING]' alone
- WHEN the preview is rendered
- THEN the title is the default Warning

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Title equals the marker trailing text, else the default.
