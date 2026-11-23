---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-174
uuid: 1f50dd96-1777-4de7-888d-9428d75cabf4
title: The Opening Files settings choose when Studio takes the place of a text
  editor
description: When the reader opens the settings editor, the extension SHALL
  contribute the group Opening Files with the settings
  open.searchResultsInStudio (on by default) and open.markdownFilesInStudio (off
  by default), host-only and of window scope, each described in at most 700
  characters with what On and Off do.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The Opening Files settings choose when Studio takes the place of a text editor

### Normative behavior

When the reader opens the settings editor, the extension SHALL contribute the group Opening Files with the settings open.searchResultsInStudio (on by default) and open.markdownFilesInStudio (off by default), host-only and of window scope, each described in at most 700 characters with what On and Off do.

### Scenario (nominal): The group in the settings editor

- GIVEN the packaged extension installed and no Opening Files setting stored
- WHEN the reader opens the settings editor and looks for the Markdown OKF-Schema Studio settings
- THEN the group Opening Files (order 6) lists open.searchResultsInStudio on and open.markdownFilesInStudio off

### Scenario (boundary): The generated schema

| Input | Outcome |
| --- | --- |
| the settings registry and the contributed configuration of package.json | the same, byte for byte (`just check-settings`) |
| a markdownDescription of the group | at most 700 characters, naming what On and Off do |
| the scope of each setting | window, host-only: the page never reads them |
| the default of open.searchResultsInStudio | one constant of the registry, so the default is changed in one place |

### Verification notes

- Method: unit test "the Opening Files settings are two booleans: the search results one on by default, the every-file one off" in test/core/configuration/settingsRegistry.test.ts, and the byte-for-byte schema test of the same file.
- Method: unit test "contributes only opt-in Markdown OKF-Schema Studio commands" in test/security/package-contract.test.ts (the category title, its order and its keys).
- Criteria: the section open exists with two boolean settings and the stated defaults; the contributed schema equals the registry.
- Boundary: in round 1 the settings are read by the migration only; the opening watcher that reads them ships in a later round of the change.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview and gets the raw text on request
<!-- okf:links:end -->
