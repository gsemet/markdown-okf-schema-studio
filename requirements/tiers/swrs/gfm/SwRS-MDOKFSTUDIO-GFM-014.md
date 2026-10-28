---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-014
uuid: 0fc664e7-f84c-466c-9d47-402f8447179c
title: Footnotes render reference and text
description: When a document contains a footnote reference and its definition,
  the extension SHALL render the reference and the footnote text.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-008; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-008
default_owner_email: gaetan@xeberon.net
---

## Footnotes render reference and text

### Normative behavior

When a document contains a footnote reference and its definition, the extension SHALL render the reference and the footnote text.

### Scenario: Footnote renders

- GIVEN a paragraph with [^1] and a definition [^1]: Text
- WHEN the preview is rendered
- THEN a reference and the footnote text are present

### Scenario: Reference without definition

- GIVEN a [^2] reference with no definition
- WHEN the preview is rendered
- THEN no footnote text is invented and rendering succeeds

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Footnote reference and definition elements are present for defined notes.
