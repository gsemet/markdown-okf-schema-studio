---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-195
uuid: bd06bae2-5d2a-4711-b9ea-b41dc7347736
title: The host posts the lines that differ from the last commit
description: When the shown document is a file tracked by Git, in a trusted
  workspace, with preview.showIncomingChanges on and the Diff choice on, the
  extension SHALL post to the page the line ranges of the shown text, unsaved
  edits included, that differ from the file at HEAD, and in every other case
  post an empty list of ranges only to take back marks the page shows.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/incomingChanges.ts
tested_in_files:
- test/integration/incomingChanges.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
---

## The host posts the lines that differ from the last commit

### Normative behavior

When the shown document is a file tracked by Git, in a trusted workspace, with preview.showIncomingChanges on and the Diff choice on, the extension SHALL post to the page the line ranges of the shown text, unsaved edits included, that differ from the file at HEAD, and in every other case post an empty list of ranges only to take back marks the page shows.

### Scenario (nominal): Changed lines and unsaved edits

| Input | Outcome |
| --- | --- |
| A tracked file whose shown text has two lines changed since HEAD | the page receives two ranges of the changed lines, 1-based, in the shown text |
| A tracked file with an unsaved edit in the editor | the edited lines are in the ranges |

### Scenario (nominal): When the marks are posted

| Trigger | Outcome |
| --- | --- |
| The preview renders | the marks are posted 300 ms later; a second render within 300 ms replaces the pending refresh, so only one post follows |
| The HEAD commit changes | the marks are read again and posted at once |
| Trust is granted to a preview opened in an untrusted workspace | the marks are posted at once |
| The preview settings change | the marks are posted at once |
| A page has just loaded | the marks are posted at once |
| The Diff choice is stored | the marks are posted at once (see SwRS-MDOKFSTUDIO-REVIEW-214) |

### Scenario (refusal): An untracked file, another scheme, an untrusted workspace or an off choice

| Input | Outcome |
| --- | --- |
| A file that Git does not know, with no mark showing | no incoming-change message is posted |
| A file that is not a file document, a workspace that is not trusted, or the setting or the Diff choice off, with no mark showing and the enabled value unchanged | nothing is posted |
| A page that shows marks and a file that Git no longer knows or a workspace that is no longer trusted | an empty list of ranges is posted so the page clears the marks |

### Scenario (boundary): Nothing to say and marks to take back

| Input | Outcome |
| --- | --- |
| No changed lines, no marks showing and the enabled value equal to the one last posted | no message is posted |
| A page that shows marks and a document that now equals HEAD | an empty list is posted |
| A page that shows marks and the Diff choice turned off | an empty list is posted |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-200: the comparison that gives the ranges.
- SwRS-MDOKFSTUDIO-REVIEW-203: the HEAD text and the announcement of a new commit.
- SwRS-MDOKFSTUDIO-REVIEW-207: how the page marks blocks from the ranges.
- SwRS-MDOKFSTUDIO-REVIEW-208: how the page treats malformed ranges.

### Verification notes

- Method: test/session/reviewReqIncoming.requirements.test.ts (unit tests: a render schedules the marks after 300 ms and a second render replaces the pending one; a new HEAD commit, trust and a settings change post the marks again without delay; nothing is posted for a page without marks and an unchanged enabled value, marks are taken back: scenarios when the marks are posted, nothing to say and marks to take back). The page-load trigger is untested (it needs the Git extension, which the host harness does not provide); the change of the Diff choice is covered by SwRS-MDOKFSTUDIO-REVIEW-214.
- Method: test/integration/incomingChanges.test.ts (an untracked file gets no incoming-change message: scenario an untracked file, another scheme, an untrusted workspace or an off choice); the other gates and the take-back are untested at host level.
- Method: test/page/modules/incomingChanges.test.ts (page side only); real window review-annotations/r03-incoming-change-bars shows the bars. The host-side positive path (IncomingChangesController.post) has no integration test, so the scenario changed lines and unsaved edits is checked only through the real window.
- Criteria: The posted ranges equal changedLineRanges(text at HEAD, shown text); the posted-message count stays 0 for the untracked file without marks and an empty list is posted when marks are showing; schedule() clears the pending timer and starts a new one of 300 ms, and each immediate trigger calls schedule with a delay of 0; the post count does not grow in the no-message case and an empty list follows in the take-back cases.
