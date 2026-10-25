---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-062
uuid: 0365d54f-23e9-40b6-9851-d85db455f883
title: A properties table message needs string markup
description: When the page receives previewPropertiesTable, it SHALL accept it
  only if its markup is a string.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
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
