---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-082
uuid: 1cace921-d967-4340-9320-8a20c6ced8cd
title: An accepted field save shows that the preview is refreshing
description: When the host reports a frontmatter save as saved, the extension
  SHALL show "Saved. Refreshing preview…" in the editor.
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

## An accepted field save shows that the preview is refreshing

### Normative behavior

When the host reports a frontmatter save as saved, the extension SHALL show "Saved. Refreshing preview…" in the editor.

### Scenario: Nominal

- GIVEN a field save in flight
- WHEN the host answers with saved true
- THEN the status reads "Saved. Refreshing preview…"

### Scenario: Boundary or refusal

- GIVEN a result carrying another editId
- WHEN the page receives it
- THEN it is ignored and the status is unchanged

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: The re-rendered table then replaces the editor.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-019](SwRS-MDOKFSTUDIO-FMEDIT-019.md): A field editor saves a changed value and Escape cancels it
<!-- okf:links:end -->
