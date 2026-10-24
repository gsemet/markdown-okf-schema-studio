---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-068
uuid: 9bf51048-8a24-46e2-9569-dc1394762441
title: A flush save is written without the type and schema check
description: When the host receives a frontmatter save with the flush flag, the
  extension SHALL write the value as typed, skipping the type, YAML and schema
  checks.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A flush save is written without the type and schema check

### Normative behavior

When the host receives a frontmatter save with the flush flag, the extension SHALL write the value as typed, skipping the type, YAML and schema checks.

### Scenario: Nominal

- GIVEN a flush save of the text [ for a YAML field
- WHEN the host plans it
- THEN the text is written as a string and the plan needs no schema check

### Scenario: Boundary or refusal

- GIVEN a flush save of three for a number field with a schema
- WHEN the host plans it
- THEN the value is written instead of the stale-field refusal

### Verification notes

- Method: Unit test on the save plan (test/core/edits/frontmatterEdit.test.ts).
- Criteria: Other refusals (stale field, bad key, YAML that cannot be patched) still apply.
