---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-064
uuid: 1d597905-032f-4665-a9c7-5c7a1f98ee29
title: Flush and editor watch messages are addressed by their own id
description: When the page receives previewFlushEdit or previewEditorWatch, it
  SHALL accept it only if its flushId or its editId respectively is a string,
  whatever the document the message names.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/page/runtimeBlockEditor.test.ts
default_owner_email: gaetan@xeberon.net
---

## Flush and editor watch messages are addressed by their own id

### Normative behavior

When the page receives previewFlushEdit or previewEditorWatch, it SHALL accept it only if its flushId or its editId respectively is a string, whatever the document the message names.

### Scenario (nominal): String identifier

- GIVEN a previewFlushEdit message with flushId f1
- WHEN it arrives
- THEN it reaches its handler whatever the render it names

### Scenario (nominal): Watch naming the next document

- GIVEN a previewEditorWatch naming the next document, while the host already follows another document
- WHEN it arrives
- THEN the page answers it

### Scenario (refusal): Missing identifier

| Input | Outcome |
| --- | --- |
| a previewEditorWatch without editId | goes to unhandled; the page ignores it |
| a previewFlushEdit without a flushId | goes to unhandled; the page ignores it |

### Verification notes

- Method: Unit test test/core/protocol/hostToPage.test.ts (the payload checks refuse what the page used to refuse; each rule matches the identity it names, and only that) covers the string identifier and the missing identifier.
- Method: Unit test test/page/runtimeBlockEditor.test.ts (STAB-03: a watch sent while the host already follows another document is still answered) covers the watch naming the next document.
- Criteria: These two messages are matched by their own identifier (own-id addressing) because the host may already follow the next document.
