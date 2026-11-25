---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-006
uuid: 042eed6f-7009-4660-a783-68fbb792e3e5
title: "The host posts the baseline rendering while the side-by-side diff is on and
  takes only a well-formed switch message"
description: "While the side-by-side diff is on for a tracked file in a trusted workspace
  and markdownOkfSchemaStudio.preview.showIncomingChanges is not false, the host SHALL
  post to the page the text at the last commit rendered like the page content with
  its blocks numbered by the lines of that text, together with the line hunks between
  that text and the shown text, again when the shown text or the commit changes, and
  SHALL post an empty baseline when the file is not known to Git or the text at the
  last commit cannot be rendered; the switch message previewSideBySideChanged is accepted
  only with a boolean on field for the current render, and any other is dropped."
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-018
scenarios:
- id: S1
  title: The baseline follows the shown text
- id: S2
  title: No baseline
- id: S3
  title: A well-formed switch message
- id: S4
  title: Dropped switch messages
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
- src/session/features/baselineDiff.ts
- src/session/features/incomingChanges.ts
- src/session/features/viewState.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/session/baselineDiff.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-REVIEW-007
---

## The host posts the baseline rendering while the side-by-side diff is on and takes only a well-formed switch message

### Normative behavior

While the side-by-side diff is on for a tracked file in a trusted workspace and markdownOkfSchemaStudio.preview.showIncomingChanges is not false, the host SHALL post to the page the text at the last commit rendered like the page content with its blocks numbered by the lines of that text, together with the line hunks between that text and the shown text, again when the shown text or the commit changes, and SHALL post an empty baseline when the file is not known to Git or the text at the last commit cannot be rendered; the switch message previewSideBySideChanged is accepted only with a boolean on field for the current render, and any other is dropped.

### Scenario S1 (nominal): The baseline follows the shown text

| Input | Outcome |
| --- | --- |
| The side-by-side diff on, a tracked file in a trusted workspace | the host posts previewBaselineDiff with the HEAD text rendered like the page content and the hunks between it and the shown text |
| The shown text changes | a new message with new hunks; the same HEAD text is not rendered again |
| The HEAD commit changes | a new message with the new rendering |
| The Diff button off | the baseline is still posted |
| The diff switched off | nothing more is read, rendered or posted |

### Scenario S2 (boundary): No baseline

| Input | Outcome |
| --- | --- |
| A file Git does not know | an empty baseline (no html, no hunk) |
| A HEAD text that cannot be rendered, or whose content would carry a script or a nonce | an empty baseline, so the page keeps the green bars |
| markdownOkfSchemaStudio.preview.showIncomingChanges off, or an untrusted workspace | nothing is read or posted |
| Raw scripts in the HEAD text | never part of the posted html |
### Scenario S3 (nominal): A well-formed switch message

| Input | Outcome |
| --- | --- |
| previewSideBySideChanged with on true or false for the current render | accepted |

### Scenario S4 (refusal): Dropped switch messages

| Input | Outcome |
| --- | --- |
| previewSideBySideChanged with a non-boolean or no on | dropped |
| A switch message of a stale render | dropped |

### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-195: the host that posts the green-bar ranges, which also carries this message.
- SwRS-MDOKFSTUDIO-REVIEW-009: the hunks.

### Verification notes

- Method: test/session/reviewReqIncoming.requirements.test.ts (unit tests `CR147: with the side-by-side diff on, the page gets the HEAD rendering and the hunks, rendered once per HEAD text`, `CR147: the baseline does not depend on the Diff button and is empty for an untracked file`, `CR147: a HEAD text that cannot be rendered is posted empty, so the page keeps the green bars`, `CR147: with preview.showIncomingChanges off nothing is read or posted`, `CR147: the page message switches the diff on the session`) and test/session/baselineDiff.test.ts (`CR147: the HEAD text is rendered as the content of the page, its blocks numbered by the lines of that text`, `CR147: raw scripts of the HEAD text never reach the page`); real window: test/integration/realInput scenario incoming-changes (side-by-side part).
- Criteria: The posted message equals the expected html and hunks; the render stub is called once per HEAD text; the empty baseline is posted for an untracked or unrenderable HEAD; nothing is posted when the setting is off.
- Method: test/core/protocol/pageToHost.test.ts (`CR147: previewSideBySideChanged carries a boolean and names the current render`) and test/core/protocol/hostToPage.test.ts (`CR147: a baseline message needs an html string and well-formed hunks`, and the rule table tests that list previewBaselineDiff as a render message).
- Criteria: Each malformed message is rejected by its validator; a well-formed one passes the filter on the current page.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-018](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-018.md): A writer compares each changed block with its last-commit version side by side
- Supersedes:
  - [SwRS-MDOKFSTUDIO-REVIEW-007](SwRS-MDOKFSTUDIO-REVIEW-007.md): The side-by-side messages are validated and gated
<!-- okf:links:end -->
