---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-076
uuid: 22eb936e-fe57-4165-91e7-0170caafb3f6
title: In a multi-line text value Enter adds a line and Cmd or Ctrl+Enter saves
description: When the value of a text field holds a line break, the extension
  SHALL add a line on Enter and save it on Cmd or Ctrl+Enter.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-004; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-004
default_owner_email: gaetan@xeberon.net
---

## In a multi-line text value Enter adds a line and Cmd or Ctrl+Enter saves

### Normative behavior

When the value of a text field holds a line break, the extension SHALL add a line on Enter and save it on Cmd or Ctrl+Enter.

### Scenario: Nominal

- GIVEN a text field editor whose value has two lines
- WHEN the writer presses Enter
- THEN a line is added and nothing is posted

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer presses Cmd or Ctrl+Enter
- THEN one previewFrontmatterSave is posted with the typed value

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts).
- Criteria: Tests Enter in a multi-line frontmatter text value inserts a line; Cmd/Ctrl+Enter saves.
