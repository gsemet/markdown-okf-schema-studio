---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-183
uuid: f3c6abbb-3ca3-42f3-acd2-07e0d6532c86
title: The host picks the Studio tab to reveal or opens a new one
description: When the host puts Studio in place for a file, it SHALL reveal the
  Studio tab of that file in the text tab's group when there is one, SHALL
  reveal the most recently active Studio tab of another group for a jump, and
  SHALL open a new Studio tab in the text tab's group for a plain opening or
  when the file has no Studio tab yet.
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
- src/core/navigation/openingPolicy.ts
- src/host-vscode/studioPlacement.ts
tested_in_files:
- test/core/navigation/openingPolicy.test.ts
- test/host/putStudioInPlace.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host picks the Studio tab to reveal or opens a new one

### Normative behavior

When the host puts Studio in place for a file, it SHALL reveal the Studio tab of that file in the text tab's group when there is one, SHALL reveal the most recently active Studio tab of another group for a jump, and SHALL open a new Studio tab in the text tab's group for a plain opening or when the file has no Studio tab yet.

### Scenario (nominal)

- GIVEN a text tab of a file and a Studio tab of the same file in the same group
- WHEN the host puts Studio in place for the file
- THEN the Studio tab is revealed, no new tab opens, and the text tab is closed

### Scenario (boundary)

| Input | Outcome |
| --- | --- |
| a jump and a Studio tab only in another group | the most recently active such tab is revealed (the order the tabs became active, followed by the host) |
| a plain opening and a Studio tab only in another group | a new Studio tab opens in the text tab's group |
| a file with no Studio tab | a new Studio tab opens in the text tab's group, as a preview tab when the text tab was one |

### Verification notes

- Method: test/core/navigation/openingPolicy.test.ts (the four cases of studioTargetFor). The placement itself (reveal, open, close of the text tab) is in src/host-vscode/studioPlacement.ts and is checked by test/host/putStudioInPlace.test.ts (the fake vscode module) and the real VS Code trials of round 4.
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
