---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-013
uuid: a9bdc599-afeb-4336-9232-af5be0dd520d
title: Alerts render the same in CRLF documents
description: When a document uses CRLF line endings, the extension SHALL render
  alerts and fences exactly as for the same LF document.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-009; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-009
default_owner_email: gaetan@xeberon.net
---

## Alerts render the same in CRLF documents

### Normative behavior

When a document uses CRLF line endings, the extension SHALL render alerts and fences exactly as for the same LF document.

### Scenario: CRLF alert renders

- GIVEN an alert written with CRLF line endings
- WHEN the preview is rendered
- THEN an admonition is produced

### Scenario: CRLF with fence

- GIVEN a CRLF document mixing a fence and an alert
- WHEN the preview is rendered
- THEN the HTML equals the LF rendering

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: CRLF and LF outputs are identical.
