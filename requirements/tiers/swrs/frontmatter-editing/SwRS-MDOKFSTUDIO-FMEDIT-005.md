---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-005
uuid: 7d0e3a94-260d-48e9-bd60-076dd3f86829
title: Trailing line breaks of a text value are dropped
description: When a writer saves a text field, the extension SHALL remove the
  trailing line breaks of the typed value unless the original value ended with a
  line break.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-004; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-004
default_owner_email: gaetan@xeberon.net
---

## Trailing line breaks of a text value are dropped

### Normative behavior

When a writer saves a text field, the extension SHALL remove the trailing line breaks of the typed value unless the original value ended with a line break.

### Scenario: Nominal

- GIVEN a text field whose original value does not end with a line break, with two empty lines typed after the text
- WHEN the writer saves
- THEN the posted fieldValue has no trailing line break

### Scenario: Boundary or refusal

- GIVEN a text field whose original value ends with a line break
- WHEN the writer saves without removing it
- THEN the trailing line break is kept in the posted value

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Posted fieldValue compared in both cases.
