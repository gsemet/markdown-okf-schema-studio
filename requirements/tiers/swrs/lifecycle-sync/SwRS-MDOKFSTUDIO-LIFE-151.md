---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-151
uuid: 40f5c2a5-f0b2-44d0-8f6a-7c12f04abc53
title: A side preview locks its editor group
description: When a new side preview opens in an editor group that holds only
  that panel, the extension SHALL lock the group and, when that locked preview
  is closed, unlock the group it left empty, one tick later, only if no live
  preview occupies it.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/host-vscode/groupFocus.ts
- src/host-vscode/groupLock.ts
- src/session/previewManager.ts
tested_in_files:
- test/host-vscode/groupFocus.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/realInput/markers.ts
default_owner_email: gaetan@xeberon.net
---

## A side preview locks its editor group

### Normative behavior

When a new side preview opens in an editor group that holds only that panel, the extension SHALL lock the group and, when that locked preview is closed, unlock the group it left empty, one tick later, only if no live preview occupies it.

### Scenario (nominal): Quick Open from the preview

- GIVEN a locked preview group with the preview focused
- WHEN the reader opens another file with Quick Open
- THEN the file opens in the source group, no third group is created and the preview stays the active tab

### Scenario (nominal): Preview closed

- GIVEN a locked preview group that holds only the preview
- WHEN the reader closes the preview
- THEN the empty group is unlocked and closes, and Quick Open from the reader's group opens a file there

### Scenario (boundary): Shared group

- GIVEN a preview that opened in a group that holds another tab
- WHEN the preview opens
- THEN the group is not locked and the preview works

### Scenario (boundary): User lock

- GIVEN a group the reader locked that holds other tabs
- WHEN a preview is closed in another group
- THEN that group stays locked

### Scenario (boundary): Unlocking never creates a group

| Group count and position | Outcome |
| --- | --- |
| A window with three groups, position two | The command focusSecondEditorGroup is returned |
| A window with two groups, position three | No command is returned, because VS Code would create a group |
| A column below 1, past the group count or past 8, or one not known | No command is returned |

### Scenario (boundary): The recorded column follows the group

| Case | Outcome |
| --- | --- |
| A locked preview in column 3 and the group in column 1 closed | VS Code reports the layout change, the recorded column becomes 2 and the right group is unlocked later |
| A preview whose group was not locked, and the layout changes | No column is recorded |

### Verification notes

- Method: test/integration/realInput/previewWindow.ts scenarioPreviewGroupLock (RI-T39; marked in test/integration/realInput/markers.ts) with a canary that no lock leaks before the preview exists: Quick Open from the preview, preview closed (last-group case), user lock to the right survives. A failed lock command is caught and never blocks the preview (by reading lockNewPanelGroup); the preview waits at most about 250 ms for its group to exist. The shared group scenario is checked by reading lockNewPanelGroup (a group with more than one tab is not locked).
- Method: test/host-vscode/groupFocus.test.ts "a group position that exists maps to its focus command", "a position past the last group gets no command, because the command would create a group" and "positions outside the supported range or not known get no command" (unlocking never creates a group).
- Method: test/host/lifeReq.requirements.test.ts "the recorded column of a locked preview follows its group" (the recorded column scenario).
- The unlock also restores the focus to the group that had it; a focus held outside the editor area cannot be restored through the API (known limit of the code).
- Criteria: the opened file's column is the source column and the group count is unchanged; only empty groups without a live preview are unlocked; focusGroupCommand returns undefined for a column below 1, past the group count or past 8; session.lockedColumn equals panel.column after the event for a locked session.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-001](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-001.md): A writer opens previews beside the editor or as tabs, beside the built-in preview
<!-- okf:links:end -->
