---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-090
uuid: 07b96fc2-5a78-43bd-95c8-b71161d48dc7
title: Every page request is answered once by its id and result type, or ends
  with a readable error
description: When the page sends a request to the host, the extension SHALL
  answer it once with the matching result or end it with a readable error after
  its timeout.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
- StRS-MDOKFSTUDIO-DIAG-009
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
- src/page/features/hostHandlers.ts
- src/page/modules/editPalettePopovers.ts
- src/page/modules/hostRequests.ts
- src/page/modules/pasteHtml.ts
- src/page/modules/pasteImage.ts
- src/session/features/comments.ts
- src/session/features/hostRequests.ts
- src/session/features/plantUml.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/integration/commentWrite.test.ts
- test/integration/imagePaste.test.ts
- test/integration/imagePicker.test.ts
- test/integration/inlineThread.test.ts
- test/integration/mystPickers.test.ts
- test/page/modules/editPalette.test.ts
- test/page/modules/hostRequests.test.ts
- test/page/modules/paletteReq.requirements.test.ts
- test/page/modules/plantumlFileRequests.test.ts
- test/page/runtimePaletteActions.test.ts
- test/session/diagReq.plantuml.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-047
- SwRS-MDOKFSTUDIO-DIAG-052
---

## Every page request is answered once by its id and result type, or ends with a readable error

### Normative behavior

When the page sends a request to the host, the extension SHALL answer it once with the matching result or end it with a readable error after its timeout.

### Scenario (nominal): The answer is matched by edit id and result type

- GIVEN a pending previewListTargets request with the edit id host-1, a fresh edit id of 1 to 100 characters
- WHEN the host answers previewListTargetsResult with the edit id host-1
- THEN the request is answered once, and a second answer with the same edit id is ignored
- Example: a previewPlantUmlInclude request with the edit id plantuml-1 in flight, and an ok answer with that edit id, delivers the file id and the text to the PlantUML bundle

### Scenario (refusal): An answer that does not match is ignored

- GIVEN the same pending request
- WHEN an answer arrives with another edit id, or of another result type such as previewListCitationsResult with host-1
- THEN it is ignored and the request stays pending until its own answer or its timeout
- Example: with plantuml-1 in flight, an answer for plantuml-99 is ignored, and so is a second answer for plantuml-1 after the first one was delivered

### Scenario (nominal): The host answers with the type followed by Result and the identity of the request

- GIVEN a list, pick, paste, thread or include request of the table below
- WHEN the host handles it
- THEN it posts the request type followed by Result, repeating the document id, the revision, the request id and the edit id of the request
- AND a success carries ok true with the payload of the table, and a refusal or a failure carries ok false and a reason

### Scenario (refusal): A refused request is still answered

- GIVEN a previewPickImage request refused by the host, or a previewListTargets request for a preview that is out of date
- WHEN the host answers
- THEN previewPickImageResult carries ok false, the reason and the identity of the request, and the page shows the reason

### Scenario (boundary): Timeouts and the readable error

| Request | Timeout | End without an answer |
| --- | --- | --- |
| previewListTargets, previewListCitations, previewCopyText | 6 seconds | ok false and the reason The editor did not answer. Try again., shown in the popover |
| previewThreadReply, previewThreadDelete | 6 seconds (default) | ok false and the reason The editor did not answer. Try again., shown in the status line of the thread |
| previewPasteHtml | 10 seconds (set by the block editor) | ok false and the reason The editor did not answer. Try again. |
| previewPasteImage | 30 seconds (set by the block editor) | ok false and the reason The editor did not answer. Try again. |
| previewPlantUmlInclude | 10 seconds (set by the PlantUML bridge) | the bundle receives ok false and the reason The editor did not answer. Try again. |
| previewPickDocument, previewPickImage | 10 minutes (a request marked as a dialog) | ok false and the reason The editor did not answer. Try again. |

- A request answered before its timeout produces no timeout result. A request that names an older render is answered at once by the host, so none of the timeouts above applies to it.
- A request that ended on its timeout is forgotten, so an answer that arrives later is ignored.
- While a dialog request is pending, the block editor does not treat the focus loss as leaving; this holds also until its timeout.

### Scenario (boundary): Each request type, its result and its refusals

| Request | Result message | Success payload | Refusals and failures, as the reason text of ok false |
| --- | --- | --- | --- |
| previewCopyText | previewCopyTextResult | ok true | Too large to copy. (text over 1 000 000 characters); Could not copy. (the clipboard write failed) |
| previewListTargets | previewListTargetsResult | ok true, items, truncated | The preview is out of date. Try again once it has refreshed. (no refusal in a read-only preview) |
| previewListCitations | previewListCitationsResult | ok true, items, truncated | the read-only reason (read-only); The preview is out of date. Try again once it has refreshed.; the message of the scan error |
| previewPickDocument | previewPickDocumentResult | ok true and path relative to the document, or ok true and cancelled true when the dialog is closed | the read-only reason (read-only); The preview is out of date, or the document is not a file.; That file name cannot be written in a {doc} link.; the message of the dialog error |
| previewPickImage | previewPickImageResult | ok true and path relative to the document, or ok true and cancelled true | the read-only reason (read-only); The preview is out of date, or the document is not a file.; Pick a png, jpeg, gif, webp or svg image.; The image must be inside a workspace folder.; That image cannot be referenced from this document (another drive, or an unusual name).; the message of the dialog error |
| previewPasteImage | previewPasteImageResult | ok true and fileName | the read-only reason (read-only); Save the document before pasting an image.; Pasting an image needs a Markdown file.; The image must be saved inside a workspace folder.; That clipboard image type is not supported.; The image is larger than 10 MB.; The clipboard data is not a png, jpeg, gif or webp image.; Too many pasted images next to this document.; the message of the write error |
| previewPasteHtml | previewPasteHtmlResult | ok true and markdown | the message of the conversion error |
| previewPlantUmlInclude | previewPlantUmlIncludeResult | ok true, the real path of the file as id, and text | ok false and a reason, for a file outside the allowed folders; a malformed or incomplete answer reaches the bundle as the reason that the file could not be read |
| previewThreadReply | previewThreadReplyResult | ok true | the read-only reason (read-only); Save or cancel the open Markdown edit before changing a thread.; The preview is out of date. Try again once it has refreshed.; The document changed meanwhile. Try again.; VS Code could not apply the change.; the refusal of the thread lines |
| previewThreadDelete | previewThreadDeleteResult | ok true | the same reasons as previewThreadReply, except The document changed meanwhile. Try again. |

- The page shows the reason of a refusal where the request came from: the popover for a list, the status line of the block editor for a picker, the status line of the thread (or The change was not saved. when there is no reason).
- The page matches these results by the edit id only, because the edit itself can move the document revision. The host-to-page rule of these result types is the own-id addressing, see SwRS-MDOKFSTUDIO-TRUST-059.
- The writes among them are refused in a read-only preview, see SwRS-MDOKFSTUDIO-TRUST-005.

### Scenario (boundary): The comment actions are answered by a result without an edit id

| Request | Result message | Content | Page timeout |
| --- | --- | --- | --- |
| previewCommentCreate | previewCommentResult | ok, kind create, reason when ok is false | 15 seconds: No answer from the editor. Your text is kept: try Save again. |
| previewCommentReply | previewCommentResult | ok, kind reply, the thread id, reason when ok is false | 15 seconds: No answer from the editor. Your text is kept: try Reply again. |
| previewCommentResolve, previewCommentDelete | previewCommentResult | ok, kind, the thread id, reason when ok is false | 15 seconds: No answer from the editor. Nothing changed here: try again. |

- The host answers each handled comment message with exactly one previewCommentResult, also after an unexpected error (then ok false with the message of the error), and the page keeps the typed text until ok is true.
- A previewCommentResult is addressed to the shown render and has no edit id; the page gives it to the compose box (kind create) or to the thread that waits.
- A late previewCommentResult after the 15 seconds still counts for the compose box that waits (Save stays awaiting).

### Scenario (refusal): Closing the editor forgets the pending requests

- GIVEN a pending list request and its timeout
- WHEN the block editor is torn down, and the answer arrives later or the timeout would have elapsed
- THEN nothing is inserted, nothing is shown and no failure result is produced
- AND the PlantUML include requests are not cancelled by this, because the bridge keeps its own pending table

### Scenario (refusal): Answers for another or a closed editor are ignored

- GIVEN an answer for a pasted image or a rich text paste whose edit id is not pending, or whose editor is closed or replaced, or a list answer for a popover that is closed or replaced
- WHEN it arrives
- THEN it is ignored: nothing is shown and nothing is inserted
- AND an answer that arrives for the editor still open is used (the entries are shown, the Markdown is inserted)

### Scenario (refusal): A request of an older render is answered

- GIVEN a list, picker, paste or thread request that names an older render than the host holds
- WHEN the host receives it
- THEN it answers with ok false and "The preview is out of date. Try again once it has refreshed."
- AND the page clears the pending request at once and shows the reason, without waiting for its own timeout

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-052: the envelope and the accepted fields of the request messages
- SwRS-MDOKFSTUDIO-TRUST-059: the acceptance of the result messages by the page
- SwRS-MDOKFSTUDIO-TRUST-065: the gates, and the out-of-date answer to a request of an older render
- SwRS-MDOKFSTUDIO-TRUST-005: the refusal of the write requests of a read-only preview

### Verification notes

- Method: test/page/modules/hostRequests.test.ts (matching by edit id and result type, answered once, timeout with the readable error with an explicit 6000, dialog requests keep the blur suspended, the pending table is emptied; the default timeouts 6 seconds and 10 minutes, the late answer after a timeout, and that no callback runs after the cancel are untested)
- Method: test/core/protocol/pageToHost.test.ts (edit id of 1 to 100 characters on the list, pick, paste, thread and include requests)
- Method: test/page/modules/plantumlFileRequests.test.ts (include request and answer, refusal, stale and repeated answers, timeout reason)
- Method: test/page/modules/editPalette.test.ts (late list answer after the popover closed is ignored; an empty list or a host error is said in the popover)
- Method: test/page/runtimePaletteActions.test.ts (an image paste reply for another edit is ignored; a refusal shows its reason)
- Method: test/page/modules/paletteReq.requirements.test.ts (a rich text conversion answered after the editor closed inserts nothing; an open editor gets the Markdown)
- Method: test/session/diagReq.plantuml.requirements.test.ts (an include request is answered once with the edit id, a file or a refusal)
- Method: test/integration/mystPickers.test.ts, test/integration/imagePicker.test.ts, test/integration/imagePaste.test.ts (host answers with the request identity, labels, keys and refusal reasons of the pickers and the paste)
- Method: test/integration/inlineThread.test.ts (thread reply and delete results with the edit id, only for the success and the lines refusals)
- Method: test/integration/commentWrite.test.ts (previewCommentResult of reply to an unknown thread, delete of an unknown thread, create with an old version, read-only resolve and delete); the 15 second page timeout of the comment actions is untested
- Method: test/core/protocol/hostToPage.test.ts (sample previewThreadReplyResult)
- Criteria: the protocol validator rejects an edit id that is empty, longer than 100 characters or not a string (isHostRequest in src/core/protocol/pageToHost.ts); each request gets one answer that repeats its edit id with the request type followed by Result, or a failure result after its timeout; the 30 second and 10 second values are passed by the block editor and are not asserted by a test.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-009](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-009.md): What the page and the host exchange is checked and never applied to another version
  - [StRS-MDOKFSTUDIO-DIAG-009](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-052](SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-059](SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
  - [SwRS-MDOKFSTUDIO-TRUST-065](SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-047](../diagrams/SwRS-MDOKFSTUDIO-DIAG-047.md): Include answers are matched by their edit id
  - [SwRS-MDOKFSTUDIO-DIAG-052](../diagrams/SwRS-MDOKFSTUDIO-DIAG-052.md): The host answers an include request with the same edit id
<!-- okf:links:end -->
