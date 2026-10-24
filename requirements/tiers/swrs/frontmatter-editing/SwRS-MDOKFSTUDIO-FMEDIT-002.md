---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-002
uuid: 32ff2020-aa79-49ab-a7f2-317b229662ff
title: "A field editor does not open while another editor is open"
description: "When a field editor or a block editor is open, the extension SHALL NOT
  open another field editor."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-011
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A field editor does not open while another editor is open

### Normative behavior

When a field editor or a block editor is open, the extension SHALL NOT open another field editor.

Known issue: an editor left in an error state keeps blocking every other field until it is cancelled with Escape in that editor; clicking elsewhere does not close it.

Known issue: the guard works in one direction only: a block editor can still be opened by clicking a block or a plus insert point while a field editor is open.

### Scenario: Nominal

- GIVEN the editor of the lifecycle field open in edit mode
- WHEN the writer clicks the value cell of another field
- THEN no second field editor opens and the first stays open

### Scenario: Boundary or refusal

- GIVEN a block editor open in edit mode
- WHEN the writer clicks the value cell of a field
- THEN no field editor opens

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts, test/page/runtimeBlockSelection.test.ts).
- Criteria: openFrontmatterValueEditor and openFrontmatterKeyEditor return when activeBlockEdit or activeFrontmatterEdit is set.
