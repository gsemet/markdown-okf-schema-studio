---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-185
uuid: 1c3776ec-e3f0-4aec-bdfc-0b39b07cd08d
title: The opening watcher reads each new Markdown text tab and puts Studio in
  its place after the migration
description: When a text tab opens, the opening watcher SHALL read its line from
  the selection of its editor, SHALL ask the opening policy after the editor
  association migration is done, SHALL never replace a tab that was open when
  the watcher started, and SHALL put Studio in the place of the text tab when
  the policy says so.
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
- src/host-vscode/openingWatcher.ts
tested_in_files:
- test/host/openingWatcher.test.ts
- test/integration/openAtLine.test.ts
default_owner_email: gaetan@xeberon.net
---

## The opening watcher reads each new Markdown text tab and puts Studio in its place after the migration

### Normative behavior

When a text tab opens, the opening watcher SHALL read its line from the selection of its editor, SHALL ask the opening policy after the editor association migration is done, SHALL never replace a tab that was open when the watcher started, and SHALL put Studio in the place of the text tab when the policy says so.

### Scenario (nominal): Nominal case

- GIVEN the extension is active and Open search results in Studio is on
- WHEN a Markdown file opens in a new text tab with the selection at line 12
- THEN a Studio tab opens in that group waiting for line 12 and the text tab is closed

### Scenario (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| a plain opening, no setting on | the text tab stays |
| a plain opening, Open Markdown files in Studio on | a Studio tab opens with no line, the text tab closes |
| an opening right at the start, the migration turns the setting on | the watcher reads the setting after the migration and replaces the tab |
| a diff tab, a restored tab, a non-.md file | unchanged |
| a text editor Studio opened, a Studio tab closed just before | unchanged |

### Verification notes

- Method: test/host/openingWatcher.test.ts (the real activation against the fake vscode module). The line is the selection of a change of kind Command (trial T2, VS Code 1.147.0: a jump selects with that kind, a plain reopening restores the cursor with no kind), read within 200 ms after the editor shows; the wait for the editor ends after 3 s or when the tab closes. A text editor reopened as text from a Studio tab is kept when the opening is plain (trial T3c); Open With > Text Editor is replaced (T3d, known limit). The opening that triggered the activation is never replaced, since no signal tells it from a restored tab (trial T11 not run as an automated test): see docs/known-limitations.md.
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
