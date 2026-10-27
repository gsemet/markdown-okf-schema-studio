---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-205
uuid: 09afd9e2-5e8c-4d91-b907-2730cc5a4638
title: "Open editors are saved before the page hides or leaves the document"
description: "When the page hides, closes or leaves the document (a followed link,
  Back, another document) or the writer turns edit mode off, the extension SHALL post
  the text typed in every open editor as a save before the page goes away, bounded
  by a wait of at most 1.5 seconds for the page's answer and 1.5 seconds for the saves
  to reach the document."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-006
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-TABLE-001
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/flushWait.ts
- src/page/features/blockEditor.ts
- src/page/features/editMode.ts
- src/page/features/hostHandlers.ts
- src/page/modules/historyControls.ts
- src/session/features/blockEdits.ts
- src/session/features/history.ts
- src/session/features/links.ts
tested_in_files:
- test/core/preview/flushWait.test.ts
- test/integration/previewHistory.test.ts
- test/integration/realInput/markers.ts
- test/page/fmtableReqTable.requirements.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeEditorFlush.test.ts
- test/session/toolbarReq.requirements.test.ts
---

## Open editors are saved before the page hides or leaves the document

### Normative behavior

When the page hides, closes or leaves the document (a followed link, Back, another document) or the writer turns edit mode off, the extension SHALL post the text typed in every open editor as a save before the page goes away, bounded by a wait of at most 1.5 seconds for the page's answer and 1.5 seconds for the saves to reach the document.

### Scenario (nominal): Hiding the page posts the pending autosave
| Input | Outcome |
| --- | --- |
| A block editor with an autosave timer pending, and pagehide fires | The autosave is posted at once, without waiting for its 400 ms timer; no final save is posted and the editor stays open |
| The same, and visibilitychange to hidden fires | The same outcome |
| A cell editor with typed text waiting for its autosave, and the window pagehide event or visibilitychange to hidden fires | One non-final previewEditSave with the typed text is posted and the editor is not closed |
| No pending edit, or a page that stays visible, and a hide event fires | Nothing is posted |
| A cell editor whose last text is already posted, and the page is hidden | No previewEditSave is posted |

### Scenario (nominal): The host asks the page to save its editors before it switches document
- GIVEN an open editor with typed text and a click on a link to another file
- WHEN the host starts the switch
- THEN previewFlushEdit is posted before the new document renders and the host waits for the answer
- The same holds for Back and for a tab switch

### Scenario (nominal): The page saves its open editors and then answers the flush
- GIVEN an open block editor with typed text, or an open cell editor with text in its text box that the table model has not yet received
- WHEN previewFlushEdit arrives
- THEN the extension copies the text of the cell text box into the table model, posts the final save of every open editor with flush true and then posts previewEditFlushed with the flush id and flushed true

### Scenario (boundary): Answers and flags of the flush
| Input | Outcome |
| --- | --- |
| previewFlushEdit arrives and no editor is open | previewEditFlushed with flushed false is posted |
| A block editor or no editor is open and a flush runs | The table branch (copy of the cell text) is skipped |
| A save by Done | The previewEditSave has no flush field |
| A page that has not reported ready (or a read-only or disposed preview) and a switch starts | No flush is posted and the switch goes on |

### Scenario (nominal): Link and Back right after typing save first
| Input | Outcome |
| --- | --- |
| An editor with typed text and a click on a link to another file | The final save is posted first, then previewLink |
| An editor with typed text and Back is pressed | The final save is posted first, then previewHistoryGo |
| A link to an anchor in the same page is clicked | The open editor is kept and no save is posted |
| An open editor without changes and Back is pressed | Only the navigation is posted |

### Scenario (nominal): The host applies pending saves before it moves
- GIVEN a final save posted just before Back or just before a link to another file
- WHEN the host handles previewHistoryGo or previewLink
- THEN the document holds the saved text before the other document or file opens
- With no edit in flight the host moves or resolves the link at once

### Scenario (boundary): The host never waits long
| Input | Outcome |
| --- | --- |
| A page that never answers the flush | The switch continues after 1.5 seconds (FLUSH_WAIT_MS is 1500) |
| A save that stays pending while the host waits for settling | The switch continues after a further 1.5 seconds |

### Scenario (refusal): A save refused during a flush warns that the text was not saved
- GIVEN a flushed save of the block at lines 5-7 that the host refuses
- WHEN the refusal is posted
- THEN a warning starts with "Markdown OKF-Schema Studio could not save the text you typed in the block at lines 5-7", gives the refusal reason and ends with "That text was not saved."
- A refused save that is not a flush shows no warning; the editor shows the reason

### Scenario (nominal): Turning edit mode off saves an open cell
| Input | Outcome |
| --- | --- |
| A cell edited and the edit mode button pressed | A final previewEditSave with the edited table is posted |
| A cell editor unchanged, or still waiting for the host source, and edit mode turns off | The editor closes without a save |

### Related requirements
- SwRS-MDOKFSTUDIO-BLOCK-245: the shape of previewEditFlushed
- SwRS-MDOKFSTUDIO-BLOCK-042: the autosave of an open editor

### Verification notes
- Method: test/page/runtimeBlockEditor.test.ts (hiding the page, block editor rows, nothing pending) with `pagehide flushes a pending autosave without waiting for the timer`, `visibilitychange to hidden flushes a pending autosave without waiting for the timer` and `hide events post nothing when no edit is pending or the page stays visible`.
- Method: test/page/runtimeEditorFlush.test.ts (hiding the page with a cell editor, the page saves its open editors, answers and flags, link and Back right after typing) with `CR 025: a host flush request saves the open editor first, then answers`, `CR 025: a host flush request without an open editor only answers`, `CR 025: a host flush request saves the typed text of an open table cell`, `CR 025: pagehide saves the typed text of an open table cell`, `CR 025: following a link right after typing posts the final save before the link`, `CR 025: an anchor link inside the page keeps the open editor`, `CR 025: Back right after typing posts the final save before previewHistoryGo`, `CR 025: Back with an untouched editor open posts only the navigation` and `CR 025: a flushed block save carries the flush flag, a normal save does not`.
- Method: test/integration/realInput/flushBeforeNavigate.ts with the markers in test/integration/realInput/markers.ts (host asks the page to save before it switches, link and Back rows): real-input scenarios scenarioFlushBeforeLink, scenarioFlushBeforeBack and scenarioFlushBeforeTabSwitch (screenshot block-editing/r24).
- Method: test/core/preview/flushWait.test.ts (the host never waits long, refused flush warning) with `CR 025: waitForSettled gives up after the timeout, so a stuck save never blocks a navigation`, `CR 025: waitForAnswer resolves true on the answer and false on silence` and `CR 025: the flush refusal warning names the field and says the text was not saved`; the posting path of the warning has no test.
- Method: test/integration/previewHistory.test.ts (the host applies pending saves before Back: the text typed in the block editor is in the document after Back); the step settleHostEdits has no unit test.
- Method: test/session/toolbarReq.requirements.test.ts (following a link applies the pending saves before the link is resolved).
- Method: test/page/fmtableReqTable.requirements.test.ts (turning edit mode off saves a changed open cell and closes an unchanged or loading one without a save).
- Criteria: flushPageEdits posts the message only for a live, writable, ready page; the answer follows the saves on the same channel; state.flushingEditors is set only around the flush save; flushPendingAutosave runs for both hide events; the saved table contains the typed text of the cell; the cell test checks that one previewEditSave whose editedText contains the typed text is posted but does not assert the non-final flag, which is read from flushPendingAutosave; flushRefusalMessage builds the warning; settleHostEdits runs before the link is resolved and before the history move; FLUSH_WAIT_MS is 1500; a final save for a changed cell and no message for an unchanged or still loading one.
