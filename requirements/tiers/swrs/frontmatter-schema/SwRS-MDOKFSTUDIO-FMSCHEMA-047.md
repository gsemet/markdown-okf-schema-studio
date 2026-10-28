---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-047
uuid: 090b1bb7-7dab-4680-a62c-ecca716150c8
title: An invalid x-okf-link annotation marks the field
description: When an `x-okf-link` annotation is not an object, has a missing or
  unknown `resolution` or `syntax`, has a non-string marker, has display field
  lists that are not lists of names or has a non-boolean `show_line_number`, the
  extension SHALL mark the field with an error "[E10] x-okf-link ... at
  '{field}'".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-046; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-046
default_owner_email: gaetan@xeberon.net
---

## An invalid x-okf-link annotation marks the field

### Normative behavior

When an `x-okf-link` annotation is not an object, has a missing or unknown `resolution` or `syntax`, has a non-string marker, has display field lists that are not lists of names or has a non-boolean `show_line_number`, the extension SHALL mark the field with an error "[E10] x-okf-link ... at '{field}'".

### Scenario: Unknown resolution

- GIVEN an annotation with resolution nonsense
- WHEN the document is analysed
- THEN the field row carries the error [E10] x-okf-link resolution is invalid at 'ref' and counts in the badge

### Scenario: Missing syntax

- GIVEN an annotation with a resolution and no syntax
- WHEN the document is analysed
- THEN the field row carries [E10] x-okf-link syntax is invalid at 'a'

### Scenario: Accepted values

- GIVEN annotations using each of document-relative, bundle-relative, bundle-relative-stem, project-relative and filename-stem with syntax plain or wikilink
- WHEN the document is analysed
- THEN none of them is reported as invalid

### Verification notes

- Method: Unit test of the annotation parser.
- Criteria: A field list entry must be a non-empty string; show_line_number must be a boolean.
