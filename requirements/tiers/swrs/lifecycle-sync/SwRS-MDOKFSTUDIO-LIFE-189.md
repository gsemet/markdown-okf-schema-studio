---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-189
uuid: d96d7a58-6d0b-4959-a4e3-0a436b43d769
title: The line marker of the side preview goes on an edit of the document or a
  switch of file
description: While the side preview shows a line marker, the host SHALL tell the
  page to remove it when the text editor edits the marked document or when the
  side preview switches to another document, and SHALL keep it through scrolls
  and cursor moves.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
scenarios:
- id: S1
  title: A typed word removes the marker
- id: S2
  title: Lifetime
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/page/features/hostHandlers.ts
- src/session/features/scrollSync.ts
- src/session/hostEvents.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/integration/sidePreviewJump.test.ts
- test/page/runtimeLineMarker.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The line marker of the side preview goes on an edit of the document or a switch of file

### Normative behavior

While the side preview shows a line marker, the host SHALL tell the page to remove it when the text editor edits the marked document or when the side preview switches to another document, and SHALL keep it through scrolls and cursor moves.

### Scenario S1 (nominal): A typed word removes the marker

- GIVEN the side preview showing a line marker on `doc.md`
- WHEN the text editor edits `doc.md`
- THEN the host posts previewLineMarkerClear and the page removes the marker

### Scenario S2 (boundary): Lifetime

| Input | Outcome |
| --- | --- |
| a scroll of the editor or of the page, a cursor move | the marker stays |
| an edit the page itself applied | the host posts no clear (the page already removed it) |
| an edit of another document | the marker stays |
| a switch of document | the marker is removed and does not come back on returning |
| a Studio tab | it is asked for no marker by a jump, so it has none to clear |

### Verification notes

- Method: test/session/toolbarReq.requirements.test.ts, test/page/runtimeLineMarker.test.ts, test/core/protocol/hostToPage.test.ts and test/integration/sidePreviewJump.test.ts (J4).
- Criteria: each outcome of the table above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
