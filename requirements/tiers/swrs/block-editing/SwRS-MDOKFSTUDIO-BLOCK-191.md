---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-191
uuid: 53242dc8-8f24-48f7-8315-e9454735a378
title: "The host holds an open block edit and ends it when the block changes"
description: "When a block editor saves for the first time, the host SHALL hold an
  edit lock for that block, and release it, running the page work that waited for
  it, when the final save is applied, the page reports the close of the editor or
  a reload, or the block changes in the document."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/blockRange.ts
- src/core/state/editLock.ts
- src/page/features/hostHandlers.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/core/state/blockRange.test.ts
- test/core/state/editLock.test.ts
- test/host/previewTiming.test.ts
- test/integration/previewEditing.test.ts
- test/page/runtimeBlockEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host holds an open block edit and ends it when the block changes

### Normative behavior

When a block editor saves for the first time, the host SHALL hold an edit lock for that block, and release it, running the page work that waited for it, when the final save is applied, the page reports the close of the editor or a reload, or the block changes in the document.

### Scenario (nominal): First and later saves

| Input | Outcome |
| --- | --- |
| An editor that posted its first autosave, the host handles it | The host holds an edit with the block's offset and the original text taken from the document |
| A held edit and a second save of the same editor | The original text is not read from the document again; the held edit and its last written text are used |

A first save that does not match the document is refused, see SwRS-MDOKFSTUDIO-BLOCK-216.

### Scenario (nominal): The final save or a cancel releases the lock

- GIVEN a held edit with queued page work
- WHEN the final save is applied, or a cancel writes the original text back
- THEN the lock is released and the queued work runs, newest render last

### Scenario (nominal): The host asks once per editor to report its close

| Input | Outcome |
| --- | --- |
| An open editor and a render to defer, the work is queued | previewEditorWatch with the editor id is posted |
| More work queued for the same editor | No second watch is posted |

### Scenario (nominal): The page reports the close of a watched editor

| Input | Outcome |
| --- | --- |
| An open editor the host watches closes unchanged | previewEditClosed with its id is posted although no save was sent |
| A watch for an editor that is already closed, also for the next document | previewEditClosed is posted at once |
| An editor the host does not watch closes | The close stays silent |

### Scenario (boundary): The close of another editor releases nothing

| Input | Outcome |
| --- | --- |
| An open editor and previewEditClosed of another editor id | The work keeps waiting |
| previewEditClosed of the open editor | The work runs |

### Scenario (boundary): A reloaded page releases the lock

| Input | Outcome |
| --- | --- |
| A held edit and a previewReady with another requestId | The lock is released and the queued work runs, so another block can be edited |
| A previewReady of the same render that reports no open editor | The lock is released |
| A previewReady of the same render that reports an open editor | The lock is kept |
| A previewReady without a lock | Nothing is released |
| Time passes with no event | The lock is not released |

### Scenario (boundary): A change outside the open block

| Input | Outcome |
| --- | --- |
| Three characters inserted above the block in the text editor | The block offset grows by 3 and the editor stays open |
| A change at or after the end of the block | The offset is unchanged |
| Several changes in one event | They add up; their offsets refer to the text before the event |

### Scenario (refusal): A change inside the open block

| Input | Outcome |
| --- | --- |
| A change that lies inside or across the block | The editor shows "The source block changed outside the preview while it was being edited. Copy your text, then reopen the block." with the typed text kept, and the lock is free for a new edit |
| An insertion editor (an empty block) and a change elsewhere | No conflict is reported; only a change at its own offset conflicts |

### Related requirements

- SwRS-MDOKFSTUDIO-BLOCK-193: the page updates that wait for the lock
- SwRS-MDOKFSTUDIO-BLOCK-216: a first save that does not match is refused
- SwRS-MDOKFSTUDIO-BLOCK-244: the accepted shape of previewEditClosed

### Verification notes

- Method: test/core/state/editLock.test.ts (lock held and released, queued work runs once, reload and ready cases: `reloads are deferred while held and flushed once on release`, `a previewReady with another requestId releases the lock (STAB-02)`, `previewReady without a lock releases nothing`, `a ready report of another render hands back the queued work`, `a ready of the same render that reports no open editor releases the lock`, `time alone never releases the lock`).
- Method: test/integration/previewEditing.test.ts (an autosave during an edit does not render until the edit ends; open a block, autosave, reload, open another).
- Method: test/host/previewTiming.test.ts (watch once, close of another editor id: `renders wait while the page has an inline editor open, and the newest one arrives on its close`, `a close of another editor id releases nothing`).
- Method: test/page/runtimeBlockEditor.test.ts (`STAB-03: an editor the host watches reports its close; without a watch the close stays silent`, `STAB-03: a watch for an editor that is already closed is answered at once`, `STAB-03: a watch sent while the host already follows another document is still answered`).
- Method: test/core/state/blockRange.test.ts (`STAB-06: a change before the open block shifts it by the inserted or removed length`, `STAB-06: a change at or after the end of the open block leaves it in place`, `STAB-06: several changes of one event add up; offsets refer to the text before the event`, `STAB-06: a change inside or across the open block is a conflict`, `STAB-06: an empty block (an insertion editor) conflicts only with a change at its offset`); the controller path trackOutsideChange through the host events has no test.
- Criteria: sourceStartOffset and lastSavedText describe the block in the document; releaseActiveBlockEdit runs the queued work once; watchedPageEditorId remembers the editor; the close message is addressed by the editor id only and closePageEditor compares the editor id; onPreviewReady releases only in the cases above; rebaseBlockRange returns the new start or the conflict and the host posts the error.
