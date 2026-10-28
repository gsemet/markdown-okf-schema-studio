---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-011
uuid: 98507700-ebca-422e-8379-9e246d905fc8
title: "Enter in a list item inserts an empty item after it"
description: "When a writer presses Enter in a list item input, the extension SHALL
  insert an empty item after it and focus it."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-010; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-010
default_owner_email: gaetan@xeberon.net
---

## Enter in a list item inserts an empty item after it

### Normative behavior

When a writer presses Enter in a list item input, the extension SHALL insert an empty item after it and focus it.

### Scenario: Nominal

- GIVEN a list editor with items a and b and the caret in a
- WHEN the writer presses Enter
- THEN an empty item is inserted after a and focused, nothing is posted

### Scenario: Boundary or refusal

- GIVEN an empty last item
- WHEN the writer presses Enter in it
- THEN the item is removed and the list is saved

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Enter with Shift or Alt, or during IME composition, does not touch the list.
