---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-119
uuid: bde828fb-45ad-436e-ba70-d6919ab36cac
title: Moved thread lines are written with the document save only
description: When the document is saved, the extension SHALL write the moved
  lines of the review threads to the comments file through the same write queue,
  and write that file only then and only when it exists, is valid and has no
  unsaved changes in an editor.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-REVIEW-003
- StRS-MDOKFSTUDIO-REVIEW-008
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/comments.ts
tested_in_files:
- test/integration/commentAnchors.test.ts
- test/session/reviewReqComments.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Moved thread lines are written with the document save only

### Normative behavior

When the document is saved, the extension SHALL write the moved lines of the review threads to the comments file through the same write queue, and write that file only then and only when it exists, is valid and has no unsaved changes in an editor.

### Scenario (nominal): Save after moves

- GIVEN three threads that moved while the document was edited
- WHEN the document is saved
- THEN the comments file holds the new lines of the three threads and the comments unchanged

### Scenario (boundary): Nothing moved

- GIVEN a save when no thread moved
- WHEN the document is saved
- THEN the file is not written

### Scenario (refusal): Typing writes nothing

- GIVEN a document with three threads and lines inserted above them
- WHEN the edits are made without saving
- THEN the comments file on disk is unchanged
- AND when the threads are posted again the page shows the threads on their new lines

### Scenario (refusal): Save never creates or repairs a comments file

| Input | Outcome |
| --- | --- |
| plain.md with no comments file is saved | No plain.comments.json is created |
| A comments file holding {bad and the document is saved | The file still holds {bad and no warning is shown |

### Scenario (refusal): Comments file with unsaved changes

- GIVEN a comments file open with unsaved changes and threads that moved
- WHEN the document is saved
- THEN the file on disk is unchanged and the warning "The review comments were not re-anchored in their file: notes.comments.json has unsaved changes in an editor." is shown once for each reason
- AND a second save with the same reason does not show the warning again
- AND the same comments file without unsaved changes receives the moved lines on save

### Scenario (nominal): Comments file shown or changed outside the editor

- GIVEN a comments file whose stored lines no longer fit the document
- WHEN the file is shown or read after a change outside this editor
- THEN every thread is checked against the document text, and the threads are posted with the lines where their quotes are now and orphaned true for those not found
- AND after a comment just written by the Studio, the lines followed in memory are the starting point of the check

### Scenario (boundary): Change of a clean document

| Input | Outcome |
| --- | --- |
| A document without unsaved changes changes (a revert, an undo to the saved text, a reload from disk) | The lines followed in memory are dropped and the threads are checked again against the new text |
| The same change while the comments file text stays the same | The threads are still checked again against the new text: the unchanged file does not skip the check, and later edits shift the new lines |
| A document with unsaved changes changes | The lines are shifted in memory instead |

### Scenario (boundary): Document over 8 MiB

| Input | Outcome |
| --- | --- |
| A closed document of more than 8 MiB, the threads are read | The stored lines are posted without searching for the quotes |
| An open document of the same size, the threads are read | The open text is used |

### Scenario (boundary): The document changes while the save writes the lines
| Input | Outcome |
| --- | --- |
| A save that writes a moved thread (line 3 in the saved text) while two lines are added at the top of the buffer, after the comments file was read and before the write ends | The written lines are not shown as they are: the next post checks the anchor against the buffer and the page gets line 5 |
| A save that writes the moved lines while the document does not change | The written lines are shown without a new check |

### Verification notes

- Method: test/integration/commentAnchors.test.ts (save writes the new lines and a second save leaves the modification time; nothing moved; no write while typing and the page follows; plain.md never gets a comments file and {bad stays; a dirty comments file is not overwritten; orphaned flags posted and orphan after a removal). The write after the comments file is clean and the own-write starting point (hintHash) are untested.
- Method: test/session/reviewReqComments.requirements.test.ts: `a save that cannot write the moved lines warns once for each reason` (the warning and the second save); `a document without unsaved changes that changes drops the followed lines, a dirty one shifts them` (change of a clean document); `a closed document over 8 MiB is not searched: the stored lines are posted` (document over 8 MiB, closed and open); `a clean document that changes is checked again even when the comments file did not change` (change of a clean document, same comments file text); `lines saved while the document gains lines are checked again against the text` (the document changes while the save writes the lines: the edit lands when the written file reaches its path).
- Criteria: The file lines equal {t1: 4, t2: 7, t3: 7} after the save and the modification time stays the same on the second save; the comments file text is identical before and after the edits and for the invalid and unsaved cases; view is set to undefined when the changed document is not dirty; currentDocumentText returns undefined above 8 * 1024 * 1024 bytes for a file that is not open; showWarning is called once while the reason stays the same; after a save during which the document revision changed, the view is undefined; whenever the view is undefined the next post re-anchors against the current text, even when the comments file text has the hash of the last post (the hash skip applies only while a view exists).
