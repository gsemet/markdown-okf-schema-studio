---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-122
uuid: 0afbefdb-4e78-4b0b-ae8f-b8ec72244483
title: "A pairing message for another document is ignored"
description: "When previewPairing names another document, document version or request
  than the page's, the extension SHALL not change the Anchor button."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
tested_in_files:
- test/page/runtimePageControls.test.ts
default_owner_email: gaetan@xeberon.net
---

## A pairing message for another document is ignored

### Normative behavior

When previewPairing names another document, document version or request than the page's, the extension SHALL not change the Anchor button.

### Scenario (refusal): Foreign document

| Input | Outcome |
| --- | --- |
| a message for another document identity | the button does not change |
| a message for another document version or another request | the button does not change |

### Scenario (nominal): Own document

- GIVEN a message for the page's document
- WHEN the page receives it
- THEN the button follows it

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-120: what an accepted pairing message does to the Anchor button

### Verification notes

- Method: test/page/runtimePageControls.test.ts (T38 a paired preview keeps the anchor button enabled, and a foreign previewPairing is ignored; the own-document case is T38 an unpaired preview disables the anchor button and a previewPairing message re-enables it; the other version and request rows are by code only)
- Criteria: The host-message filter drops messages whose identifiers differ.
