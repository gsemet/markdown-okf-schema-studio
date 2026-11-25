---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-270
uuid: 7750f655-328b-400f-9422-79febc4f4731
title: Every final save of a block or cell editor ends
description: When a writer finishes a block or cell editor, the page and the
  host SHALL end every final save with a closed editor or an error that gives
  the typed text back, and never leave the editor on its saving state.
project: MDOKFSTUDIO
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-216
- SwRS-MDOKFSTUDIO-BLOCK-263
- SwRS-MDOKFSTUDIO-BLOCK-191
scenarios:
- id: S1
  title: A final save ends in a closed editor
- id: S2
  title: A failed final save gives the text back
- id: S3
  title: Every save path ends
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/detachedSave.ts
- src/session/features/detachedEdits.ts
tested_in_files:
- test/page/runtimeDetachedSaveEnds.test.ts
- test/page/runtimeFrontmatterSaveEnds.test.ts
- test/page/runtimeSaveEnds.test.ts
default_owner_email: gaetan@xeberon.net
---

## Every final save of a block or cell editor ends

### Normative behavior

When a writer finishes a block or cell editor, the page and the host SHALL end every final save with a closed editor or an error that gives the typed text back, and never leave the editor on its saving state.

### Scenario S1 (nominal): A final save ends in a closed editor
- GIVEN a block or cell editor whose final save is posted
- WHEN the host answers, whether the text was written, unchanged, or no render follows
- THEN the editor closes, or its detached save ends with done, and no editor stays on the saving status

### Scenario S2 (refusal): A failed final save gives the text back
- GIVEN a final save the host refuses, cannot write, finds changed in the document or meets a change of the file
- WHEN the answer arrives
- THEN it carries the writer's text, and the page shows it in the open editor or in a reopened one with the reason, or the host offers it to copy

### Scenario S3 (boundary): Every save path ends
| Input | Outcome |
| --- | --- |
| A frontmatter save whose plan changes no text | The host answers unchanged and the field editor closes |
| Cancel or Escape in a block or cell editor during its final save | The editor closes and the save ends with an answer |
| A page that cannot reopen the editor | The host releases the edit and offers the text to copy |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-216: the error answer that gives the text back.
- SwRS-MDOKFSTUDIO-BLOCK-263: a final save that writes nothing is answered.
- SwRS-MDOKFSTUDIO-BLOCK-191: the host edit that ends with an answer.

### Verification notes

- Method: test/page/runtimeSaveEnds.test.ts, test/page/runtimeDetachedSave.test.ts and test/page/runtimeFrontmatterSaveEnds.test.ts (each save path of the page ends) and test/session/detachedSave.test.ts (each answer of the host).
- Criteria: no test leaves a block, cell or frontmatter editor on its saving status after the answer of the host; every error answer to a final save carries unsavedText.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-216](SwRS-MDOKFSTUDIO-BLOCK-216.md): A refused open or save keeps the typed text and says why
  - [SwRS-MDOKFSTUDIO-BLOCK-263](SwRS-MDOKFSTUDIO-BLOCK-263.md): A block editor left without a change, or whose final save writes nothing, always closes
  - [SwRS-MDOKFSTUDIO-BLOCK-191](SwRS-MDOKFSTUDIO-BLOCK-191.md): The host holds an open block edit and ends it when the block changes
<!-- okf:links:end -->
