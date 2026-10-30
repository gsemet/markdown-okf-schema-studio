---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-022
uuid: a2245672-dac1-460e-baa0-6ee96e22eb9e
title: "A save in flight disables the editor and shows Saving"
description: "While a field save is in flight, the extension SHALL disable the editor
  controls and show \"Saving frontmatter…\" in the editor."
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-019
default_owner_email: gaetan@xeberon.net
---

## A save in flight disables the editor and shows Saving

### Normative behavior

While a field save is in flight, the extension SHALL disable the editor controls and show "Saving frontmatter…" in the editor.

### Scenario: Nominal

- GIVEN a field editor whose value was changed and committed
- WHEN the save is posted and the host has not answered
- THEN the controls are disabled and the status reads "Saving frontmatter…"

### Scenario: Boundary or refusal

- GIVEN a key editor, an Add field or a Remove field
- WHEN the save is posted
- THEN the status reads "Saving frontmatter key…", "Adding frontmatter field..." or "Removing frontmatter field..."

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests edit mode exposes schema enum controls and saves the selected value.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-019](SwRS-MDOKFSTUDIO-FMEDIT-019.md): A field editor saves a changed value and Escape cancels it
<!-- okf:links:end -->
