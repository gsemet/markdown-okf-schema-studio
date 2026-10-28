---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-094
uuid: 608ea9f4-ebec-4db7-a4c4-4d18790ddf48
title: Blocks changed by another tool glow briefly
description: When the text of a previewed document changes by an undo, a redo or
  an edit that is neither the preview's own nor the writer typing, the extension
  SHALL make the blocks the change updated glow once for about 600 ms, with the
  text readable and nothing moved.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
- StRS-MDOKFSTUDIO-LIFE-005
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/updatedRanges.ts
- src/host-vscode/activation.ts
- src/host-vscode/keystrokes.ts
- src/page/modules/motion.ts
- src/session/features/pageDocument.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/preview/updatedRanges.test.ts
- test/integration/updateGlow.test.ts
- test/page/modules/motion.test.ts
- test/visual/capture_layout_checks.py
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-048
- SwRS-MDOKFSTUDIO-CORE-049
---

## Blocks changed by another tool glow briefly

### Normative behavior

When the text of a previewed document changes by an undo, a redo or an edit that is neither the preview's own nor the writer typing, the extension SHALL make the blocks the change updated glow once for about 600 ms, with the text readable and nothing moved. A change is the writer typing only when a key was pressed in a text editor in the last 500 ms and the changed lines are on a cursor or a selection of that document (one line of margin, because VS Code moves the cursor after the change); any other change is foreign, whichever document is in the active editor.

### Scenario (nominal): Agent edit

- GIVEN a previewed document that is not the active editor's document
- WHEN another tool changes it
- THEN the preview records the revision of the change as an outside change

### Scenario (boundary): Which changes count as outside

| Input | Outcome |
| --- | --- |
| An undo or a redo (change reason 1 or 2) | Outside change, always |
| A change of a document that no text editor shows, while the preview is not applying its own edit | Outside change |
| A change of the document of the active text editor while no key was pressed in the last 500 ms | Outside change |
| A change of the document of the active text editor whose lines are more than one line away from every cursor and selection, whatever the keys | Outside change |
| An edit the preview asked for, being applied to that document | No outside change |
| The writer types in a text editor of the document: a key in the last 500 ms and the change on a cursor | No outside change, but an undo of that typing is |

### Scenario (nominal): The patch carries the changed line ranges

- GIVEN an outside change at revision 5, a page at revision 4 and a patch to revision 6
- WHEN the patch is posted
- THEN it carries the line ranges of the changed lines

### Scenario (boundary): No ranges

| Input | Outcome |
| --- | --- |
| An outside change that touches 51 ranges (more than 50) | The patch carries no ranges, so nothing glows |
| No outside change between the revisions the patch moves across | The patch carries no ranges |
| The page is loaded as a whole | No ranges are attached |

### Scenario (nominal): Glow of the updated blocks

- GIVEN an outside edit changing two blocks
- WHEN the page updates
- THEN both blocks glow once for about 600 ms, the glow attribute is set then removed; a changed code block glows on its pre

### Scenario (refusal): Skip the glow when it would mislead

| Input | Outcome |
| --- | --- |
| An update of 41 blocks (more than 40) | Nothing glows |
| A range list with more than 50 ranges, empty or invalid | Nothing glows |
| A changed block that is included | It does not glow |
| A changed block with an open editor, or the block being edited | It does not glow |

### Scenario (nominal): The glow is readable in three themes

- GIVEN a patch after an outside change in the light, dark and cream pages at 900 px
- WHEN the glow is paused at its start
- THEN exactly the updated paragraph and bullet carry a translucent wash and their text contrast is at least 4.5:1 (visual scenarios lifecycle-sync/v01-update-glow-light-900, v02-update-glow-dark-900 and v03-update-glow-cream-900)

### Scenario (boundary): The glow moves nothing

- GIVEN the same patch, compared at the start and at the end of the glow
- WHEN the glow plays
- THEN no element changed its box and the page does not scroll sideways

### Known issues

- Known issue: VS Code reports a key press only for typing and cursor keys, not for Backspace, Delete or a paste, so one of these pressed first after 500 ms without a key glows the changed block once.

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-050: reduced motion

### Verification notes

- Method: test/core/preview/updatedRanges.test.ts (Agent edit, Which changes count as outside, The patch carries the changed line ranges, No ranges): "CR 046: an undo or a redo always counts as an outside change, the preview's own edit does not", "CR 046: typing in the active text editor does not glow, its undo and redo do", "CR 046: the patch that first shows an outside change carries its changed lines", "CR 046: a change spread over too many places glows nowhere", "CR 046: no glow without an outside change in the versions the patch moves across".
- Method: test/core/preview/updatedRanges.test.ts (Which changes count as outside): "CR 139: a change is typing only with a recent keystroke and a cursor on it", "CR 139: a change touches a selection when the changed lines meet it".
- Method: test/integration/updateGlow.test.ts (Agent edit, Which changes count as outside, The patch carries the changed line ranges): own checkbox edit, external edit, external edit of the active document with the cursor elsewhere, typing, undo; it also reads the ranges of the patches.
- Method: test/page/modules/motion.test.ts (Glow of the updated blocks, Skip the glow when it would mislead): "CR 046: an update glows on the innermost blocks whose lines meet a range, and only there", "CR 046: included blocks, open editors and the block being edited never glow".
- Method: visual scenarios lifecycle-sync/v01-update-glow-light-900, v02-update-glow-dark-900 and v03-update-glow-cream-900 (test/visual/capture_layout_checks.py check_update_glow, test/visual/scenarioDefinitions2.ts) (The glow is readable in three themes, The glow moves nothing).
- Criteria: isOutsideChange follows the three conditions and isTypingChange needs a key in 500 ms and a cursor on the change; updatedRangesForPatch returns [] outside the version window or above MAX_UPDATED_RANGES; the glow attribute is set then removed after about 600 ms; no glow is applied in the excluded cases; check_update_glow reports no failure.
