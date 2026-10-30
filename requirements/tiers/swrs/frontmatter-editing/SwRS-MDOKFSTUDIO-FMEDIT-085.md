---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-085
uuid: 236167a2-7466-41ad-b369-b3e5e13fa869
title: Hiding or closing the page saves the open field editor as a flush
description: When the page is hidden or closed while a field editor is open, the
  extension SHALL save the typed text as a flush.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-067; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-067
default_owner_email: gaetan@xeberon.net
---

## Hiding or closing the page saves the open field editor as a flush

### Normative behavior

When the page is hidden or closed while a field editor is open, the extension SHALL save the typed text as a flush.

### Scenario: Nominal

- GIVEN a field editor with text typed
- WHEN the page receives pagehide, or visibilitychange to hidden
- THEN one previewFrontmatterSave with flush true and the typed text is posted

### Scenario: Boundary or refusal

- GIVEN no field editor open
- WHEN the page is hidden
- THEN no frontmatter save is posted

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeEditorFlush.test.ts).
- Criteria: Test CR 025 pagehide and a hidden page save an open frontmatter editor as a flush.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-067](SwRS-MDOKFSTUDIO-FMEDIT-067.md): A navigation saves the open field editor as an unchecked flush
<!-- okf:links:end -->
