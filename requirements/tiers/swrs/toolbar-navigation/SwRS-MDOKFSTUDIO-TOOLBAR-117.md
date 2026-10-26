---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-117
uuid: 15add456-7bb5-488b-98e9-8f6fc0d08bfc
title: "An in-page anchor scrolls the page to its target at the reading line"
description: "When the reader follows an anchor, the extension SHALL post navigateAnchor
  with the anchor value and, when the shown document has a matching fragment, its
  start and end source lines, so that the page scrolls the mapped block of the source
  line, else the element whose id equals the decoded value or the value without a
  leading ^, to the reading line below the band, and does not scroll when no block
  or element is found or the request names another render."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/scrollCore.ts
- src/session/features/links.ts
tested_in_files:
- test/integration/previewHistory.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/scenarioDefinitions2.ts
---

## An in-page anchor scrolls the page to its target at the reading line

### Normative behavior

When the reader follows an anchor, the extension SHALL post navigateAnchor with the anchor value and, when the shown document has a matching fragment, its start and end source lines, so that the page scrolls the mapped block of the source line, else the element whose id equals the decoded value or the value without a leading ^, to the reading line below the band, and does not scroll when no block or element is found or the request names another render.

### Scenario (nominal): Heading anchor

- GIVEN an anchor #target on a heading at line 5
- WHEN it is followed
- THEN navigateAnchor carries the value, sourceLine 5 and sourceEndLine 5, and the page scrolls so the block is at the reading line

### Scenario (nominal): Unknown fragment

- GIVEN an anchor #generated-id with no source line
- WHEN it is followed
- THEN navigateAnchor carries the value only

### Scenario (boundary): Where the page scrolls to

| navigateAnchor received | Outcome |
| --- | --- |
| a source line that a mapped block holds | the page scrolls so the block is at the reading line |
| #^note with no source line, and an element with id note | the page scrolls to that element |
| a value that cannot be decoded, with a source line that maps to a block | the page scrolls to that block (the source line wins) |

### Scenario (refusal): Invalid, unknown and stale requests

| navigateAnchor received | Outcome |
| --- | --- |
| an unknown id | the page does not scroll |
| a malformed escape | the page does not scroll |
| an escape still left after four decoding rounds, such as %41 | the page does not scroll, whatever its digits |
| a stale request id (another render) | the page does not scroll |

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-059: a followed anchor with a matching fragment is recorded in the history at its line.
- SwRS-MDOKFSTUDIO-TOOLBAR-090: the host accepts a request as an anchor only when it has the anchor shape.

### Verification notes

- Method: test/integration/previewHistory.test.ts (heading anchor #target and #note-label recorded, navigateAnchor carries the lines).
- Method: test/page/runtimeScroll.test.ts (page scrolls to host-approved anchors; ignores invalid, unknown and stale requests, including an escape left after four rounds such as %41; id fallback; source line wins).
- Method: visual scenario in test/visual/scenarioDefinitions2.ts, toolbar-navigation/v30-back-enabled-after-anchor-light-900 (the target heading is near the top of the pane).
- Criteria: the lines are those of markdownFragmentRange; the scroll position is the target top minus the reading offset, within the scroll limits; no scroll without a target element.
