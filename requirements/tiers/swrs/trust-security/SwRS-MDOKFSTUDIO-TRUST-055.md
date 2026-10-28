---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-055
uuid: cd1f6be4-4ce4-4572-bd4f-42fd574d936f
title: The validator of the message type must accept the payload
description: When the host receives a page message, it SHALL accept it only if
  the validator registered for its type accepts the message.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The validator of the message type must accept the payload

### Normative behavior

When the host receives a page message, it SHALL accept it only if the validator registered for its type accepts the message.

### Scenario: Valid payload

- GIVEN a previewHistoryGo message with direction back
- WHEN it is checked
- THEN it is accepted

### Scenario: Refused payload

- GIVEN the same message with direction sideways
- WHEN it is checked
- THEN it is refused

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-026: copied text bound
- SwRS-MDOKFSTUDIO-TOOLBAR-083: link discovery bound
- SwRS-MDOKFSTUDIO-MYST-051: label rename validation
- SwRS-MDOKFSTUDIO-DIAG-050: PlantUML include bound

### Verification notes

- Method: Unit tests test/core/protocol/pageToHost.test.ts and test/core/protocol/pageStateMessages.test.ts (rejects a message the validator refuses; each message type has its own bounds test, for example previewHistoryGo accepts only back or forward).
- Criteria: The bounds of each type are specified with the feature that sends it, for example SwRS-MDOKFSTUDIO-CODE-026 for the copied text, SwRS-MDOKFSTUDIO-TOOLBAR-083 for link discovery, SwRS-MDOKFSTUDIO-DIAG-050 for a PlantUML include and SwRS-MDOKFSTUDIO-BLOCK-244 and SwRS-MDOKFSTUDIO-BLOCK-245 for the editor and flush identifiers.
