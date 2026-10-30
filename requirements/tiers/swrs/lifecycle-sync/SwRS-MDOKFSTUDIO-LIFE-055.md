---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-055
uuid: 81df6a2e-5963-4078-9e49-1be45b31d3ac
title: The page ignores a pending notice with an oversized or malformed field
description: When the page receives a pending notice whose visible field is not
  a boolean or whose label or message is longer than 500 characters, the
  extension SHALL ignore it.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-007
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/statusRegion.ts
tested_in_files:
- test/page/lifeReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## The page ignores a pending notice with an oversized or malformed field

### Normative behavior

When the page receives a pending notice whose visible field is not a boolean or whose label or message is longer than 500 characters, the extension SHALL ignore it.

### Scenario (nominal): Show and hide

- GIVEN a valid previewPendingOverlay message with visible true, a label and a message of at most 500 characters
- WHEN the page applies it
- THEN the notice appears with the label and the message
- AND a valid message with visible false removes the notice

### Scenario (refusal): Oversized or malformed field

| previewPendingOverlay field | Outcome |
| --- | --- |
| A message of 501 characters | No notice appears and an existing one is unchanged |
| A label of 501 characters | The page ignores the message |
| A visible field that is not a boolean | The page ignores the message |
| A label or message that is not a string | The page ignores the message |

### Scenario (boundary): Longest accepted text

| previewPendingOverlay field | Outcome |
| --- | --- |
| A message of 500 characters | The notice is accepted |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-059: a host message is accepted only when it is registered and addressed to the shown render

### Verification notes

- Method: test/page/lifeReq.requirements.test.ts "the page ignores a pending notice with an oversized or malformed field" (all scenarios: a message of 501 characters shows no notice, a message of 500 characters is accepted, a valid hide removes the notice). Checked by reading applyPendingOverlay in src/page/features/statusRegion.ts.
- Criteria: applyPendingOverlay returns before changing the DOM for an invalid state.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-007](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-007.md): The reader knows the render state and why a preview has no source
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
<!-- okf:links:end -->
