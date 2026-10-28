---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-017
uuid: bb8cc900-cdd5-49b0-9785-d49f1f2809fa
title: Nullable fields offer Set to null
description: When a writer edits a field whose schema allows null, the extension
  SHALL offer a Set to null button that saves the value null.
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

## Nullable fields offer Set to null

### Normative behavior

When a writer edits a field whose schema allows null, the extension SHALL offer a Set to null button that saves the value null.

### Scenario: Nominal

- GIVEN a nullable scalar field with its editor open
- WHEN the writer presses "Set to null" (aria-label "Set {name} value to null")
- THEN a save with fieldValue null is posted

### Scenario: Boundary or refusal

- GIVEN a nullable list field
- WHEN the writer opens its editor
- THEN the button appears inside the list editor as a link-like button and saves null as well; a field that is not nullable has no such button

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests nullable scalar editor can set its value to null; nullable list editor can set its value as null.
