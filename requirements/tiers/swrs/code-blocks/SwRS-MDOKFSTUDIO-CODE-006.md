---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-006
uuid: 9a3d3b9d-0f37-4048-aa8c-453a718cd67b
title: Show special characters once in highlighted code
description: When highlighted code contains `<`, `&` or numeric character
  references, the extension SHALL show each character once, without double
  escaping.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-005
default_owner_email: gaetan@xeberon.net
---

## Show special characters once in highlighted code

### Normative behavior

When highlighted code contains `<`, `&` or numeric character references, the extension SHALL show each character once, without double escaping.

### Scenario: nominal behavior

- GIVEN a block containing `a < b && c` and `&#60;`
- WHEN the preview renders it
- THEN the page shows `a < b && c` and `<` exactly once each

### Scenario: boundary or refusal behavior

- GIVEN a block containing an unknown named reference such as `&bogus;`
- WHEN the preview renders it
- THEN the text is shown as written, not altered

### Verification notes

- Method: Unit test on the highlighter output.
- Criteria: No `&amp;amp;` appears in the output; displayed text equals the source.
