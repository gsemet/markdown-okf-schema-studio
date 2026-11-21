---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-221
uuid: bf0870c9-173a-4aed-beee-fe6b036a5ccd
title: A span of removed lines gets a red marker with a tooltip between the
  blocks around it
description: When lines were removed since the last commit with no line left in
  their place, the page SHALL show a red removed-lines marker in the change
  column between the blocks around the removal, with a tooltip in the page's
  tooltip style reading Removed lines 12–14 since last commit, or Removed line
  12 since last commit for a single line, from the line numbers of the last
  commit, and SHALL show no marker while the Diff button is off or in edit mode.
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
- SwRS-MDOKFSTUDIO-REVIEW-207
- SwRS-MDOKFSTUDIO-REVIEW-214
- SwRS-MDOKFSTUDIO-REVIEW-220
derived_by: []
implemented_in_files:
- src/core/preview/styles/commentStyles.ts
- src/page/modules/incomingChanges.ts
tested_in_files:
- test/core/preview/changeBarTooltipStyles.test.ts
- test/page/modules/incomingChanges.test.ts
- test/session/reviewReqIncoming.requirements.test.ts
- test/visual/changeBarCardScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A span of removed lines gets a red marker with a tooltip between the blocks around it

### Normative behavior

When lines were removed since the last commit with no line left in their place, the page SHALL show a red removed-lines marker in the change column between the blocks around the removal, with a tooltip in the page's tooltip style reading Removed lines 12–14 since last commit, or Removed line 12 since last commit for a single line, from the line numbers of the last commit, and SHALL show no marker while the Diff button is off or in edit mode.

### Scenario (nominal): A removed span between two blocks

- GIVEN the Diff button on, a tracked file where the last commit had lines 12 to 14 that the shown text no longer has, and no line in their place
- WHEN the preview renders
- THEN a red marker sits in the change column between the blocks around the removal, and its tooltip reads Removed lines 12–14 since last commit (Removed line 12 since last commit for one line), from the line numbers of the last commit

### Scenario (boundary): Where the marker sits

| Input | Outcome |
| --- | --- |
| A removal before a mapped block | the marker sits just above that block |
| A removal after the last mapped block | the marker sits just below it |
| A removal of one line | the singular form, Removed line N since last commit |
| A removal that also replaces lines | no removed marker: the replacing block carries a green bar |

### Scenario (refusal): No marker with Diff off, in edit mode, or for malformed data

- GIVEN the Diff button pressed off, edit mode on, or a removed entry that is not made of whole numbers with an end before its start
- WHEN the preview renders
- THEN no marker is shown for it


### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-207: the green bars the marker sits beside.
- SwRS-MDOKFSTUDIO-REVIEW-214: the Diff button that hides the marker.
- SwRS-MDOKFSTUDIO-REVIEW-220: the tooltip style the marker reuses.

### Verification notes

- Method: test/page/modules/incomingChanges.test.ts (unit tests on the removed marker: label, position, tooltip, malformed entries, end of page, edit mode).
- Method: test/session/reviewReqIncoming.requirements.test.ts (the host posts the removed spans of the last commit).
- Method: test/core/preview/changeBarTooltipStyles.test.ts (the marker is red, hidden with the layer, clickable).
- Method: visual scenarios review-annotations/v33-removed-marker-light-900 and v34-removed-marker-dark-900.
- Criteria: the marker exists only for a pure removal, carries the Removed line(s) label of the last commit and disappears with Diff off or in edit mode.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-REVIEW-017](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-017.md): A writer sees which blocks changed since the last commit
- Relates to:
  - [SwRS-MDOKFSTUDIO-REVIEW-207](SwRS-MDOKFSTUDIO-REVIEW-207.md): Changed blocks get a thin change bar that moves nothing, and malformed ranges are ignored
  - [SwRS-MDOKFSTUDIO-REVIEW-214](SwRS-MDOKFSTUDIO-REVIEW-214.md): The Diff button and the showIncomingChanges setting hide the change bars
  - [SwRS-MDOKFSTUDIO-REVIEW-220](SwRS-MDOKFSTUDIO-REVIEW-220.md): A change bar shows the changed lines in a tooltip while the pointer is over it
<!-- okf:links:end -->
