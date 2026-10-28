---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-009
uuid: 57d962e3-b81c-4c58-a887-05e52fc13ede
title: A boolean field toggles with one click
description: "When a writer clicks the value cell of a schema boolean field in edit
  mode, the extension SHALL toggle the value and post the save at once."
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
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-003
default_owner_email: gaetan@xeberon.net
---

## A boolean field toggles with one click

### Normative behavior

When a writer clicks the value cell of a schema boolean field in edit mode, the extension SHALL toggle the value and post the save at once.

### Scenario: Nominal

- GIVEN a schema boolean field set to true, edit mode on
- WHEN the writer clicks its value cell
- THEN one save with fieldValue false is posted and the checkbox uses the preview checkbox style

### Scenario: Boundary or refusal

- GIVEN the same field
- WHEN the writer presses Enter on the cell, or clicks its name cell
- THEN Enter opens the checkbox, whose click or change saves; the name cell opens the key editor instead

### Known issues

- Known issue: without a schema a boolean field opens the YAML editor, there is no one-click toggle.

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests one click on a boolean value cell toggles and saves it; clicking a boolean name cell still opens the key editor.
