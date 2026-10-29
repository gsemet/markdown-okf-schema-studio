---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-171
uuid: 87dfafb4-430b-4bb0-9ad8-f6f9f62d5274
title: The manifest declares Agents window support
description: The extension SHALL declare in its manifest that it supports the VS
  Code Agents window, so that VS Code enables it in that window without a user
  setting.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
annotation_exemption: true
exemption_reason: "Declared in package.json, which carries no marker and is outside
  the source directories. No implementation marker is possible."
derived_by: []
implemented_in_files: []
tested_in_files:
- test/security/trustReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The manifest declares Agents window support

### Normative behavior

The extension SHALL declare in its manifest that it supports the VS Code Agents window, so that VS Code enables it in that window without a user setting.

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

- Method: Unit test "the manifest declares support for the Agents window" in test/security/trustReq.requirements.test.ts, which asserts the declaration in package.json for an extension with a main entry point.
- Method: Manual demonstration on VS Code 1.144: a VSIX without the declaration is absent from the Agents window, the same VSIX with it is enabled and opens a Markdown file through Open With. Not automated: a test host loads the extension from its development path, which skips the gate.
- Criteria: package.json declares capabilities.agentsWindow.supported as true.
