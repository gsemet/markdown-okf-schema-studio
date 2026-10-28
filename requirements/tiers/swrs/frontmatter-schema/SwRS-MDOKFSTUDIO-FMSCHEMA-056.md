---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-056
uuid: 85f369d5-96db-4859-9e8f-9c0d153050de
title: An ambiguous or unknown stem is an error
description: When a filename stem matches several files or none, the extension
  SHALL report the E10 error "is ambiguous" or "was not found".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-055; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-055
default_owner_email: gaetan@xeberon.net
---

## An ambiguous or unknown stem is an error

### Normative behavior

When a filename stem matches several files or none, the extension SHALL report the E10 error "is ambiguous" or "was not found".

### Scenario: Two files

- GIVEN files docs/a/same.md and docs/b/same.md and the value same
- WHEN the document is analysed
- THEN the field carries [E10] filename stem 'same' is ambiguous at 'ref' and the label reads Several files match

### Scenario: No file

- GIVEN the value zzz with no such file
- WHEN the document is analysed
- THEN the field carries [E10] filename stem 'zzz' was not found at 'ref' and the label reads File not found

### Verification notes

- Method: Unit test of the link resolver.
- Criteria: A stale index is rebuilt once before the answer is given.
