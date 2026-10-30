---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-026
uuid: 901d1e86-1a68-4a2d-89bf-8233bb7de7cb
title: An empty or padded key name is refused in the key editor
description: When a writer commits a key name that is empty or has leading or
  trailing spaces, the extension SHALL show "Enter a non-empty key without
  leading or trailing spaces." in the editor and post nothing.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-024
default_owner_email: gaetan@xeberon.net
---

## An empty or padded key name is refused in the key editor

### Normative behavior

When a writer commits a key name that is empty or has leading or trailing spaces, the extension SHALL show "Enter a non-empty key without leading or trailing spaces." in the editor and post nothing.

### Scenario: Nominal

- GIVEN a key editor with the name emptied
- WHEN the writer presses Enter
- THEN the status shows the message in the error state and nothing is posted

### Scenario: Boundary or refusal

- GIVEN a key editor with the name " owner" (leading space)
- WHEN the writer presses Enter
- THEN the same message shows and nothing is posted

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeEditorFlush.test.ts).
- Criteria: A flush trims the key and an empty key keeps the old one instead, see the flush requirements.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-024](SwRS-MDOKFSTUDIO-FMEDIT-024.md): A click on a field name renames the key
<!-- okf:links:end -->
