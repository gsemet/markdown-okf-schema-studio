---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-195
uuid: 8e2936c0-9d3e-4a94-a73d-81365463d08a
title: The editor association of Markdown files is restored once from the
  retired Studio setting
description: When the extension activates and the user or the workspace settings
  hold the retired setting open.markdownFilesInStudio turned on, the extension
  SHALL write the workbench.editorAssociations entry *.md naming the Studio
  editor in that scope before it removes the retired setting from that scope,
  leave every other entry untouched, remove the leftover retired settings, and
  show nothing to the reader.
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
  title: A user setting is turned into the association
- id: S2
  title: What is written and what is not
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-LIFE-175
implemented_in_files:
- src/host-vscode/vscodeHost.ts
- src/session/associationMigration.ts
tested_in_files:
- test/core/configuration/editorAssociationMigration.test.ts
- test/host/openAtLine.test.ts
- test/integration/openAtLine.test.ts
- test/integration/openAtLineProbe.test.ts
- test/integration/reverse-migration-suite.ts
- test/session/associationMigration.test.ts
default_owner_email: gaetan@xeberon.net
---

## The editor association of Markdown files is restored once from the retired Studio setting

### Normative behavior

When the extension activates and the user or the workspace settings hold the retired setting open.markdownFilesInStudio turned on, the extension SHALL write the workbench.editorAssociations entry *.md naming the Studio editor in that scope before it removes the retired setting from that scope, leave every other entry untouched, remove the leftover retired settings, and show nothing to the reader.

### Scenario S1 (nominal): A user setting is turned into the association

- GIVEN the user settings hold open.markdownFilesInStudio on and open.searchResultsInStudio, and workbench.editorAssociations with *.png naming another editor
- WHEN the extension activates
- THEN the user settings hold workbench.editorAssociations with *.png kept and *.md naming the Studio editor, neither retired setting is left, and nothing is shown to the reader

### Scenario S2 (boundary): What is written and what is not

| Input | Outcome |
| --- | --- |
| no association in the scope | the association becomes the single entry *.md for the Studio editor |
| an association object without *.md | the entry is added after the others, which keep their order |
| the legacy array form with no *.md item | the item with the Studio view type and the pattern *.md is appended |
| *.md already names the Studio editor, or another editor | nothing is written to the association, the other editor stays, and the retired setting is still removed |
| the user scope and the workspace scope both hold the setting on | each scope gets the association and loses its setting; a workspace that held it off while the user held it on only loses its value, so the user association then applies in that workspace |
| a setting that is off, or open.searchResultsInStudio whatever its value | no association is written and the value is removed from that scope |
| the setting is off in every scope, or was never stored | nothing is written at all |
| the association write fails | the retired setting stays in that scope, the failure is logged, nothing is shown, the other scope still restores, and the next activation tries again |
| the association has any other shape, not an object nor an array | nothing is written there, the retired setting of that scope stays, the cause is logged and nothing is shown |
| a second activation | nothing is written, because the retired setting is the only mark |
| the store keys markdownOkfSchemaStudio.migrations.editorAssociation of an older version | removed from the global and the workspace state when they exist |
| a host without the setting writer | nothing happens |
| any key other than the Studio settings and workbench.editorAssociations, or a markdown.preview setting | the host writer refuses it without writing |

### Verification notes

- Method: unit tests in test/core/configuration/editorAssociationMigration.test.ts (the rewrite of each shape of the association) and test/session/associationMigration.test.ts (each case above, the order of the writes, the failure, the second run, the memory UI port that receives no call).
- Method: host tests in test/host/openAtLine.test.ts ("the setting writer maps the user and workspace values, and writes to the matching target", "the setting writer refuses the built-in Markdown preview settings and any other key without writing"), and the writers assertion of test/core/configuration/settingsRegistry.test.ts (vscodeHost.ts is the only source naming ConfigurationTarget).
- Method: real-window test test/integration/reverse-migration-suite.ts, run by its own launch of test/integration/run-tests.ts (own user-data directory, the user value seeded in settings.json and the workspace value in the .code-workspace file, read back from those files after one activation).
- Criteria: after one activation the association is written before the retired setting is removed, the retired settings are gone, and nothing is shown.
- Boundary: removing a value of a key the manifest no longer declares was proved in a real window; the file that triggers the activation stays a text editor, and the association applies from the next opening.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LIFE-175](SwRS-MDOKFSTUDIO-LIFE-175.md): The editor association of Markdown files is migrated to the Studio setting once per scope
<!-- okf:links:end -->
