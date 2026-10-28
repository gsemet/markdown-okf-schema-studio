---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-008
uuid: 67f8ac33-e65e-4fc0-9b6e-5433ea764230
title: Mermaid edge labels stay readable
description: When a Mermaid map with edge labels is drawn in the dark, light or
  fallback theme, the extension SHALL keep every edge label in the picture with
  a text contrast of at least 4.5:1 against its background.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-005
default_owner_email: gaetan@xeberon.net
---

## Mermaid edge labels stay readable

### Normative behavior

When a Mermaid map with edge labels is drawn in the dark, light or fallback theme, the extension SHALL keep every edge label in the picture with a text contrast of at least 4.5:1 against its background.

### Scenario: Dark theme map

- GIVEN a Mermaid map whose edges carry labels, in the dark theme
- WHEN the page draws the diagram
- THEN the picture holds as many edge labels as the source defines and each has a contrast of at least 4.5:1

### Scenario: Fallback theme map

- GIVEN the same map in a preview that gives no host colour variables
- WHEN the page draws the diagram
- THEN the labels are kept and each has a contrast of at least 4.5:1

### Known issues

- Known issue: Checked by the visual campaign only; no unit test.

### Verification notes

- Method: Visual scenarios diagrams v01 to v03 (edge label count against the source and contrast ratio).
- Criteria: Label count equals the source and every ratio is at least 4.5.
