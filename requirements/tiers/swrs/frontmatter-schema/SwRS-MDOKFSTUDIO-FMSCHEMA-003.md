---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-003
uuid: 8131dbcb-1c3a-4ce2-8b72-9e377d58476c
title: Frontmatter fences accept Windows line endings
description: When the fence lines of a document end with CRLF, the extension
  SHALL read the frontmatter block exactly as it reads one with LF endings.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## Frontmatter fences accept Windows line endings

### Normative behavior

When the fence lines of a document end with CRLF, the extension SHALL read the frontmatter block exactly as it reads one with LF endings.

### Scenario: CRLF document

- GIVEN a document whose opening fence, fields and closing fence all end with CRLF
- WHEN the preview is rendered
- THEN the table lists the same fields and values as the LF form of the document

### Scenario: CRLF with dots

- GIVEN a CRLF document closed by a `...` line
- WHEN the preview is rendered
- THEN the block closes at the `...` line and the table lists the fields above it

### Verification notes

- Method: Unit test of the fence matcher with CRLF sources.
- Criteria: The block length and the line ending are detected from the opening fence; a CRLF closing line is accepted in both forms.
