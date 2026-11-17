---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-049
uuid: 609dba02-00c4-4562-b3c6-b4a359da72fa
title: The status names the render state and shows pending, failed and recovered
  notices
description: "When the preview shows a render state, the extension SHALL label the
  status Preview pending, Preview ready, Preview is stale, Preview unavailable, Preview
  source missing or Preview recovered, show a pending notice for a slow render and
  leave a page that is already shown unchanged while a render is pending, and ignore
  a pending notice whose visible field is not a boolean or whose label or message
  is not a string or is longer than 500 characters."
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-003
- StRS-MDOKFSTUDIO-LIFE-005
- StRS-MDOKFSTUDIO-LIFE-007
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewStatus.ts
- src/core/preview/styles/pageChromeStyles.ts
- src/page/features/statusRegion.ts
- src/session/features/pageDocument.ts
- src/session/sessionFactory.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/host/lifeReq.requirements.test.ts
- test/host/previewTiming.test.ts
- test/integration/dirtySnapshots.test.ts
- test/integration/lifecycle.test.ts
- test/integration/stockCoexistence.test.ts
- test/node-services/build/buildQueue.test.ts
- test/page/lifeReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LIFE-055
---

## The status names the render state and shows pending, failed and recovered notices

### Normative behavior

When the preview shows a render state, the extension SHALL label the status Preview pending, Preview ready, Preview is stale, Preview unavailable, Preview source missing or Preview recovered, show a pending notice for a slow render and leave a page that is already shown unchanged while a render is pending, and ignore a pending notice whose visible field is not a boolean or whose label or message is not a string or is longer than 500 characters.

### Scenario (nominal): Pending page of a new side preview

- GIVEN a new side preview whose group lock is still being set
- WHEN the panel is created for an existing Markdown file
- THEN its page holds a status region data-sphinx-preview-status=pending with the label Preview pending and the message Waiting for the first render, until the render starts

### Scenario (nominal): Good render

| Input | Outcome |
| --- | --- |
| a successful first render | the status region says Preview ready |
| a successful render after a failure, for example a stale page after a simulated render failure and the text edited back to a renderable state | the status region says Preview recovered and the page shows the new content |
| a render after a successful one | the label is Preview ready |

### Scenario (refusal): Failed render

| Input | Outcome |
| --- | --- |
| a render that fails over a shown page, including a failing render of the document that is shown | the last good page stays with Preview is stale |
| a render that fails with nothing shown | Preview unavailable |
| a render that fails for a document the preview has not shown yet, for example a side preview of A switched to B whose render throws | the page shows Preview unavailable with the error message, and nothing from A |
| a missing source | Preview source missing |
| waiting for a render | Preview pending |

### Scenario (boundary): Pending render

| Input | Outcome |
| --- | --- |
| a ready page and a render queued by typing, the queue enters the debouncing and building phases | the page document is not reassigned, nothing moves, and the internal status is pending |
| a preview that shows no render and the queue enters a pending phase, or the render of the file is requested and no page is shown yet | the pending status page is shown with the pending message instead; it takes the message Waiting for the latest edit. when the queue starts collecting the edit |
| a queued edit inside the debounce delay (the debouncing phase) | the message is Waiting for the latest edit. |
| the delay elapsed and the render started (the building phase) | the message is Rendering the active buffer. |
| a ready page and a render that stays pending for 1.5 seconds | a small notice with the label Preview pending and the latest pending message appears, and is hidden again before the patch of the result, or when the render fails |
| a render that ends in less than 1.5 seconds | the notice never appears |
| the 1.5 second delay elapses while the page document is loading | the notice is posted when the page reports ready |
| the render finished before the page reported ready | no notice is posted |
| a new page document is assigned over a visible notice and a render that needs a full page load | the notice flags are cleared and the new page shows no notice |
| an assignment of the identical page string | nothing is cleared, because the host ignores an identical assignment |

### Scenario (boundary): Position of the pending notice

| Input | Outcome |
| --- | --- |
| the notice shown with the toolbar expanded | the notice is fixed 14 px from the right and 160 px from the top (right under the four rows of the toolbar), with pointer-events none and no effect on the layout |
| the toolbar collapsed to its first row | the notice sits 62 px from the top |

### Scenario (nominal): Show and hide

- GIVEN a valid previewPendingOverlay message with visible true, a label and a message of at most 500 characters
- WHEN the page applies it
- THEN the notice appears with the label and the message
- AND a valid message with visible false removes the notice

### Scenario (refusal): Oversized or malformed field

| previewPendingOverlay field | Outcome |
| --- | --- |
| A message of 501 characters | No notice appears and an existing one is unchanged |
| A label of 501 characters | The page ignores the message |
| A visible field that is not a boolean | The page ignores the message |
| A label or message that is not a string | The page ignores the message |

### Scenario (boundary): Longest accepted text

| previewPendingOverlay field | Outcome |
| --- | --- |
| A message of 500 characters | The notice is accepted |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-059: the status region is a polite live region of plain text, which the notice also uses.

### Verification notes

- Method: test/integration/stockCoexistence.test.ts (Open With stayed loading while MyST was rendering) asserts a pending status page while the first render is delayed; the exact message is untested.
- Method: test/integration/lifecycle.test.ts (the stale lifecycle render, lifecycle recovery) and test/integration/dirtySnapshots.test.ts (Preview is stale in the page, recovery after the failing directive) cover good render and failed render; the label wording has no unit test of PREVIEW_STATUS_LABELS.
- Method: test/node-services/build/buildQueue.test.ts "retains a successful result as stale after a failed newer build" (recovery).
- Method: test/host/previewTiming.test.ts "a render pending for 1500 ms over a ready page shows the overlay, hidden again before the patch", "a render that finishes before 1500 ms never shows the overlay" and "a preview disposed while its render is debouncing, building or awaiting a patch acknowledgement stays silent" (pending render over a shown page, the 1.5 second notice); the nothing-shown case is by reading handleQueueState, the pending message texts of the pending render are untested there, and the clearing of the notice on assignment is by reading assignWebviewHtml.
- Method: test/host/lifeReq.requirements.test.ts "pending renders say Waiting for the latest edit. then Rendering the active buffer.", "a notice that falls due while the page is loading is posted when the page is ready" and "a failed render of a document that was not shown yet shows Preview unavailable" (checked by reading handleQueueState, armPendingOverlay, onReady and showRenderFailure); the page half of the notice is test/page/pageMessages.test.ts (host message previewPendingOverlay).
- Method: test/core/preview/previewStyles.test.ts "T43: the pending overlay is fixed, pointer-transparent and never in flow" and "T08: zoom scales the content font size and the column width together" (the 160 px and 62 px offsets).
- Criteria: the aside of the status region holds the label of the status; the first page holds the pending status region; htmlAssignments does not grow while the render is pending; overlay.message holds the text of the phase; pendingOverlayShown is 1 for the slow case and 0 for the fast case; overlay.due is set by the timer and consumed by onReady; overlay.visible and overlay.due are false after a changed assignment; status is error when the stage identity differs from the session document; the status is recovery once and success afterwards; the stylesheet rule holds position fixed, pointer-events none and the two offsets.
- Method: test/page/lifeReq.requirements.test.ts "the page ignores a pending notice with an oversized or malformed field" (all scenarios: a message of 501 characters shows no notice, a message of 500 characters is accepted, a valid hide removes the notice). Checked by reading applyPendingOverlay in src/page/features/statusRegion.ts.
- Criteria: applyPendingOverlay returns before changing the DOM for an invalid state.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-003](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-003.md): The side preview follows the active file and refreshes on demand
  - [StRS-MDOKFSTUDIO-LIFE-005](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-005.md): The preview updates in place as the text and its dependencies change
  - [StRS-MDOKFSTUDIO-LIFE-007](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-007.md): The reader knows the render state and why a preview has no source
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LIFE-055](SwRS-MDOKFSTUDIO-LIFE-055.md): The page ignores a pending notice with an oversized or malformed field
<!-- okf:links:end -->
