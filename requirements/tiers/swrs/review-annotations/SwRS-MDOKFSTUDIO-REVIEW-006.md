---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-006
uuid: 042eed6f-7009-4660-a783-68fbb792e3e5
title: The host posts the baseline rendering while the side-by-side diff is on
description: While the side-by-side diff is on for a tracked file in a trusted
  workspace and markdownOkfSchemaStudio.preview.showIncomingChanges is not
  false, the host SHALL post to the page the text at the last commit rendered
  like the page content with its blocks numbered by the lines of that text,
  together with the line hunks between that text and the shown text, again when
  the shown text or the commit changes, and SHALL post an empty baseline when
  the file is not known to Git or the text at the last commit cannot be
  rendered.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/baselineDiff.ts
- src/session/features/incomingChanges.ts
- src/session/features/viewState.ts
tested_in_files:
- test/integration/realWindowGaps.ts
- test/session/baselineDiff.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host posts the baseline rendering while the side-by-side diff is on

### Normative behavior

While the side-by-side diff is on for a tracked file in a trusted workspace and markdownOkfSchemaStudio.preview.showIncomingChanges is not false, the host SHALL post to the page the text at the last commit rendered like the page content with its blocks numbered by the lines of that text, together with the line hunks between that text and the shown text, again when the shown text or the commit changes, and SHALL post an empty baseline when the file is not known to Git or the text at the last commit cannot be rendered.

### Scenario (nominal): The baseline follows the shown text

| Input | Outcome |
| --- | --- |
| The side-by-side diff on, a tracked file in a trusted workspace | the host posts previewBaselineDiff with the HEAD text rendered like the page content and the hunks between it and the shown text |
| The shown text changes | a new message with new hunks; the same HEAD text is not rendered again |
| The HEAD commit changes | a new message with the new rendering |
| The Diff button off | the baseline is still posted |
| The diff switched off | nothing more is read, rendered or posted |

### Scenario (boundary): No baseline

| Input | Outcome |
| --- | --- |
| A file Git does not know | an empty baseline (no html, no hunk) |
| A HEAD text that cannot be rendered, or whose content would carry a script or a nonce | an empty baseline, so the page keeps the green bars |
| markdownOkfSchemaStudio.preview.showIncomingChanges off, or an untrusted workspace | nothing is read or posted |
| Raw scripts in the HEAD text | never part of the posted html |
### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-195: the host that posts the green-bar ranges, which also carries this message.
- SwRS-MDOKFSTUDIO-REVIEW-010: the hunks.
- SwRS-MDOKFSTUDIO-REVIEW-007: the messages.

### Verification notes

- Method: test/session/reviewReqIncoming.requirements.test.ts (unit tests `CR147: with the side-by-side diff on, the page gets the HEAD rendering and the hunks, rendered once per HEAD text`, `CR147: the baseline does not depend on the Diff button and is empty for an untracked file`, `CR147: a HEAD text that cannot be rendered is posted empty, so the page keeps the green bars`, `CR147: with preview.showIncomingChanges off nothing is read or posted`, `CR147: the page message switches the diff on the session`) and test/session/baselineDiff.test.ts (`CR147: the HEAD text is rendered as the content of the page, its blocks numbered by the lines of that text`, `CR147: raw scripts of the HEAD text never reach the page`); real window: test/integration/realInput scenario incoming-changes (side-by-side part).
- Criteria: The posted message equals the expected html and hunks; the render stub is called once per HEAD text; the empty baseline is posted for an untracked or unrenderable HEAD; nothing is posted when the setting is off.
