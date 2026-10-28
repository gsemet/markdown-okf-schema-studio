---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-018
uuid: 65d8a58c-d6c4-4a8b-a4b1-9b8fbf76b35d
title: Frontmatter that is not a mapping gives an error row
description: 'When the frontmatter block parses to a list, a scalar or nothing, the
  extension SHALL show the error row "Invalid frontmatter YAML: Frontmatter is not
  a mapping.".'
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-001
default_owner_email: gaetan@xeberon.net
---

## Frontmatter that is not a mapping gives an error row

### Normative behavior

When the frontmatter block parses to a list, a scalar or nothing, the extension SHALL show the error row "Invalid frontmatter YAML: Frontmatter is not a mapping.".

### Scenario: List frontmatter

- GIVEN a document whose frontmatter block holds the two list items `- a` and `- b`
- WHEN the preview is rendered
- THEN the table holds the error row "Invalid frontmatter YAML: Frontmatter is not a mapping." and the badge reads 1 error

### Scenario: Empty block

- GIVEN a document whose frontmatter is only the two fence lines
- WHEN the preview is rendered
- THEN the same error row is shown, because an empty block parses to null

### Verification notes

- Method: Unit test `frontmatter that is a list or an empty block gives the not-a-mapping error row and one error` in `test/core/frontmatter/diagReq.frontmatter.requirements.test.ts`.
- Criteria: The extraction returns present = true, no mapping and the message Frontmatter is not a mapping.
- Known issue: a YAML alias that expands more than 100 times fails the parse and is reported as invalid YAML, not as a mapping problem.
- Known issue: an empty block is a valid fence but still gets this error row.
