---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-069
uuid: b13a0e56-2231-412c-abda-a5736ab693a2
title: The conf.py reader understands list literal forms
description: When a conf.py writes `extensions` or `myst_enable_extensions` as
  list or tuple literals, the extension SHALL read their elements whatever the
  quoting, prefix, comment, continuation or line ending.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The conf.py reader understands list literal forms

### Normative behavior

When a conf.py writes `extensions` or `myst_enable_extensions` as list or tuple literals, the extension SHALL read their elements whatever the quoting, prefix, comment, continuation or line ending.

### Scenario: Nominal

- GIVEN lists with single, double and triple quotes, comments, trailing commas, implicit string joins and backslash or bracket continuations
- WHEN the file is read
- THEN the element list is complete and correct

### Scenario: Boundary or refusal

- GIVEN CRLF line endings and r or u string prefixes
- WHEN the file is read
- THEN the same elements result

### Verification notes

- Method: test
- Criteria: Literal forms are parsed; CRLF and prefixes have no dedicated assertion today.
