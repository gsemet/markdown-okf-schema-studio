---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-013
uuid: 45145e1b-b01a-4fa7-8fae-38cc9f5661ca
title: The properties section maps to source line 1
description: When the properties table is rendered for a document, the extension
  SHALL mark its section as source line 1.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-005
default_owner_email: gaetan@xeberon.net
---

## The properties section maps to source line 1

### Normative behavior

When the properties table is rendered for a document, the extension SHALL mark its section as source line 1.

### Scenario: Mapped section

- GIVEN a document with frontmatter and a source mapping for the preview
- WHEN the table is rendered
- THEN the section carries the source line attribute 1

### Scenario: Sync to line 1

- GIVEN the editor cursor is on line 1 of the source
- WHEN the preview syncs to the source line
- THEN the preview scrolls back to the top where the properties section sits

### Verification notes

- Method: Unit test of the table renderer; visual scenario (460 px scroll check).
- Criteria: data-line 1 is added only when a source mapping is given.
