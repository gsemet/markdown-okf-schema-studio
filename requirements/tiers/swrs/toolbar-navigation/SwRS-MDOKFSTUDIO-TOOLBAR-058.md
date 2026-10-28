---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-058
uuid: ff98b55c-a588-4832-a89f-eae2b2823118
title: "The host accepts only back or forward"
description: "When a previewHistoryGo message reaches the host, the extension SHALL
  accept it only when its direction is back or forward and it names the current render."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
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
