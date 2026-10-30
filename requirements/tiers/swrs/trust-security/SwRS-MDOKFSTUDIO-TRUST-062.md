---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-062
uuid: 0365d54f-23e9-40b6-9851-d85db455f883
title: A properties table message needs string markup
description: When the page receives previewPropertiesTable, it SHALL accept it
  only if its markup is a string.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
default_owner_email: gaetan@xeberon.net
---

## A properties table message needs string markup

### Normative behavior

When the page receives previewPropertiesTable, it SHALL accept it only if its markup is a string.

### Scenario (nominal): String markup

- GIVEN a previewPropertiesTable message for the current render with a string markup
- WHEN it arrives
- THEN it reaches its handler

### Scenario (refusal): Other markup

- GIVEN the same message with markup null
- WHEN it arrives
- THEN it goes to unhandled

### Verification notes

- Method: Unit test test/core/protocol/hostToPage.test.ts (the payload checks refuse what the page used to refuse) covers both scenarios.
- Criteria: The markup is built by the host, not taken from the document.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-009](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-009.md): What the page and the host exchange is checked and never applied to another version
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
<!-- okf:links:end -->
