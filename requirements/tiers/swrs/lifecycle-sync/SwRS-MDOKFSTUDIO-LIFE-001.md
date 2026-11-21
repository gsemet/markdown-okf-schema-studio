---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-001
uuid: 17d05bcd-1f17-46dd-91d8-0ebe90496ad2
title: The extension activates only on its own entry points
description: "When VS Code loads the extension manifest, the extension SHALL declare
  VS Code 1.95 as its lowest supported version and as its only activation events the
  two Studio commands, the Studio Open With editor, the Studio preview panel serializer
  and the Markdown language, and start only its registrations and the editor association
  migration at activation, leaving the preview engine, the watchers and the diagnostics
  to the first Studio preview, and contribute no command whose identifier starts with
  markdown. and no language and no grammar, so that the built-in Markdown support
  is neither activated nor replaced, and declare that it supports the VS Code Agents
  window, so that VS Code enables it there without a user setting."
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/extension.ts
- src/host-vscode/activation.ts
tested_in_files:
- test/host/openAtLine.test.ts
- test/integration/stockCoexistence.test.ts
- test/security/lifeReq.requirements.test.ts
- test/security/package-contract.test.ts
- test/security/trustReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LIFE-171
---

## The extension activates only on its own entry points

### Normative behavior

When VS Code loads the extension manifest, the extension SHALL declare VS Code 1.95 as its lowest supported version and as its only activation events the two Studio commands, the Studio Open With editor, the Studio preview panel serializer and the Markdown language, and start only its registrations and the editor association migration at activation, leaving the preview engine, the watchers and the diagnostics to the first Studio preview, and contribute no command whose identifier starts with markdown. and no language and no grammar, so that the built-in Markdown support is neither activated nor replaced, and declare that it supports the VS Code Agents window, so that VS Code enables it there without a user setting.

### Scenario (nominal): A Studio command runs

- GIVEN VS Code started and no Studio entry point used yet
- WHEN the reader runs Open Preview to Side from the Command Palette
- THEN the extension activates and the command runs

### Scenario (boundary): A Markdown file alone

- GIVEN VS Code started with a Markdown file open in a text editor and no Studio entry point used
- WHEN the reader only reads and edits the file
- THEN the extension activates through onLanguage:markdown but starts no service: no engine warm-up, no stem-root or conf.py watcher and no diagnostics until the first Studio preview (host test "an activation with no preview starts no service, the first preview starts them once, a second one does not again"); package.json lists the five activation events, onLanguage:markdown is the only language event and there is no workspaceContains event

### Scenario (boundary): Manifest contract

| Input | Outcome |
| --- | --- |
| engines field of the manifest | engines.vscode is ^1.95.0 |
| a VS Code older than 1.95, a reader tries to install the extension | VS Code refuses the install because the engine range is not met (deduced from VS Code behaviour, not run) |
| contributes section serialized | no markdown. identifier among the contributed commands (unit test "contributes only opt-in Markdown OKF-Schema Studio commands") |
| built-in Markdown extension, its commands read | the Studio command id is not among them (integration test test/integration/stockCoexistence.test.ts) |
| contributes section read | no languages key and no grammars key (unit test "contributes only opt-in Markdown OKF-Schema Studio commands") |
| the Studio installed beside the built-in Markdown extension | the built-in Markdown language and grammar are untouched, because the Studio contributes none |

### Scenario (nominal): Studio in the Agents window

- GIVEN the packaged extension installed in VS Code, and no user setting about the Agents window
- WHEN the reader opens the Agents window (the companion window for agent sessions)
- THEN VS Code enables the extension there, because `capabilities.agentsWindow.supported` in package.json is true, and Open With offers Markdown OKF-Schema Studio for a Markdown file

### Scenario (boundary): What VS Code reads

| Input | Outcome |
| --- | --- |
| capabilities.agentsWindow.supported in package.json | true |
| A manifest without the declaration, or with another value | The check fails (VS Code then disables the installed extension in the Agents window unless the user lists it in the extensions.supportAgentsWindow setting) |
| The extension loaded from a development path | Not a test of the declaration: VS Code enables a development extension in the Agents window either way |

### Verification notes

- Method: test/security/lifeReq.requirements.test.ts, unit test "the extension activates only on its commands, its Open With editor, panel restore and Markdown files" (A Studio command runs, A Markdown file alone: reads package.json activationEvents, onCommand for the two commands, onCustomEditor, onLanguage:markdown, onWebviewPanel) and "the extension declares VS Code 1.95 as its minimum version" (Manifest contract, engine row and older-VS-Code row: reads package.json).
- Method: test/security/package-contract.test.ts, unit test "contributes only opt-in Markdown OKF-Schema Studio commands" (Manifest contract: no markdown. identifier, no languages and no grammars key).
- Method: test/integration/stockCoexistence.test.ts (Manifest contract: the Studio command id is not among the built-in Markdown commands).
- Criteria: package.json activationEvents holds exactly five entries, onLanguage:markdown the only language one; engines.vscode equals ^1.95.0; no contributed command id starts with markdown.; contributes.languages and contributes.grammars are undefined.
- Method: Unit test "the manifest declares support for the Agents window" in test/security/trustReq.requirements.test.ts, which asserts the declaration in package.json for an extension with a main entry point.
- Method: Manual demonstration on VS Code 1.144: a VSIX without the declaration is absent from the Agents window, the same VSIX with it is enabled and opens a Markdown file through Open With. Not automated: a test host loads the extension from its development path, which skips the gate.
- Criteria: package.json declares capabilities.agentsWindow.supported as true.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-001](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-001.md): A writer opens previews beside the editor or as tabs, beside the built-in preview
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LIFE-171](SwRS-MDOKFSTUDIO-LIFE-171.md): The manifest declares Agents window support
<!-- okf:links:end -->
