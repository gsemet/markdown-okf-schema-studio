---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-181
uuid: e82cc284-f3a8-4d13-9f90-3b69d3cded03
title: A requested line reaches the page once it is ready and wins over the
  restored reading place
description: When a Studio session holds a requested line, the session SHALL
  post the previewRevealLine message to its page once the page is ready and only
  once, SHALL post it at once when the page is already ready, and the requested
  line SHALL win over the reading place the tab restores for its document.
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
- src/host-vscode/activation.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/host/openAtLine.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A requested line reaches the page once it is ready and wins over the restored reading place

### Normative behavior

When a Studio session holds a requested line, the session SHALL post the previewRevealLine message to its page once the page is ready and only once, SHALL post it at once when the page is already ready, and the requested line SHALL win over the reading place the tab restores for its document.

### Scenario (nominal): Nominal case

- GIVEN a Studio tab opening for a file at line 42, whose page is not ready
- WHEN the page reports ready
- THEN previewRevealLine with line 42 is posted once and becomes the anchor of the next render, so the line wins over the restored reading place

### Scenario (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| the page is already ready | the line is posted at once |
| a line below 1, not an integer or not a number | the message is refused by the router and nothing moves |
| a pending line older than 5 seconds | it is dropped |
| a pending line taken | it is taken once |

### Verification notes

- Method: test/core/protocol/hostToPage.test.ts, test/page/pageMessages.test.ts, test/session/toolbarReq.requirements.test.ts ("a requested line waits for the page to be ready, is posted once and becomes the anchor", "a requested line is posted at once when the page is already ready") and test/host/openAtLine.test.ts (the pending-line window, the live-session delivery, "a Studio tab opened by Open With takes the pending line of its document").
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
