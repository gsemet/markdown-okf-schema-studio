---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-023
uuid: dc9a6b26-1842-4307-82dc-f0ffda66916a
title: A refused field save stays visible in the editor
description: "When the host refuses a field save, the extension SHALL show the host
  message in the error state in the editor, enable the controls again and keep the
  editor open."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-019
default_owner_email: gaetan@xeberon.net
---

## A refused field save stays visible in the editor

### Normative behavior

When the host refuses a field save, the extension SHALL show the host message in the error state in the editor, enable the controls again and keep the editor open.

### Scenario: Nominal

- GIVEN a field editor whose save is posted
- WHEN the host answers with an error message
- THEN the message shows in red in the editor, the controls are enabled and the editor stays open; Escape still closes it

### Scenario: Boundary or refusal

- GIVEN a result carrying another editId, or an error result without text
- WHEN the page receives it
- THEN the first is ignored and the second shows "The frontmatter edit could not be applied."

### Known issues

- Known issue: an editor left in an error state blocks every other field until it is cancelled.

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests frontmatter validation errors show an explicit error state; visual scenario frontmatter-editing/v02-edit-enum-value-dark-900.
