---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-030
uuid: 7c5e1f54-7bd5-48db-87f7-fecf4d3874ac
title: Raw kbd renders as a key cap
description: When inline text contains a kbd element without attributes, the
  extension SHALL render a keyboard key cap.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Raw kbd renders as a key cap

### Normative behavior

When inline text contains a kbd element without attributes, the extension SHALL render a keyboard key cap.

### Scenario: Kbd renders

- GIVEN the text 'Press' followed by a kbd element containing Ctrl
- WHEN the preview is rendered
- THEN a kbd element with the key text is present

### Scenario: Kbd with attributes

- GIVEN a kbd element with an onclick attribute
- WHEN the preview is rendered
- THEN no attributed kbd element is rendered

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Only plain kbd elements are kept.
