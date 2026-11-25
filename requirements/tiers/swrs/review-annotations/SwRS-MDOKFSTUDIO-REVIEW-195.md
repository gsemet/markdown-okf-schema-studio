---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-195
uuid: bd06bae2-5d2a-4711-b9ea-b41dc7347736
title: "The host posts the lines that differ from the last commit, read from Git for
  small files"
description: "When the shown document is a file tracked by Git, in a trusted workspace,
  with preview.showIncomingChanges on and the Diff choice on, the extension SHALL
  post to the page the line ranges of the shown text, unsaved edits included, that
  differ from the file at HEAD, and in every other case post an empty list of ranges
  only to take back marks the page shows; it reports the added and modified lines
  of the shown text as 1-based ranges, merging adjacent lines and keeping separate
  edits as separate ranges, reports no range for a difference of line endings, of
  a missing final newline or of deleted lines only, and reports the whole differing
  middle as one range when more than 20 000 lines differ or more than 2000 edits are
  needed; it reads the text at HEAD through the built-in Git extension without starting
  a process, returns nothing when Git cannot give it or when the shown text, the document
  or the HEAD text is not a file under 1 MiB, and announces a change of the Git state
  only when the HEAD commit id has changed."
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
depends_on: []
scenarios:
- id: S1
  title: Changed lines and unsaved edits
- id: S2
  title: When the marks are posted
- id: S3
  title: An untracked file, another scheme, an untrusted workspace or an off
    choice
- id: S4
  title: Nothing to say and marks to take back
- id: S5
  title: Added, modified and separate edits
- id: S6
  title: Differences that do not count
- id: S7
  title: Range size limits
- id: S8
  title: Git available
- id: S9
  title: Git missing or failing
- id: S10
  title: Only file documents under 1 MiB
- id: S11
  title: A new HEAD commit is announced
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/lineDiff.ts
- src/host-vscode/headBaseline.ts
- src/session/features/incomingChanges.ts
tested_in_files:
- test/core/mapping/lineDiff.test.ts
- test/host-vscode/headBaseline.test.ts
- test/integration/incomingChanges.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-REVIEW-200
- SwRS-MDOKFSTUDIO-REVIEW-203
---

## The host posts the lines that differ from the last commit, read from Git for small files

### Normative behavior

When the shown document is a file tracked by Git, in a trusted workspace, with preview.showIncomingChanges on and the Diff choice on, the extension SHALL post to the page the line ranges of the shown text, unsaved edits included, that differ from the file at HEAD, and in every other case post an empty list of ranges only to take back marks the page shows; it reports the added and modified lines of the shown text as 1-based ranges, merging adjacent lines and keeping separate edits as separate ranges, reports no range for a difference of line endings, of a missing final newline or of deleted lines only, and reports the whole differing middle as one range when more than 20 000 lines differ or more than 2000 edits are needed; it reads the text at HEAD through the built-in Git extension without starting a process, returns nothing when Git cannot give it or when the shown text, the document or the HEAD text is not a file under 1 MiB, and announces a change of the Git state only when the HEAD commit id has changed.

### Scenario S1 (nominal): Changed lines and unsaved edits

| Input | Outcome |
| --- | --- |
| A tracked file whose shown text has two lines changed since HEAD | the page receives two ranges of the changed lines, 1-based, in the shown text |
| A tracked file with an unsaved edit in the editor | the edited lines are in the ranges |

### Scenario S2 (nominal): When the marks are posted

| Trigger | Outcome |
| --- | --- |
| The preview renders | the marks are posted 300 ms later; a second render within 300 ms replaces the pending refresh, so only one post follows |
| The HEAD commit changes | the marks are read again and posted at once |
| Trust is granted to a preview opened in an untrusted workspace | the marks are posted at once |
| The preview settings change | the marks are posted at once |
| A page has just loaded | the marks are posted at once |
| The Diff choice is stored | the marks are posted at once (see SwRS-MDOKFSTUDIO-REVIEW-214) |

### Scenario S3 (refusal): An untracked file, another scheme, an untrusted workspace or an off choice

| Input | Outcome |
| --- | --- |
| A file that Git does not know, with no mark showing | no incoming-change message is posted |
| A file that is not a file document, a workspace that is not trusted, or the setting or the Diff choice off, with no mark showing and the enabled value unchanged | nothing is posted |
| A page that shows marks and a file that Git no longer knows or a workspace that is no longer trusted | an empty list of ranges is posted so the page clears the marks |

### Scenario S4 (boundary): Nothing to say and marks to take back

| Input | Outcome |
| --- | --- |
| No changed lines, no marks showing and the enabled value equal to the one last posted | no message is posted |
| A page that shows marks and a document that now equals HEAD | an empty list is posted |
| A page that shows marks and the Diff choice turned off | an empty list is posted |

### Scenario S5 (nominal): Added, modified and separate edits

| Input | Outcome |
| --- | --- |
| A base and a current text with two lines added | the added lines are reported in the line numbers of the current text |
| One modified line | one range |
| Two separate edits | two ranges |
| Identical texts | no range |

### Scenario S6 (boundary): Differences that do not count

| Input | Outcome |
| --- | --- |
| A base with LF and a current text with CRLF | no range is reported |
| A base without a final newline against one with it | no range is reported |
| A current text with lines removed and nothing added | no range is reported |

### Scenario S7 (boundary): Range size limits

| Input | Outcome |
| --- | --- |
| A middle part of more than 20 000 lines (above the line cap) | one range covers the whole middle |
| More than 2000 edits (above the edit budget) | one range covers the whole middle |

### Scenario S8 (nominal): Git available

- GIVEN a repository with the file in HEAD
- WHEN the base is read
- THEN the commit id and the text are returned

### Scenario S9 (refusal): Git missing or failing

- GIVEN no Git extension, no repository, no file in HEAD or a failing show
- WHEN the base is read
- THEN nothing is returned and nothing is marked

### Scenario S10 (boundary): Only file documents under 1 MiB

| Input | Outcome |
| --- | --- |
| A shown text of more than 1 MiB | nothing is returned |
| A document that is not a file | nothing is returned |
| A file whose HEAD text is longer than 1 MiB (a big blob) | nothing is returned |

### Scenario S11 (nominal): A new HEAD commit is announced

| Input | Outcome |
| --- | --- |
| A state change that moves HEAD to a new commit | the listener is called with the new commit id, once per commit change |
| A state change with the same commit id | no listener call is made |
| No repository, no Git extension or no active API | no listener call is made |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-207: how the page marks blocks from the ranges.

### Verification notes

- Method: test/session/reviewReqIncoming.requirements.test.ts (unit tests: a render schedules the marks after 300 ms and a second render replaces the pending one; a new HEAD commit, trust and a settings change post the marks again without delay; nothing is posted for a page without marks and an unchanged enabled value, marks are taken back: scenarios when the marks are posted, nothing to say and marks to take back). The page-load trigger is untested (it needs the Git extension, which the host harness does not provide); the change of the Diff choice is covered by SwRS-MDOKFSTUDIO-REVIEW-214.
- Method: test/integration/incomingChanges.test.ts (an untracked file gets no incoming-change message: scenario an untracked file, another scheme, an untrusted workspace or an off choice); the other gates and the take-back are untested at host level.
- Method: test/page/modules/incomingChanges.test.ts (page side only); real window review-annotations/r03-incoming-change-bars shows the bars. The host-side positive path (IncomingChangesController.post) has no integration test, so the scenario changed lines and unsaved edits is checked only through the real window.
- Criteria: The posted ranges equal changedLineRanges(text at HEAD, shown text); the posted-message count stays 0 for the untracked file without marks and an empty list is posted when marks are showing; schedule() clears the pending timer and starts a new one of 300 ms, and each immediate trigger calls schedule with a delay of 0; the post count does not grow in the no-message case and an empty list follows in the take-back cases.
- Method: test/core/mapping/lineDiff.test.ts (unit tests `T16: identical text has no changed range`, `T16: added lines are reported in current line numbers`, `T16: a modified line is one range and two separate edits are two ranges`: scenario added, modified and separate edits; `T16: line endings do not count as changes`, `T16: a base without a trailing newline matches one with it`, `T16: deleted-only lines give no range`: scenario differences that do not count; `T16: above the size cap the whole middle counts as changed`, `T16: many differences beyond the edit budget fall back to the whole middle`: scenario range size limits).
- Criteria: The ranges equal the expected start and end lines; the result is an empty list in each no-range case; MAX_DIFF_LINES = 20000 and MAX_DIFF_EDITS = 2000 switch to one range.
- Method: test/host-vscode/headBaseline.test.ts (unit tests `T16: no Git extension, no repository or a failing show give undefined`: scenario Git missing or failing; `T16: only file documents under 1 MB are compared, big blobs are skipped`: scenario only file documents under 1 MiB; `T16: a state change with the same commit id does not notify, a new commit does`, `T16: watch gives nothing without the extension, a repository or an active API`: scenario a new HEAD commit is announced). The scenario Git available is checked with the same test file (the commit id and the text are returned) and by the real window review-annotations/r03-incoming-change-bars.
- Criteria: read() returns undefined in the failing cases; MAX_BASELINE_BYTES = 1048576 gates the read; the listener runs once per commit change.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-017](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-017.md): A writer sees which blocks changed since the last commit
- Supersedes:
  - [SwRS-MDOKFSTUDIO-REVIEW-200](SwRS-MDOKFSTUDIO-REVIEW-200.md): The line diff reports added and modified lines
  - [SwRS-MDOKFSTUDIO-REVIEW-203](SwRS-MDOKFSTUDIO-REVIEW-203.md): The HEAD text comes from the built-in Git extension for small files
<!-- okf:links:end -->
