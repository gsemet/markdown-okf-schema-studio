---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-216
uuid: c8a30bbe-4a0c-46d3-b718-ca63a57fe503
title: "A refused open or save keeps the typed text and says why"
description: "When the host refuses to open a block editor or to save its text, the
  extension SHALL change nothing in the document, answer the page with the reason
  of the refusal, and let the page show that reason while it keeps the text the writer
  typed."
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockSourceEditor.ts
- src/session/features/blockEdits.ts
tested_in_files:
- test/integration/previewEditing.test.ts
- test/page/blockReq.requirements.test.ts
- test/session/blockReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A refused open or save keeps the typed text and says why

### Normative behavior

When the host refuses to open a block editor or to save its text, the extension SHALL change nothing in the document, answer the page with the reason of the refusal, and let the page show that reason while it keeps the text the writer typed.

### Scenario (nominal): Requests that match the document are accepted
| Input | Outcome |
| --- | --- |
| A previewEditOpen for the rendered revision of a document that has not changed | The block's source is sent |
| A first save whose originalText equals the block in the document | The edit is held and written |
| A first save for existing lines | The edit is held |

### Scenario (refusal): The host refuses what no longer fits the document
| Input | Outcome |
| --- | --- |
| previewEditOpen when the lines no longer exist in the document, or the document was edited after the last render | The answer carries "The preview is stale. Refresh it before editing this block." and no page editor is registered |
| A first previewEditSave whose originalText differs from the block in the document, for example "Not the current source" | The answer carries "The source block changed while it was being edited." and nothing is written |
| A first previewEditSave for lines beyond the document, also the save of an insertion after a missing line, or a revision that does not fit | The answer carries "The preview is stale. Reopen the block before saving." and nothing is written |
| A previewEditSave with another editId, document, range, original text or revision than the held edit | The answer carries "The preview block edit is stale. Reopen the block before saving." and the document is unchanged |
| A previewEditOpen that names an older render than the host holds | The answer carries "The preview is out of date. Try again once it has refreshed." and no page editor is registered; the frame of the editor shows the reason |
| A previewEditCancel with another editId, document, range, original text or revision than the held edit | The answer carries "The preview block edit is stale. Reopen the block before cancelling." and nothing changes |

### Scenario (refusal): A refused open leaves the frame without a text box
- GIVEN an editor frame that shows "Loading Markdown source…" and a previewEditSource answer with the error "Another Markdown block is already being edited."
- WHEN it reaches the open frame
- THEN the frame has no text box and its status line, which is in the frame from the start, holds the message
- The frame gets a Close button, the Refresh button is enabled again, and the frame is the open editor only until the writer leaves it

### Scenario (nominal): The writer leaves a refused open
- GIVEN the frame of a refused open
- WHEN the writer presses Escape, clicks Close, clicks Refresh or clicks another block
- THEN the frame closes without posting a cancel, and a click on another block opens that block

### Scenario (boundary): The answer of another editor
- GIVEN an answer whose editId is not the open editor's
- WHEN it arrives
- THEN it is ignored

### Scenario (refusal): A refused save keeps the typed text
- GIVEN an editor whose final save was refused
- WHEN the error arrives
- THEN the text box keeps the text, the status line shows the error and the editor is no longer finishing

### Scenario (nominal): Typing again saves again
- GIVEN the same editor after a refused save
- WHEN the writer types again
- THEN the next autosave is posted and the key hint returns to the status line


### Related requirements
- SwRS-MDOKFSTUDIO-TRUST-065: the gate of each page message, including the stale write
- SwRS-MDOKFSTUDIO-BLOCK-058: the outcome of a host source edit, including a failed apply

### Verification notes
- Method: test/page/blockReq.requirements.test.ts (refused open leaves the frame without a text box, `Escape and a click on another block leave the frame of a refused open`, answer of another editor, refused save keeps the typed text, typing again) with `a refused open leaves the frame without a text box and records the error` and `a refused save keeps the typed text and lets the next input save again`; the branch of the open is receiveBlockEditSource in src/page/features/blockSourceEditor.ts.
- Method: test/session/blockReq.requirements.test.ts (accepted requests, stale open, stale lines) with `an open for a document that changed since the render is refused and registers no editor` and `a first save for lines or an insertion point that do not exist is refused as stale`.
- Method: test/integration/previewEditing.test.ts (a mismatched originalText leaves the document unchanged; saves and cancels of mismatching edits); the message texts of these two rows have no assertion.
- Criteria: the status text equals the host message and the frame of a refused open stays the open editor until the writer leaves it; the error is posted by postEditSourceError; currentSourceEdit returns nothing for the stale case; handleEditSave compares originalText with the document slice and every field of the held edit is compared; lastPostedText is cleared so that the next text is posted.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-BLOCK-058](SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
<!-- okf:links:end -->
