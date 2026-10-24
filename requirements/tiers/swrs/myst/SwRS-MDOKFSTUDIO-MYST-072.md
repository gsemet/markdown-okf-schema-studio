---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-072
uuid: 007d57b5-c2f6-4d59-af7f-d8cb1ff0777f
title: Missing MyST extensions are detected at first use
description: When a document uses syntax needing colon_fence, dollarmath,
  amsmath, deflist, fieldlist, tasklist, strikethrough, substitution,
  attrs_inline, html_image or html_admonition, the extension SHALL detect each
  extension once at its first use, ordered by line.
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

## Missing MyST extensions are detected at first use

### Normative behavior

When a document uses syntax needing colon_fence, dollarmath, amsmath, deflist, fieldlist, tasklist, strikethrough, substitution, attrs_inline, html_image or html_admonition, the extension SHALL detect each extension once at its first use, ordered by line.

### Scenario: Nominal

- GIVEN `:::` and `$x$` in a document
- WHEN it is checked
- THEN colon_fence and dollarmath are detected once each, ordered by line

### Scenario: Boundary or refusal

- GIVEN a document using the same syntax twice
- WHEN it is checked
- THEN one detection per extension

### Verification notes

- Method: test
- Criteria: One table-driven family.
