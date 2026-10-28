---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-060
uuid: b500a6d7-8ace-4217-b218-6de074ddb8a1
title: A properties update waits until the field editor closes
description: When the host sends an updated properties table while a field
  editor is open, the extension SHALL defer it and apply it when the editor
  closes.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-193; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-BLOCK-193
default_owner_email: gaetan@xeberon.net
---

## A properties update waits until the field editor closes

### Normative behavior

When the host sends an updated properties table while a field editor is open, the extension SHALL defer it and apply it when the editor closes.

### Scenario: Nominal

- GIVEN a field editor open
- WHEN previewPropertiesTable arrives
- THEN the table is not replaced and the markup is kept

### Scenario: Boundary or refusal

- GIVEN the editor closes
- WHEN the deferral ends
- THEN the kept table is applied

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T30 previewPropertiesTable is deferred while a frontmatter editor is open, then applied on close.
