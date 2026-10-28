---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-008
uuid: 31fe7445-c80c-4abd-a483-c6f0fa7292dc
title: An invalid number is refused in the editor
description: When a writer saves a number field whose input is empty or not a
  finite number, the extension SHALL show "Enter a valid number." in the editor
  and post nothing.
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

## An invalid number is refused in the editor

### Normative behavior

When a writer saves a number field whose input is empty or not a finite number, the extension SHALL show "Enter a valid number." in the editor and post nothing.

### Scenario: Nominal

- GIVEN a number field editor with the input emptied
- WHEN the writer presses Enter
- THEN the status reads "Enter a valid number." in the error state and no message is posted

### Scenario: Boundary or refusal

- GIVEN a number field editor with a valid number typed
- WHEN the writer presses Enter
- THEN the value is posted as a number

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeEditorFlush.test.ts).
- Criteria: A flush (navigation) sends the typed text instead, see the flush requirement.
