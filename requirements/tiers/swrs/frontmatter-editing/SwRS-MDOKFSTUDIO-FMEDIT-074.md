---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-074
uuid: 81336bdb-d48d-44dc-a99d-0fe64bc1b014
title: A chosen enum value is posted when the select loses focus or Enter is
  pressed
description: When a writer has chosen a value in the select of an enum field,
  the extension SHALL post the value when the select loses focus or Enter is
  pressed in it.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-003; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-003
default_owner_email: gaetan@xeberon.net
---

## A chosen enum value is posted when the select loses focus or Enter is pressed

### Normative behavior

When a writer has chosen a value in the select of an enum field, the extension SHALL post the value when the select loses focus or Enter is pressed in it.

### Scenario: Nominal

- GIVEN the select of the lifecycle field with active chosen
- WHEN the select loses focus (or Enter is pressed in it)
- THEN one previewFrontmatterSave with fieldValue "active" is posted

### Scenario: Boundary or refusal

- GIVEN the select with a value chosen
- WHEN nothing else happens after the pick
- THEN nothing is posted: a pick alone does not save

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: There is no change listener on the select; an unchanged value closes the editor without a post.
