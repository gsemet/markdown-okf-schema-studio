---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-051
uuid: b0ac71a2-523f-4f9b-a0b7-62a3a186bd59
title: "The label rename message is validated and answered"
description: "When the page posts previewLabelRename, the extension SHALL accept it
  only with a source line, two valid label names and the current render, and answer
  previewLabelRenameResult with the same edit id."
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
- src/session/features/sourceEdits.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/integration/labelRename.test.ts
default_owner_email: gaetan@xeberon.net
---

## The label rename message is validated and answered

### Normative behavior

When the page posts previewLabelRename, the extension SHALL accept it only with a source line, two valid label names and the current render, and answer previewLabelRenameResult with the same edit id.

### Scenario (nominal): A valid message is answered with its edit id
- GIVEN a previewLabelRename with line, old name, new name and edit id for the current render
- WHEN the host receives it
- THEN previewLabelRenameResult carries the same edit id with ok, remainingRefs or reason

### Scenario (boundary): Accepted shape
| Field of previewLabelRename | Accepted | Otherwise |
| --- | --- | --- |
| line | A source line (a safe integer, 1 or more) | The validator rejects the message |
| oldName | A valid label name: letters, digits and `_ . : -`, 100 characters at most | The validator rejects the message |
| newName | The same pattern and bound as oldName | The validator rejects the message |
| editId | Optional; repeated in the answer, which the page matches by it | Not checked by the validator |
| render identity | The current render | The gate drops or refuses the message (see SwRS-MDOKFSTUDIO-TRUST-065) |

### Scenario (refusal): Malformed or stale messages
- GIVEN a message with an invalid name or no line
- WHEN the host receives it
- THEN it is rejected by the validator and nothing in the document changes
- GIVEN a message from a stale render
- WHEN the host receives it
- THEN the host answers with ok false and the reason The label is no longer on that line. Refresh the preview., and nothing in the document changes

### Related requirements
- SwRS-MDOKFSTUDIO-MYST-045: what the host does with an accepted rename.
- SwRS-MDOKFSTUDIO-MYST-038: the field that posts the message and shows the answer.

### Verification notes
- Method: test/core/protocol/pageToHost.test.ts ("previewLabelRename validates the line and both label names": accepted shape, malformed messages)
- Method: test/integration/labelRename.test.ts (run(): a valid message is answered with its edit id; stale render)
- Criteria: Result fields are ok, remainingRefs, reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-090](../trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->
