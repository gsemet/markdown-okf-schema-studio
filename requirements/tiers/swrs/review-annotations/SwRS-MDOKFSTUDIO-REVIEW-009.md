---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-009
uuid: 330b13b9-086b-446d-9c63-e192b4001065
title: A changed block shows as a side-by-side diff
description: While the side-by-side diff is on and a baseline for the current
  render is held, the page SHALL replace each block that changed since the last
  commit by a card with the rendered block at the last commit on the left and
  the rendered current block on the right, mark the removed words on the left
  and the added words on the right, leave the left empty for an added block and
  show a removed block with an empty right side, leave unchanged blocks as they
  are, and show the original blocks again when the diff goes off or the baseline
  is stale.
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
- src/page/features/hostHandlers.ts
- src/page/modules/sideBySide.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/integration/realWindowGaps.ts
- test/page/runtimePageControls.test.ts
- test/page/sideBySideCards.test.ts
- test/visual/capture_sbs_checks.py
default_owner_email: gaetan@xeberon.net
---

## A changed block shows as a side-by-side diff

### Normative behavior

While the side-by-side diff is on and a baseline for the current render is held, the page SHALL replace each block that changed since the last commit by a card with the rendered block at the last commit on the left and the rendered current block on the right, mark the removed words on the left and the added words on the right, leave the left empty for an added block and show a removed block with an empty right side, leave unchanged blocks as they are, and show the original blocks again when the diff goes off or the baseline is stale.

### Scenario (nominal): Cards for changed blocks

| Input | Outcome |
| --- | --- |
| A block with changed words | a card of two columns: the block at the last commit on the left with the removed words marked, the current block on the right with the added words marked; the original block is hidden |
| An added block | a card with an empty left side |
| A removed block | a card with the removed block on the left and an empty right side, in the place of the removal |
| A list or table with a changed item or row | one card with the whole list or table on both sides |
| An unchanged block | shown as it is, no card |

### Scenario (boundary): Going back

| Input | Outcome |
| --- | --- |
| The diff switched off, or edit mode on | the cards go away and the original blocks show again |
| A baseline of an older render than the page content | no card is made |
| A baseline whose hunks are empty | no card is made |
| The page content is patched | the cards are made again from the held baseline when it matches the new content |
### Related requirements

- SwRS-MDOKFSTUDIO-REVIEW-010: the hunks.
- SwRS-MDOKFSTUDIO-REVIEW-005: the word marks.
- SwRS-MDOKFSTUDIO-REVIEW-006: the baseline it shows.
- SwRS-MDOKFSTUDIO-REVIEW-207: the green bars it replaces while on.

### Verification notes

- Method: real window: scenario incoming-changes of test/integration/realInput (reads the cards, the marked words and the hidden originals in a VS Code window), test/page/runtimePageControls.test.ts (`CR147: a baseline sent while the diff is off is answered by telling the host it is off`), test/core/preview/previewStyles.test.ts (cards CSS).
- Criteria: In the real window the page holds one card per changed block with the expected sides and marked words, none for unchanged blocks, and the original blocks are back when the diff is off.
