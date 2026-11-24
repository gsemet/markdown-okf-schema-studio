---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-176
uuid: 20cd5adc-4417-4c01-bf85-e14424d72750
title: Feature introductions show once and can be shown again
description: When a feature with an introduction first takes effect, the
  extension SHALL show its introduction notice once across sessions and
  workspaces, and when the reader runs Show Feature Introductions Again, the
  extension SHALL forget every shown introduction so that each shows once more.
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
- src/session/featureIntroductions.ts
tested_in_files:
- test/host/openAtLine.test.ts
- test/security/package-contract.test.ts
- test/session/featureIntroductions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Feature introductions show once and can be shown again

### Normative behavior

When a feature with an introduction first takes effect, the extension SHALL show its introduction notice once across sessions and workspaces, and when the reader runs Show Feature Introductions Again, the extension SHALL forget every shown introduction so that each shows once more.

### Scenario (nominal): An introduction shows once

- GIVEN a reader who has not seen the introduction of a feature
- WHEN the feature first takes effect
- THEN the notice is shown once, and the shown key is stored before the notice appears, so a notice that closes by itself is never shown again, in this or another workspace

### Scenario (boundary): Seen, reset and failing store

| Input | Outcome |
| --- | --- |
| the same introduction asked again, in the session or after a restart | nothing is shown |
| the reader runs Show Feature Introductions Again | every introduction key is forgotten and no other stored key, and each introduction shows once more |
| the store cannot write | the failure is logged and the notice still shows once in the session |
| the extension ships no introduction today | the shipped list is empty: nothing is shown, and Show Feature Introductions Again still runs and forgets nothing it holds |

### Verification notes

- Method: unit tests in test/session/featureIntroductions.test.ts (each takes its own list of introductions, since the shipped list is empty; shown once, key stored before the message, nothing in a later session, reset, a store that cannot write, the empty shipped list), host test "Show Feature Introductions Again forgets the stored introductions" in test/host/openAtLine.test.ts, and the manifest test "CR-445: Open as Text is in the palette ..." in test/security/package-contract.test.ts (the command and its palette entry).
- Criteria: one stored key per introduction under the prefix markdownOkfSchemaStudio.introductions., written before the notice; the reset removes those keys only.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader sees the line of a jump marked in the side preview, opens Studio at a line, and gets the raw text on request
<!-- okf:links:end -->
