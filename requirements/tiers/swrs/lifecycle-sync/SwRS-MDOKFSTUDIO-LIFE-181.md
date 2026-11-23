---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-181
uuid: e82cc284-f3a8-4d13-9f90-3b69d3cded03
title: A requested line reaches the page once it is ready and wins over the
  restored reading place
description: When the side preview that follows the editor holds a requested
  line, the session SHALL post the previewRevealLine message to its page once
  the page is ready and only once, SHALL post it at once when the page is
  already ready, and the requested line SHALL win over the reading place the
  page restored for its document. The requested line SHALL belong to a document
  and an age, and the session SHALL post it only to a visible page that shows
  that document, and only within 5 seconds, and the line SHALL take the anchor
  except in the if-off-screen mode, where the editor leads.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A requested line reaches the page once it is ready and wins over the restored reading place

### Normative behavior

When the side preview that follows the editor holds a requested line, the session SHALL post the previewRevealLine message to its page once the page is ready and only once, SHALL post it at once when the page is already ready, and the requested line SHALL win over the reading place the page restored for its document. The requested line SHALL belong to a document and an age, and the session SHALL post it only to a visible page that shows that document, and only within 5 seconds, and the line SHALL take the anchor except in the if-off-screen mode, where the editor leads.

### Scenario (nominal): Nominal case

- GIVEN a side preview that follows the editor, asked to mark line 42 of its document while its page is not ready
- WHEN the page reports ready
- THEN previewRevealLine with line 42 is posted once and becomes the anchor of the next render, so the line wins over the restored reading place

### Scenario (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| the page is already ready | the line is posted at once |
| a line below 1, not an integer or not a number | the message is refused by the router and nothing moves |
| a pending line older than 5 seconds | it is dropped |
| a pending line taken | it is taken once |
| the page shows another document than the line's | the line waits for the page of its document, or is dropped by a switch to a third one |
| the page is hidden | the line waits for the page to report ready again |
| the if-off-screen mode | the line takes no anchor |

### Verification notes

- Method: test/core/protocol/hostToPage.test.ts, test/page/pageMessages.test.ts and test/session/toolbarReq.requirements.test.ts ("a requested line waits for the page to be ready, is posted once and becomes the anchor", "a requested line is posted at once when the page is already ready").
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview and gets the raw text on request
<!-- okf:links:end -->
