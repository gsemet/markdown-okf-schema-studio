---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-025
uuid: 410787e3-02bb-4d28-965f-16307e9293c4
title: Maths typesets offline without inline styles
description: When the preview typesets maths, the extension SHALL load the KaTeX
  stylesheet and fonts from the extension bundle, emit no inline style attribute
  and need no script or network request.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Maths typesets offline without inline styles

### Normative behavior

When the preview typesets maths, the extension SHALL load the KaTeX stylesheet and fonts from the extension bundle, emit no inline style attribute and need no script or network request.

### Scenario: Nominal

- GIVEN a document with display math
- WHEN the preview renders offline
- THEN the equation is typeset with bundle fonts and no inline style attribute, styles being classes in one nonce-protected style block

### Scenario: Boundary or refusal

- GIVEN the KaTeX bundle is missing
- WHEN the preview renders
- THEN equations stay as raw TeX text

### Verification notes

- Method: test
- Criteria: No external request is made.
