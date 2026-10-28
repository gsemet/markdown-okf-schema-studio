---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-244
uuid: 2a5f234b-50a8-4497-8ef9-2e7874b5db57
title: "previewEditClosed carries the id of the closed editor"
description: "The host SHALL accept previewEditClosed only with a non-empty editId
  of at most 100 characters."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## previewEditClosed carries the id of the closed editor

### Normative behavior

The host SHALL accept previewEditClosed only with a non-empty editId of at most 100 characters.

### Scenario (nominal): A close with an edit id

- GIVEN a previewEditClosed message with editId e1
- WHEN it is validated
- THEN it is accepted

### Scenario (refusal): Invalid edit id

| Input | Outcome |
| --- | --- |
| an empty editId | dropped |
| a missing editId | dropped |
| a numeric editId | dropped |
| a 101-character editId | dropped (100 characters is the longest accepted) |

### Verification notes

- Method: Unit test `STAB-03: previewEditClosed carries the id of the closed editor` in test/core/protocol/pageToHost.test.ts (both scenarios).
- Criteria: MAX_EDIT_ID_LENGTH is 100.
