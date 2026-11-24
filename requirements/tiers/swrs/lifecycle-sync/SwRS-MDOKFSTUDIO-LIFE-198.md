---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-198
uuid: 5276be3c-5149-41f4-81f6-eb4538d42a23
title: Open in Studio at This Line opens a Studio tab at the caret's line and
  keeps the text tab
description: When the reader runs Open in Studio at This Line on a Markdown text
  editor, the extension SHALL open a Studio tab of the file in the text editor's
  group with the caret's line revealed and marked, and SHALL close no tab.
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
- src/host-vscode/openInStudioAtLine.ts
tested_in_files:
- test/host/studioLine.test.ts
- test/integration/openAtLineStudio.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## Open in Studio at This Line opens a Studio tab at the caret's line and keeps the text tab

### Normative behavior

When the reader runs Open in Studio at This Line on a Markdown text editor, the extension SHALL open a Studio tab of the file in the text editor's group with the caret's line revealed and marked, and SHALL close no tab.

### Scenario (nominal): Nominal case

- GIVEN a Markdown text editor of a.md in group 2 with the caret on line 4
- WHEN the reader runs Open in Studio at This Line
- THEN a Studio tab of a.md opens in group 2 and reveals and marks line 4, and the text tab stays open

### Scenario (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| a Studio tab of the file is open in another group | it is revealed in its own group and given the line; no second tab opens |
| the active tab is a Studio tab, there is no editor, or the file is not Markdown | an information message tells the reader to open a Markdown file as text; nothing opens |
| the open fails | an error message names the file |
| the manifest | the command is in the palette for Markdown text editors only and in the title overflow of a Markdown text editor, with no default keybinding and no opening setting |
| any case | no tab is closed |

### Verification notes

- Method: test/host/studioLine.test.ts and test/security/package-contract.test.ts.
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
