---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-182
uuid: 726b9b1b-7e50-4337-9d1c-0dc2c55963b4
title: Link and history navigation from a Studio tab opens Studio at the target
  line when Markdown files open in Studio
description: When the reader follows a link or a Back or Next move from a Studio
  Open With tab to a Markdown file and Open Markdown files in Studio is on, the
  session SHALL ask the host to show that document in a Studio tab at the target
  line, and in every other case SHALL ask the host to show it in a text editor
  as before.
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
- src/host-vscode/vscodeHost.ts
- src/session/features/studioNavigation.ts
tested_in_files:
- test/host/putStudioInPlace.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Link and history navigation from a Studio tab opens Studio at the target line when Markdown files open in Studio

### Normative behavior

When the reader follows a link or a Back or Next move from a Studio Open With tab to a Markdown file and Open Markdown files in Studio is on, the session SHALL ask the host to show that document in a Studio tab at the target line, and in every other case SHALL ask the host to show it in a text editor as before.

### Scenario (nominal): Nominal case

- GIVEN a Studio Open With tab, Open Markdown files in Studio on, a link to second.md#part
- WHEN the reader follows the link
- THEN the session asks the host to show second.md in Studio at the first line of the heading Part, and no text editor opens

### Scenario (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| the side preview, the setting off, or a target that is not a .md file | a text editor opens as before |
| a link with no line | Studio opens the file at its restored place |
| Back or Next to another Markdown document | Studio opens it at the stored line |
| Back or Next inside the same document | the page scrolls to the stored line, as before |

### Verification notes

- Method: test/session/toolbarReq.requirements.test.ts ("a link to a Markdown file from a Studio tab opens Studio at the marker line when Markdown files open in Studio", "a link keeps opening a text editor for the side preview, a non-Markdown target or the setting off", "Back to another Markdown document from a Studio tab opens Studio at the stored line; a move inside the document stays a source scroll").
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
