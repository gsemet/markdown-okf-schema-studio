---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-077
uuid: 7472b30b-adbb-4388-9cdd-1c1c21938085
title: Backspace in an empty list item removes it
description: When a writer presses Backspace in an empty list item input, the
  extension SHALL remove the item and focus the previous one.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
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

## Backspace in an empty list item removes it

### Normative behavior

When a writer presses Backspace in an empty list item input, the extension SHALL remove the item and focus the previous one.

### Scenario: Nominal

- GIVEN a list editor with an empty middle item
- WHEN the writer presses Backspace in it
- THEN the item is removed and the previous input is focused

### Scenario: Boundary or refusal

- GIVEN a non-empty item
- WHEN the writer presses Backspace
- THEN the key is left to the browser and the item stays

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: In an empty first item the next input is focused, in the only item the Add item button.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-010](SwRS-MDOKFSTUDIO-FMEDIT-010.md): List fields and link lists are edited item by item
<!-- okf:links:end -->
