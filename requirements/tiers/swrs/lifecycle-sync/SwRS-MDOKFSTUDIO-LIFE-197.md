---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-197
uuid: 5354b274-c2bf-4e32-af8f-d49b88f59c42
title: The history of a link followed from a Studio tab
description: When the reader follows a link from a Studio tab to a Markdown
  file, the extension SHALL record the move in the Studio tab's navigation
  history only when the target opens in a Studio tab, sharing that history with
  a Studio tab the link created and appending the move to the own history of a
  Studio tab already open.
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
  title: Nominal case
- id: S2
  title: Boundary cases
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/history.ts
- src/session/features/links.ts
tested_in_files:
- test/integration/openAtLineStudio.test.ts
- test/session/studioTabNavigation.test.ts
default_owner_email: gaetan@xeberon.net
---

## The history of a link followed from a Studio tab

### Normative behavior

When the reader follows a link from a Studio tab to a Markdown file, the extension SHALL record the move in the Studio tab's navigation history only when the target opens in a Studio tab, sharing that history with a Studio tab the link created and appending the move to the own history of a Studio tab already open.

### Scenario S1 (nominal): Nominal case

- GIVEN a Studio tab of a.md
- WHEN the reader follows a link to b.md and b.md opens in a new Studio tab
- THEN a.md's history records the move and the new tab shares the same history, so Back in either tab returns to the place left

### Scenario S2 (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| the target already has a Studio tab | that tab keeps its own history and gains the place left and the target; the source records the move in its own |
| the target opens as a text editor | nothing is recorded in any history |
| the host reports no outcome | counted as a text editor: nothing is recorded |
| the link target is not Markdown | no history entry |
| a fixed preview that is not a Studio tab | it records anchor jumps only (SwRS-MDOKFSTUDIO-TOOLBAR-059) |
| the side preview that follows the editor | it records as before |

### Verification notes

- Method: test/session/studioTabNavigation.test.ts.
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
