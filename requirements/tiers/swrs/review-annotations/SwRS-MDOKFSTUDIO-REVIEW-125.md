---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-125
uuid: b16efe6d-5546-4bdc-b119-329ec6042883
title: A renamed document takes its review comments file along
description: When a document is renamed or moved, the extension SHALL rename its
  comments file to the new name and set the document name inside it, and leave
  every comments file where it is, never overwriting one, when the move is not
  safe.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
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
---

## A renamed document takes its review comments file along

### Normative behavior

When a document is renamed or moved, the extension SHALL rename its comments file to the new name and set the document name inside it, and leave every comments file where it is, never overwriting one, when the move is not safe.

### Scenario (nominal): Rename

- GIVEN move-me.md with move-me.comments.json holding thread m1
- WHEN the document is renamed to moved.md
- THEN moved.comments.json exists with the thread m1 and move-me.comments.json is gone

### Scenario (nominal): Move to another folder

- GIVEN the same document moved to another folder
- WHEN the move happens
- THEN the comments file moves with it

### Scenario (refusal): A rename never overwrites a comments file

| Input | Outcome |
| --- | --- |
| keep.md renamed to target2.md while target2.comments.json exists | Both comments files keep their content and the warning "The review comments of {old} stay in {file}: {reason}" says target2.comments.json already exists |
| The old comments file is not valid | The file stays under its old name and the same warning gives the reason |
| The old comments file is open with unsaved changes | The file stays under its old name and the same warning gives the reason |

### Scenario (refusal): A comments file that names another document

- GIVEN move-me.comments.json whose document field says other.md
- WHEN move-me.md is renamed
- THEN the file stays and no warning is shown

### Scenario (nominal): Own document

- GIVEN a comments file whose document field names the renamed document
- WHEN the document is renamed
- THEN the file moves

### Scenario (boundary): Renames that move nothing

| Input | Outcome |
| --- | --- |
| A folder is renamed | No comments file is moved |
| A file named x.comments.json is renamed | Nothing is moved |
| A file that is not local is renamed | No comments file is moved |

### Verification notes

- Method: test/integration/commentAnchors.test.ts (rename moves the comments file and keeps thread m1; target exists: both files kept). The move to another folder, the invalid and unsaved cases and the warning texts are untested.
- Method: test/session/reviewReqComments.requirements.test.ts: `a comments file that names another document stays where it is, without a warning` (names another document; the own document case is untested); `a folder, a comments file itself and a file that is not local move no comments file` (renames that move nothing).
- Criteria: The new file names the new document and the old file does not exist; no comments file is overwritten and the old file stays under its name; moveSidecars continues silently when a valid file names another document, and continues without a rename for a folder, a comments file and a non-local file.
