---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-045
uuid: 75936e60-1469-4f21-b56e-846e2cec51bb
title: "The host renames only the label text in one undo step"
description: "When the host receives a label rename, the extension SHALL change only
  the `(old)=` text of the stated line as one undo step of the source editor, keeping
  surrounding whitespace and CRLF endings, and when that line is no longer exactly
  `(old)=` change nothing and answer The label is no longer on that line. Refresh
  the preview, without searching other lines."
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/edits/sourceEdits.ts
- src/core/mapping/labelRename.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/edits/sourceEdits.test.ts
- test/core/mapping/labelRename.test.ts
- test/integration/labelRename.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host renames only the label text in one undo step

### Normative behavior

When the host receives a label rename, the extension SHALL change only the `(old)=` text of the stated line as one undo step of the source editor, keeping surrounding whitespace and CRLF endings, and when that line is no longer exactly `(old)=` change nothing and answer The label is no longer on that line. Refresh the preview, without searching other lines.

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

### Related requirements
- SwRS-MDOKFSTUDIO-MYST-051: the message that carries the rename and its answer.
- SwRS-MDOKFSTUDIO-BLOCK-058: the edit is one undo step, renders once and a failed apply is reported.
- SwRS-MDOKFSTUDIO-BLOCK-041: an open editor blocks a rename.
- SwRS-MDOKFSTUDIO-TRUST-005: a read-only preview refuses a rename with a reason.
- SwRS-MDOKFSTUDIO-TRUST-065: a rename from a stale render is refused.

### Verification notes
- Method: test/core/mapping/labelRename.test.ts ("renames only the label line and keeps everything else": nominal edit, uses not rewritten; "refuses a line that is not exactly the old label, never guessing another line": label line changed, other line)
- Method: test/core/edits/sourceEdits.test.ts ("a label rename changes the label line only and counts the remaining references": nominal edit, remaining uses)
- Method: test/integration/labelRename.test.ts (run(): one undo step in the source editor)
- Criteria: Only the stated line is checked; the edit is a single editor operation.
