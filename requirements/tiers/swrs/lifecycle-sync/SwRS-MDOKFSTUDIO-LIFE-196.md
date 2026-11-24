---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-196
uuid: c6f82beb-ad33-4862-a898-36abcd504cc5
title: A link, Back or Next from a Studio tab opens the target at its line or
  anchor
description: "When the reader follows a link to a Markdown file, or Back or Next to
  a place in another Markdown file, in a Studio tab, the extension SHALL hand the
  target's line or anchor to the Studio tab that shows the target: it SHALL reveal
  a Studio tab of the target already open in any group in its own group instead of
  opening a second one, and SHALL hand a pending line to a new Studio tab once, removing
  it as soon as it is delivered."
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
- src/host-vscode/activation.ts
- src/host-vscode/vscodeHost.ts
- src/session/features/history.ts
- src/session/features/links.ts
tested_in_files:
- test/core/navigation/pendingLine.test.ts
- test/host/studioLine.test.ts
- test/integration/openAtLineStudio.test.ts
- test/session/studioTabNavigation.test.ts
default_owner_email: gaetan@xeberon.net
---

## A link, Back or Next from a Studio tab opens the target at its line or anchor

### Normative behavior

When the reader follows a link to a Markdown file, or Back or Next to a place in another Markdown file, in a Studio tab, the extension SHALL hand the target's line or anchor to the Studio tab that shows the target: it SHALL reveal a Studio tab of the target already open in any group in its own group instead of opening a second one, and SHALL hand a pending line to a new Studio tab once, removing it as soon as it is delivered.

### Scenario (nominal): Nominal case

- GIVEN a Studio tab of a.md and a link to b.md#heading, where the heading is on line 5
- WHEN the reader follows the link, or Back or Next to that place
- THEN the host is asked to open b.md with line 5; a Studio tab of b.md open in any group is revealed in its own group and given the line, and otherwise the new Studio tab takes the pending line once when it opens

### Scenario (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| a link with a marker line `#L3` | line 3 is handed |
| a link with neither anchor nor marker | line 1 is handed |
| a Studio tab of the target is open in another group | it is revealed in its group; no second tab opens |
| the target opens as a text editor | the pending line is dropped and nothing else changes |
| the pending line is taken by a Studio tab | it is removed and a later opening gets none |
| the open fails | the pending line is dropped |
| the target is not a Markdown file | no Studio hand-off is made |
| a text tab of the target is open | it stays; no tab is closed |

### Verification notes

- Method: test/core/navigation/pendingLine.test.ts, test/host/studioLine.test.ts and test/session/studioTabNavigation.test.ts.
- Criteria: each outcome of the tables above holds. The real-window behaviour of each way of opening is measured by test/integration/openAtLine.test.ts (probe, CR-483).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
