---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-058
uuid: ff98b55c-a588-4832-a89f-eae2b2823118
title: "The host accepts only back or forward"
description: "When a previewHistoryGo message reaches the host, the extension SHALL
  accept it only when its direction is back or forward and it names the current render."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host accepts only back or forward

### Normative behavior

When a previewHistoryGo message reaches the host, the extension SHALL accept it only when its direction is back or forward and it names the current render.

### Scenario (nominal): Valid direction

- GIVEN directions back and forward
- WHEN the validator runs
- THEN both are accepted

### Scenario (refusal): Invalid direction

- GIVEN the directions up, an empty string and a missing direction
- WHEN the validator runs
- THEN all are refused

### Scenario (refusal): Another render

- GIVEN a previewHistoryGo that names a render other than the shown one
- WHEN the host receives it
- THEN it is refused by the render gate (see SwRS-MDOKFSTUDIO-TRUST-065)

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (valid and invalid direction: previewHistoryGo accepts only back or forward)
- Method: the render gate (previewHistoryGo: render in pageMessages.ts) is untested
- Criteria: isOneOf(direction, back, forward).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-009](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-009.md): The reader goes Back and Next through followed links without losing typed text
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
<!-- okf:links:end -->
