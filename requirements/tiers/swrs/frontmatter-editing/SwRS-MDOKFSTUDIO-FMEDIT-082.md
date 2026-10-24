---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-082
uuid: 1cace921-d967-4340-9320-8a20c6ced8cd
title: An accepted field save shows that the preview is refreshing
description: When the host reports a frontmatter save as saved, the extension
  SHALL show "Saved. Refreshing preview…" in the editor.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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
