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
default_owner_email: gaetan@xeberon.net
---

## The opening watcher reads each new Markdown text tab and puts Studio in its place after the migration

### Normative behavior

When a text tab opens, the opening watcher SHALL read its line from the selection of its editor, SHALL ask the opening policy after the editor association migration is done, SHALL never replace a tab that was open when the watcher started, and SHALL put Studio in the place of the text tab when the policy says so.

### Scenario (nominal)

- GIVEN the extension is active and Open search results in Studio is on
- WHEN a Markdown file opens in a new text tab with the selection at line 12
- THEN a Studio tab opens in that group waiting for line 12 and the text tab is closed

### Scenario (boundary)

| Input | Outcome |
| --- | --- |
| a plain opening, no setting on | the text tab stays |
| a plain opening, Open Markdown files in Studio on | a Studio tab opens with no line, the text tab closes |
| an opening right at the start, the migration turns the setting on | the watcher reads the setting after the migration and replaces the tab |
| a diff tab, a restored tab, a non-.md file | unchanged |
| a text editor Studio opened, a Studio tab closed just before | unchanged |

### Verification notes

- Method: test/host/openingWatcher.test.ts (the real activation against the fake vscode module). The editor of a restored tab and the trial signals (T2 jump versus reopening, T3 reopened as text, T11 the opening that triggered the activation) are decided by the real VS Code trials of round 4: today the activation opening is never replaced.
- Criteria: each outcome of the tables above holds.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
