---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-001
uuid: 17d05bcd-1f17-46dd-91d8-0ebe90496ad2
title: The extension activates only on its own entry points
description: When VS Code loads the extension manifest, the extension SHALL
  declare VS Code 1.95 as its lowest supported version and as its only
  activation events the two Studio commands, the Studio Open With editor and the
  Studio preview panel serializer, and contribute no command whose identifier
  starts with markdown. and no language and no grammar, so that the built-in
  Markdown support is neither activated nor replaced.
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
- test/integration/stockCoexistence.test.ts
- test/security/lifeReq.requirements.test.ts
- test/security/package-contract.test.ts
default_owner_email: gaetan@xeberon.net
---

## The extension activates only on its own entry points

### Normative behavior

When VS Code loads the extension manifest, the extension SHALL declare VS Code 1.95 as its lowest supported version and as its only activation events the two Studio commands, the Studio Open With editor and the Studio preview panel serializer, and contribute no command whose identifier starts with markdown. and no language and no grammar, so that the built-in Markdown support is neither activated nor replaced.

### Scenario (nominal): A Studio command runs

- GIVEN VS Code started and no Studio entry point used yet
- WHEN the reader runs Open Preview to Side from the Command Palette
- THEN the extension activates and the command runs

### Scenario (boundary): A Markdown file alone

- GIVEN VS Code started with a Markdown file open in a text editor and no Studio entry point used
- WHEN the reader only reads and edits the file
- THEN the extension stays inactive: package.json lists the four activation events and no onLanguage or workspaceContains event (deduced from the manifest, not run)

### Scenario (boundary): Manifest contract

| Input | Outcome |
| --- | --- |
| engines field of the manifest | engines.vscode is ^1.95.0 |
| a VS Code older than 1.95, a reader tries to install the extension | VS Code refuses the install because the engine range is not met (deduced from VS Code behaviour, not run) |
| contributes section serialized | no markdown. identifier among the contributed commands (unit test "contributes only opt-in Markdown OKF-Schema Studio commands") |
| built-in Markdown extension, its commands read | the Studio command id is not among them (integration test test/integration/stockCoexistence.test.ts) |
| contributes section read | no languages key and no grammars key (unit test "contributes only opt-in Markdown OKF-Schema Studio commands") |
| the Studio installed beside the built-in Markdown extension | the built-in Markdown language and grammar are untouched, because the Studio contributes none |

### Verification notes

- Method: test/security/lifeReq.requirements.test.ts, unit test "the extension activates only on its commands, its Open With editor and panel restore" (A Studio command runs, A Markdown file alone: reads package.json activationEvents, onCommand for the two commands, onCustomEditor, onWebviewPanel) and "the extension declares VS Code 1.95 as its minimum version" (Manifest contract, engine row and older-VS-Code row: reads package.json).
- Method: test/security/package-contract.test.ts, unit test "contributes only opt-in Markdown OKF-Schema Studio commands" (Manifest contract: no markdown. identifier, no languages and no grammars key).
- Method: test/integration/stockCoexistence.test.ts (Manifest contract: the Studio command id is not among the built-in Markdown commands).
- Criteria: package.json activationEvents holds exactly four entries; engines.vscode equals ^1.95.0; no contributed command id starts with markdown.; contributes.languages and contributes.grammars are undefined.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-001](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-001.md): A writer opens previews beside the editor or as tabs, beside the built-in preview
<!-- okf:links:end -->
