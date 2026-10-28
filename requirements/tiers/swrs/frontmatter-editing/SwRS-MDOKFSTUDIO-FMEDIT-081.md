---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-081
uuid: f3850ccb-0bb7-4d87-aae7-e29943533998
title: A chosen enum value is posted when the select loses focus or Enter is
  pressed
description: When a writer has chosen a value in the select of an enum field,
  the extension SHALL post the value when the select loses focus or Enter is
  pressed in it.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
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
