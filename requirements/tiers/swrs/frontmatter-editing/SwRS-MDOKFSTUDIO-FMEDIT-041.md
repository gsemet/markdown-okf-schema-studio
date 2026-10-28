---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-041
uuid: b8cd6a1d-53d4-40e9-9bdb-c36457390240
title: A pending new-field editor is dropped when it cannot be used
description: When edit mode is off, the row of the new field is missing or the
  add failed, the extension SHALL drop the pending edit instead of opening an
  editor.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-037; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-037
default_owner_email: gaetan@xeberon.net
---

## A pending new-field editor is dropped when it cannot be used

### Normative behavior

When edit mode is off, the row of the new field is missing or the add failed, the extension SHALL drop the pending edit instead of opening an editor.

### Scenario: Nominal

- GIVEN a pending edit and edit mode turned off
- WHEN the table is re-rendered
- THEN no editor opens and the pending edit is cleared

### Scenario: Boundary or refusal

- GIVEN a pending edit and an add that the host refused
- WHEN the error result arrives
- THEN the pending edit is cleared; a missing row clears it as well

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T25 outside edit mode or for a missing row is dropped; an error result clears it.
