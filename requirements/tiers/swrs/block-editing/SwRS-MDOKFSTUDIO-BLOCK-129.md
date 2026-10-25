---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-129
uuid: 992cc351-93f8-4496-af91-9aa83cbf9711
title: "The page applies a move result only for its own render"
description: "When a previewBlockMoveResult names another document, revision or request
  than the page shows, the page SHALL ignore it."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-014
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
tested_in_files:
- test/page/runtimeBlockMoves.test.ts
---

## The page applies a move result only for its own render

### Normative behavior

When a previewBlockMoveResult names another document, revision or request than the page shows, the page SHALL ignore it.

### Scenario (nominal): A result for the render the page shows

- GIVEN a previewBlockMoveResult whose documentId, revision and requestId are those of the page's render
- WHEN it arrives
- THEN it is handled, and a refusal reason is shown next to the insert point bar

### Scenario (refusal): A result for another context

| Input | Outcome |
| --- | --- |
| a result whose requestId differs | ignored: no status is shown and no focus changes |
| a result that names another document | ignored |
| a result that names another revision | ignored |

### Verification notes

- Method: Unit test `T36: a refused move says why next to the bar; a result of another context is ignored` in test/page/runtimeBlockMoves.test.ts (both scenarios; the differing requestId case is the one run, the document and revision rows follow from the same addressing rule); the addressing rule is `previewBlockMoveResult: render` in src/core/protocol/hostToPage.ts.
- Criteria: createHostMessageFilter accepts the message only for the render the page shows.
