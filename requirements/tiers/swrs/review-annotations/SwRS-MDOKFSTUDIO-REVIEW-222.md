---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-222
uuid: d557d011-1402-4034-a7cc-1f793ae923b8
title: A click on a change bar or removed-lines marker opens the side-by-side
  diff of that block only
description: When the reader clicks a change bar or a removed-lines marker
  outside edit mode, the page SHALL show the side-by-side diff card of that
  block or removal only, in place, and SHALL close it on a second click on the
  same bar or marker or on Escape, while the Side-by-side button keeps showing
  every card.
project: markdown-okf-schema-studio
scope: review-annotations
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-017
annotation_exemption: false
exemption_reason:
relates_to:
- SwRS-MDOKFSTUDIO-REVIEW-009
- SwRS-MDOKFSTUDIO-REVIEW-207
- SwRS-MDOKFSTUDIO-REVIEW-214
derived_by: []
implemented_in_files:
- src/core/preview/styles/commentStyles.ts
- src/core/protocol/pageToHost.ts
- src/page/modules/incomingChanges.ts
- src/page/modules/sideBySide.ts
- src/session/features/incomingChanges.ts
- src/session/features/viewState.ts
tested_in_files:
- test/core/preview/changeBarTooltipStyles.test.ts
- test/page/modules/incomingChanges.test.ts
- test/page/sideBySideCards.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
- test/visual/changeBarCardScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A click on a change bar or removed-lines marker opens the side-by-side diff of that block only

### Normative behavior

When the reader clicks a change bar or a removed-lines marker outside edit mode, the page SHALL show the side-by-side diff card of that block or removal only, in place, and SHALL close it on a second click on the same bar or marker or on Escape, while the Side-by-side button keeps showing every card.

### Scenario (nominal): Click a bar, then click it again

- GIVEN the Diff button on, outside edit mode, a block marked as changed
- WHEN the reader clicks its bar, then clicks the same bar again
- THEN the first click shows the side-by-side diff card of that block only, in place, and the second click closes it

### Scenario (boundary): Escape, the removed marker and the global button

| Input | Outcome |
| --- | --- |
| Escape while a single card is open | the card closes |
| A click on a removed-lines marker | the card of that removal opens |
| A click on another bar while one card is open | the card moves to that block |
| The Side-by-side button | shows every card as before, whatever the single card |

### Scenario (refusal): Not in edit mode

- GIVEN edit mode on
- WHEN the reader clicks a bar or a marker
- THEN no card opens, and no baseline is requested from the host


### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-009: the side-by-side card that is reused.
- SwRS-MDOKFSTUDIO-REVIEW-207: the change bar that is clicked.
- SwRS-MDOKFSTUDIO-REVIEW-214: the Diff button that hides the bars.

### Verification notes

- Method: test/page/sideBySideCards.test.ts (unit tests on the single card: open, close, Escape, edit mode, global button, removed marker).
- Method: test/page/modules/incomingChanges.test.ts (click targets, edit mode).
- Method: test/session/reviewReqIncoming.requirements.test.ts (the baseline is requested once, then dropped when the global diff is off).
- Method: visual scenarios review-annotations/v35-change-bar-card-light-900 and v36-change-bar-card-dark-900.
- Criteria: one click shows one card in place, a second click or Escape removes it, the global button is unchanged and edit mode refuses.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-017](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-017.md): A writer sees which blocks changed since the last commit
- Relates to:
  - [SwRS-MDOKFSTUDIO-REVIEW-009](SwRS-MDOKFSTUDIO-REVIEW-009.md): A changed block shows as a side-by-side diff with its word marks, cut by line hunks, and a malformed baseline message is dropped
  - [SwRS-MDOKFSTUDIO-REVIEW-207](SwRS-MDOKFSTUDIO-REVIEW-207.md): Changed blocks get a thin change bar that moves nothing, and malformed ranges are ignored
  - [SwRS-MDOKFSTUDIO-REVIEW-214](SwRS-MDOKFSTUDIO-REVIEW-214.md): The Diff button and the showIncomingChanges setting hide the change bars
<!-- okf:links:end -->
