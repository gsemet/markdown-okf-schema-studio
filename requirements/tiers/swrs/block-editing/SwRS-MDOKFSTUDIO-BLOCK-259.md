---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-259
uuid: fea2f369-f635-44f3-9fd5-97f1f1aff02e
title: The host ignores a malformed block-editing message and changes nothing
description: When the page posts a block-editing message
  (previewEditModeChanged, previewEditOpen, previewEditSave, previewEditCancel,
  previewBlockMove, previewBlocksCopy, previewBlocksCut, previewBlocksPaste,
  previewEditClosed or previewEditFlushed), the host SHALL accept it only with
  the fields its type requires and SHALL drop a malformed one and change
  nothing.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-BLOCK-236
- SwRS-MDOKFSTUDIO-BLOCK-237
- SwRS-MDOKFSTUDIO-BLOCK-238
- SwRS-MDOKFSTUDIO-BLOCK-239
- SwRS-MDOKFSTUDIO-BLOCK-240
- SwRS-MDOKFSTUDIO-BLOCK-241
- SwRS-MDOKFSTUDIO-BLOCK-242
- SwRS-MDOKFSTUDIO-BLOCK-243
- SwRS-MDOKFSTUDIO-BLOCK-244
- SwRS-MDOKFSTUDIO-BLOCK-245
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host ignores a malformed block-editing message and changes nothing

### Normative behavior

When the page posts a block-editing message (previewEditModeChanged, previewEditOpen, previewEditSave, previewEditCancel, previewBlockMove, previewBlocksCopy, previewBlocksCut, previewBlocksPaste, previewEditClosed or previewEditFlushed), the host SHALL accept it only with the fields its type requires and SHALL drop a malformed one and change nothing.

### Scenario (nominal): A well-formed message of each type is accepted

| Message | Required fields |
| --- | --- |
| previewEditModeChanged | a boolean editMode |
| previewEditOpen | a non-empty string editId; positive integer line and endLine, endLine not below line; insertAfterLine absent or an integer of at least 0; no save or pin field |
| previewEditSave | string originalText and editedText; the editId and line range of a previewEditOpen; final a boolean when present, flush only true, insertAfterLine absent or an integer of at least 0; pinLine with pinViewportTop (finite, within 100000 in absolute value) only on a final save |
| previewEditCancel | the fields of a previewEditOpen |
| previewBlockMove | four positive integer lines, a direction up or down, an optional pinViewportTop that is finite and within 100000 |
| previewBlocksCopy | positive integer line and endLine |
| previewBlocksCut | positive integer line and endLine, an optional pinViewportTop |
| previewBlocksPaste | an integer insertAfterLine of at least 0, an optional positive integer pinLine, an optional pinViewportTop |
| previewEditClosed | a non-empty editId of at most 100 characters |
| previewEditFlushed | a non-empty flushId of at most 100 characters and a boolean flushed |

- GIVEN a message of one of these types carrying exactly the fields above
- WHEN the host validates it
- THEN it is accepted, also without an optional pin

### Scenario (refusal): previewEditModeChanged: Edit mode that is not a boolean

- GIVEN a previewEditModeChanged message with editMode "yes" or no editMode
- WHEN it is validated
- THEN it is dropped

### Scenario (refusal): previewEditOpen: An open with a wrong range, insert point or extra field

| Input | Outcome |
| --- | --- |
| line 0 | dropped |
| endLine below line | dropped |
| insertAfterLine -1 | dropped |
| a pin field (pinLine with pinViewportTop) or the field final | dropped |
| a missing or empty editId, or an editId that is not a string | dropped |

### Scenario (refusal): previewEditSave: Invalid optional fields

| Input | Outcome |
| --- | --- |
| final "yes" | dropped |
| flush false | dropped (flush is accepted only as true) |
| a pin on an autosave | dropped (a pin is accepted only on a final save) |
| a pin top of 200000 | dropped (pinViewportTop is finite and within 100000 in absolute value) |
| originalText or editedText missing or not a string | dropped |
| no editId, or no line range with endLine not below line (as for previewEditOpen) | dropped |

### Scenario (boundary): previewEditSave: Insert point of a block edit

| Input | Outcome |
| --- | --- |
| previewEditSave with insertAfterLine 0 | accepted (an integer of at least 0) |
| previewEditSave with insertAfterLine -1 | dropped |
| previewEditOpen with insertAfterLine 0 | accepted |
| previewScroll with insertAfterLine 0 | dropped (insertAfterLine is accepted only on previewEditOpen, previewEditSave and previewEditCancel) |

### Scenario (refusal): previewEditCancel: A cancel that carries a text or a pin

- GIVEN a previewEditCancel message that carries a final or pin field
- WHEN it is validated
- THEN it is dropped

### Scenario (refusal): previewBlockMove: Invalid lines, direction or pin

| Input | Outcome |
| --- | --- |
| direction left | dropped |
| line 0 | dropped |
| endLine 1.5 | dropped |
| a missing neighbour line | dropped |
| a NaN pin top or a pin top of 200000 | dropped |

### Scenario (refusal): previewBlocksCopy: Invalid lines

| Input | Outcome |
| --- | --- |
| line 0 | dropped |
| endLine 1.5 | dropped |
| a missing line | dropped |
| a string endLine | dropped |

### Scenario (refusal): previewBlocksCut: Invalid pin or lines

| Input | Outcome |
| --- | --- |
| a NaN pin top | dropped |
| the invalid lines of a copy (line 0, endLine 1.5, a missing line, a string endLine) | dropped |

### Scenario (refusal): previewBlocksPaste: Invalid line or pin

| Input | Outcome |
| --- | --- |
| insertAfterLine -1 | dropped |
| insertAfterLine 1.5 | dropped |
| insertAfterLine missing | dropped |
| pinLine 0 | dropped |
| a pin top of 200000 | dropped |

### Scenario (refusal): previewEditClosed: Invalid edit id

| Input | Outcome |
| --- | --- |
| an empty editId | dropped |
| a missing editId | dropped |
| a numeric editId | dropped |
| a 101-character editId | dropped (100 characters is the longest accepted) |

### Scenario (refusal): previewEditFlushed: Invalid flush id or flag

| Input | Outcome |
| --- | --- |
| an empty flushId | dropped |
| a flushId of more than 100 characters | dropped |
| a flushed that is not a boolean | dropped |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-117: the host plans the swap from the validated ranges of a previewBlockMove
- SwRS-MDOKFSTUDIO-TRUST-052: every page message has a registered type and a valid envelope before any handler runs

### Verification notes

- Method: Unit test `the page-state validators accept exactly what the frozen validator accepted` in test/core/protocol/pageStateMessages.test.ts (previewEditModeChanged, previewEditOpen, previewEditSave, previewEditCancel scenarios, including the insert point rows).
- Method: Unit tests `previewBlockMove validates both ranges, the direction and the optional pin`, `T40: the block clipboard messages validate their lines and the optional pin`, `STAB-03: previewEditClosed carries the id of the closed editor` and `CR 025: previewEditFlushed validates the flush id and the flag` in test/core/protocol/pageToHost.test.ts (the other six messages; the 100-character bound of the flush id is named in the criteria and not in the test title).
- Method: one refusal test per message of previewEditModeChanged, previewEditOpen, previewEditSave and previewEditCancel is to be added in a later round (today only the oracle test above covers them).
- Criteria: The validators of src/core/protocol/pageToHost.ts decide (isEditRequest, hasValidStateFields, isPinViewportTop); the order of two lines is checked by the planner, not here; the edit id has no upper length bound in previewEditOpen (only previewEditClosed and previewEditFlushed bound theirs to 100, MAX_EDIT_ID_LENGTH).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
- Supersedes:
  - [SwRS-MDOKFSTUDIO-BLOCK-236](SwRS-MDOKFSTUDIO-BLOCK-236.md): previewEditModeChanged carries a boolean edit mode
  - [SwRS-MDOKFSTUDIO-BLOCK-237](SwRS-MDOKFSTUDIO-BLOCK-237.md): previewEditOpen needs an edit id and a line range
  - [SwRS-MDOKFSTUDIO-BLOCK-238](SwRS-MDOKFSTUDIO-BLOCK-238.md): previewEditSave needs both texts and valid optional fields
  - [SwRS-MDOKFSTUDIO-BLOCK-239](SwRS-MDOKFSTUDIO-BLOCK-239.md): previewEditCancel needs an edit id and a line range
  - [SwRS-MDOKFSTUDIO-BLOCK-240](SwRS-MDOKFSTUDIO-BLOCK-240.md): previewBlockMove needs both ranges and a direction
  - [SwRS-MDOKFSTUDIO-BLOCK-241](SwRS-MDOKFSTUDIO-BLOCK-241.md): previewBlocksCopy needs a line range
  - [SwRS-MDOKFSTUDIO-BLOCK-242](SwRS-MDOKFSTUDIO-BLOCK-242.md): previewBlocksCut needs a line range and an optional pin
  - [SwRS-MDOKFSTUDIO-BLOCK-243](SwRS-MDOKFSTUDIO-BLOCK-243.md): previewBlocksPaste needs a line to paste after
  - [SwRS-MDOKFSTUDIO-BLOCK-244](SwRS-MDOKFSTUDIO-BLOCK-244.md): previewEditClosed carries the id of the closed editor
  - [SwRS-MDOKFSTUDIO-BLOCK-245](SwRS-MDOKFSTUDIO-BLOCK-245.md): previewEditFlushed carries the flush id and a flag
<!-- okf:links:end -->
