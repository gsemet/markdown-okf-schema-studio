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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-024
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "typesets inline and display math with local assets and CSP-compatible styles" in test/core/render/mathRenderer.test.ts
- Criteria: No external request is made.
