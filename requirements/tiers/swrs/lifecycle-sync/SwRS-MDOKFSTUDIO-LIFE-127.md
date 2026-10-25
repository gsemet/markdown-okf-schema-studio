---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-127
uuid: a2b8ffae-1bc8-4769-986f-108a0b184fec
title: A restored panel reopens its document or explains why it cannot
description: When VS Code restores a Studio preview panel, the extension SHALL
  open in it the Markdown file its saved state names, with the saved reading
  position, open sections and Description column state, or show the status
  Preview source missing with the reason the panel cannot be restored.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-014
- StRS-MDOKFSTUDIO-LIFE-007
- StRS-MDOKFSTUDIO-LIFE-001
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/previewState.ts
- src/host-vscode/activation.ts
tested_in_files:
- test/core/state/previewState.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/serializer.test.ts
---

## A restored panel reopens its document or explains why it cannot

### Normative behavior

When VS Code restores a Studio preview panel, the extension SHALL open in it the Markdown file its saved state names, with the saved reading position, open sections and Description column state, or show the status Preview source missing with the reason the panel cannot be restored.

### Scenario (nominal): Restore of a saved reading place

- GIVEN a saved state with documentId, sourceFile, sourceLine 4, scrollTop 88 and descriptionsCollapsed true
- WHEN VS Code restores the panel
- THEN the panel renders the file, the session state holds sourceLine 4 and scrollTop 88 and the boot context holds descriptionsCollapsed true

### Scenario (boundary): File outside a folder

- GIVEN a saved file that lies in no workspace folder
- WHEN VS Code restores the panel
- THEN the panel renders it read-only (see SwRS-MDOKFSTUDIO-TRUST-001 and SwRS-MDOKFSTUDIO-TRUST-007)

### Scenario (refusal): A saved state that cannot be restored

The page shows the status Preview source missing with the message of the row, and no session is created for the first five rows.

| Saved state | Message shown |
| --- | --- |
| No saved state at all | The previous preview identity could not be restored safely. |
| A saved document id that is an empty string | The previous preview identity could not be restored safely. |
| A saved document id that Uri.parse rejects | The previous preview source URI is invalid. |
| A saved source notes.txt (extension other than .md) | The previous preview source is not a Markdown file. |
| A saved source whose URI scheme is untitled (not a file URI) | The previous preview source is not a Markdown file. |
| A saved Markdown file that no longer exists (missing-restored.md): the session status is missing-source | The restored Markdown source is unavailable. |
| A saved document id that parses | No message: the restore continues to the next checks |
| The missing file is created later | The preview renders it by itself (see SwRS-MDOKFSTUDIO-LIFE-062) |

### Scenario (nominal): A restored side preview owns its group lock

- GIVEN a restored side preview in group two, which follows the active editor
- WHEN the reader closes it
- THEN the extension recorded the panel's group as the group it locked, so the lock of the group is released like that of a preview opened by the command

### Scenario (boundary): Older panel after a newer restore

- GIVEN a restored side preview in group two and a second panel restored later in group three
- WHEN the second panel is restored
- THEN the older preview becomes a fixed preview and keeps the group it recorded; every restored panel follows the active editor at the moment it is restored, so each records its group

### Scenario (boundary): Identity of a saved state

| Saved state | Outcome |
| --- | --- |
| An object with a non-empty documentId and a non-empty sourceFile | The state is returned with the identity |
| Not an object | Nothing is returned |
| An empty or non-string documentId | Nothing is returned |
| An empty or non-string sourceFile | Nothing is returned |

### Scenario (boundary): Optional fields of a saved state

The identity is kept in every row.

| Saved field | Kept | Dropped or cut |
| --- | --- | --- |
| sourceLine | a positive integer (12) | 0 |
| scrollTop | a non-negative finite number (88.5) | -1 |
| open-section indexes | at most 100 indexes from 0 to 9999 (0, 3 and 9999) | an index of 10000; with 101 valid indexes, only the first 100 are kept |
| focused block id | at most 200 characters | 201 characters |
| selected text | at most 4096 characters | 4097 characters |
| descriptionsCollapsed | a boolean (true) | any other value, such as the string yes |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-062: a missing source that returns is rendered again by itself
- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview offers no editing affordance
- SwRS-MDOKFSTUDIO-TRUST-007: a page loads local files only from its resource roots

### Verification notes

- Method: test/integration/serializer.test.ts (restore of a saved reading place; file gone, with status missing-source and the message; the older panel after a newer restore).
- Method: test/host/lifeReq.requirements.test.ts "a saved state with an invalid source URI shows an explanation" (refusal row for the unparsable id), "a saved source that is not a Markdown file shows an explanation" (refusal rows for notes.txt and untitled), "a restored side preview owns the group lock the workbench restored" (group lock), "of two restored panels only the newer one switches with the active editor" (older panel after a newer restore).
- Method: test/core/state/previewState.test.ts "parses bounded preview panel state and preserves supported fields" and "rejects invalid identity and drops malformed optional state" (identity and optional field boundaries, no saved state and empty document id as parser results; no integration step produces the page for these two rows).
- Method: test/integration/reload-suite.ts covers the view choices that survive a window reload.
- Method: the file outside a folder scenario is untested; it is checked by reading deserializePreviewPanel.
- Criteria: sourceLine, scrollTop and descriptionsCollapsed equal the saved values; parsePreviewPanelState returns undefined for an invalid identity and each optional field is present only inside its bound; the page holds the message of the row and lockedColumn equals the panel column of each restored panel.
