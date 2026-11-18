---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-045
uuid: 75936e60-1469-4f21-b56e-846e2cec51bb
title: "The host renames only the label text in one undo step"
description: "When the host receives a label rename, the extension SHALL change only
  the `(old)=` text of the stated line as one undo step of the source editor, keeping
  surrounding whitespace and CRLF endings, and when that line is no longer exactly
  `(old)=` change nothing and answer The label is no longer on that line. Refresh
  the preview, without searching other lines; it SHALL accept a previewLabelRename
  message only with a source line, two valid label names and the current render, and
  answer previewLabelRenameResult with the same edit id."
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/mapping/labelRename.ts
- src/core/protocol/pageToHost.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/mapping/labelRename.test.ts
- test/core/protocol/pageToHost.test.ts
- test/integration/labelRename.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-MYST-046
- SwRS-MDOKFSTUDIO-MYST-051
---

## The host renames only the label text in one undo step

### Normative behavior

When the host receives a label rename, the extension SHALL change only the `(old)=` text of the stated line as one undo step of the source editor, keeping surrounding whitespace and CRLF endings, and when that line is no longer exactly `(old)=` change nothing and answer The label is no longer on that line. Refresh the preview, without searching other lines; it SHALL accept a previewLabelRename message only with a source line, two valid label names and the current render, and answer previewLabelRenameResult with the same edit id.

### Scenario (nominal): A valid rename edits only the label text
- GIVEN the line `  (old)=` with CRLF
- WHEN a valid rename to `new` is accepted
- THEN only the label text changes, whitespace and CRLF stay, and one undo restores it

### Scenario (nominal): The uses of the old name are counted, not rewritten
- GIVEN `{ref}` uses of the old name
- WHEN a rename is accepted
- THEN they are not rewritten and their count is returned as remainingRefs

### Scenario (refusal): The label line changed
- GIVEN the line edited to something else
- WHEN a rename request arrives
- THEN the refusal The label is no longer on that line. Refresh the preview is returned and nothing changes

### Scenario (boundary): The same label on another line is not touched
- GIVEN the same label present on another line
- WHEN a rename request arrives
- THEN that other line is not touched; only the stated line is checked and no other line is searched

### Scenario (nominal): A valid message is answered with its edit id
- GIVEN a previewLabelRename with line, old name, new name and edit id for the current render
- WHEN the host receives it
- THEN previewLabelRenameResult carries the same edit id with ok, remainingRefs or reason

### Scenario (refusal): Accepted shape of the rename message
| Field of previewLabelRename | Accepted | Otherwise |
| --- | --- | --- |
| line | A source line (a safe integer, 1 or more) | The validator rejects the message |
| oldName | A valid label name: letters, digits and `_ . : -`, 100 characters at most | The validator rejects the message |
| newName | The same pattern and bound as oldName | The validator rejects the message |
| editId | Optional; repeated in the answer, which the page matches by it | Not checked by the validator |
| render identity | The current render | The gate drops or refuses the message (see SwRS-MDOKFSTUDIO-TRUST-065) |

A message rejected by the validator changes nothing in the document.

### Scenario (refusal): A message from a stale render
- GIVEN a previewLabelRename from a stale render
- WHEN the host receives it
- THEN the host answers with ok false and the reason The label is no longer on that line. Refresh the preview., and nothing in the document changes

### Related requirements
- SwRS-MDOKFSTUDIO-MYST-038: the field that posts the message and shows the answer.
- SwRS-MDOKFSTUDIO-BLOCK-058: the edit is one undo step, renders once and a failed apply is reported.
- SwRS-MDOKFSTUDIO-BLOCK-041: an open editor blocks a rename.
- SwRS-MDOKFSTUDIO-TRUST-005: the host handles a rename whatever the trust.
- SwRS-MDOKFSTUDIO-TRUST-065: a rename from a stale render is refused.

### Verification notes
- Method: test/core/mapping/labelRename.test.ts ("renames only the label line and keeps everything else": nominal edit, uses not rewritten; "refuses a line that is not exactly the old label, never guessing another line": label line changed, other line)
- Method: test/core/edits/sourceEdits.test.ts ("a label rename changes the label line only and counts the remaining references": nominal edit, remaining uses)
- Method: test/core/protocol/pageToHost.test.ts ("previewLabelRename validates the line and both label names": accepted shape, malformed messages)
- Method: test/integration/labelRename.test.ts (run(): one undo step in the source editor; a valid message is answered with its edit id; stale render)
- Criteria: Only the stated line is checked; the edit is a single editor operation. Result fields are ok, remainingRefs, reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
- Supersedes:
  - [SwRS-MDOKFSTUDIO-MYST-046](SwRS-MDOKFSTUDIO-MYST-046.md): A valid rename edits only the label text as one undo step
  - [SwRS-MDOKFSTUDIO-MYST-051](SwRS-MDOKFSTUDIO-MYST-051.md): The label rename message is validated and answered
<!-- okf:links:end -->
