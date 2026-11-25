---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-175
uuid: e80ee6ef-2b72-4c4e-ab91-0accd0c9b5f6
title: The editor association of Markdown files is migrated to the Studio
  setting once per scope
description: When the extension activates and the user or the workspace settings
  hold the workbench.editorAssociations entry *.md naming the Studio editor, the
  extension SHALL remove that entry from that scope, turn on
  open.markdownFilesInStudio in the same scope, remember the scope as migrated,
  show the migration notice, and leave every other entry untouched.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LIFE-195; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
superseded_by:
- SwRS-MDOKFSTUDIO-LIFE-195
---

## The editor association of Markdown files is migrated to the Studio setting once per scope

### Normative behavior

When the extension activates and the user or the workspace settings hold the workbench.editorAssociations entry *.md naming the Studio editor, the extension SHALL remove that entry from that scope, turn on open.markdownFilesInStudio in the same scope, remember the scope as migrated, show the migration notice, and leave every other entry untouched.

### Scenario (nominal): A user association is moved

- GIVEN the user settings hold workbench.editorAssociations with *.md naming the Studio editor and *.png naming another editor, and the user scope is not marked
- WHEN the extension activates
- THEN open.markdownFilesInStudio is on in the user settings, the association keeps only *.png, the user scope is marked, and one notice names the setting and Open as Text

### Scenario (boundary): What is migrated and what is not

| Input | Outcome |
| --- | --- |
| an association that held only the Studio entry | the key is removed from that scope |
| the legacy array form with filenamePattern *.md and the Studio view type | that entry is removed, the others kept |
| *.md naming another editor, another pattern such as docs/*.md, or an unexpected value | nothing is written and the scope is not marked |
| a scope already marked as migrated | nothing is written, so an association the reader adds again is respected |
| the user and the workspace scope both hold the entry | each is migrated and marked on its own, with one notice for the activation |
| the Studio setting write fails | the association is kept, the scope is not marked, the failure is logged and a warning is shown once, and the other scope still migrates |
| a host without the setting writer | nothing happens |
| any key other than the Studio settings and workbench.editorAssociations, or a markdown.preview setting | the host writer refuses it without writing |

### Verification notes

- Method: unit tests in test/core/configuration/editorAssociationMigration.test.ts (the rewrite of each shape) and test/session/associationMigration.test.ts (scopes, marks, order of the writes, failure, notice, host without a writer).
- Method: host tests in test/host/openAtLine.test.ts ("the setting writer maps the user and workspace values, and writes to the matching target", "the setting writer refuses the built-in Markdown preview settings and any other key without writing"), and the writers assertion of test/core/configuration/settingsRegistry.test.ts (vscodeHost.ts is the only source naming ConfigurationTarget).
- Criteria: after one migration the Studio setting is on and the association gone, the mark is stored per scope, the Studio setting is written before the association is removed, and a second activation writes nothing.
- Boundary: the migration against a real settings.json (user and workspace, reload) is a trial of a later round; here the writer is a fake.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
- Superseded by:
  - [SwRS-MDOKFSTUDIO-LIFE-195](SwRS-MDOKFSTUDIO-LIFE-195.md): The editor association of Markdown files is restored once from the retired Studio setting
<!-- okf:links:end -->
