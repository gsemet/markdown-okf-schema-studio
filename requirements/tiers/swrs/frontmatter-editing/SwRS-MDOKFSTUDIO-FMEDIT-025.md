---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-025
uuid: 9f9314c6-0253-480d-a39d-d038404bd07e
title: Enter or leaving the key editor renames the key
description: When a writer presses Enter in the key editor or leaves it with a
  changed name, the extension SHALL post a rename that changes only the key text
  and keeps the comments.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-024
default_owner_email: gaetan@xeberon.net
---

## Enter or leaving the key editor renames the key

### Normative behavior

When a writer presses Enter in the key editor or leaves it with a changed name, the extension SHALL post a rename that changes only the key text and keeps the comments.

### Scenario: Nominal

- GIVEN a key editor for title holding the new name heading, the field being followed by a trailing comment
- WHEN the writer presses Enter
- THEN a save with fieldName title and newFieldName heading is posted and the written line keeps its trailing comment

### Scenario: Boundary or refusal

- GIVEN a key editor whose name was not changed
- WHEN the writer presses Enter or leaves it
- THEN the editor closes and nothing is posted; Escape cancels

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts) and test/core/frontmatter/frontmatterPreservation.test.ts.
- Criteria: Tests Escape cancels an unsaved frontmatter key edit; structural F2 rename title to heading keeps the trailing comment.
