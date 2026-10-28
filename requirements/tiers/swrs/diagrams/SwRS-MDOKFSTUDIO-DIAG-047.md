---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-047
uuid: 79ecfed3-7024-4b26-8c38-4eeb4271c3c2
title: Include answers are matched by their edit id
description: "When the page receives a previewPlantUmlIncludeResult, it SHALL give
  the answer to the request that has the same edit id and ignore an answer whose edit
  id matches no waiting request or repeats an answered one."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-090; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-TRUST-090
default_owner_email: gaetan@xeberon.net
---

## Include answers are matched by their edit id

### Normative behavior

When the page receives a previewPlantUmlIncludeResult, it SHALL give the answer to the request that has the same edit id and ignore an answer whose edit id matches no waiting request or repeats an answered one.

### Scenario: Matching answer

- GIVEN a request with edit id plantuml-1 in flight
- WHEN an ok answer with that edit id arrives
- THEN the bundle receives the file id and text

### Scenario: Stale and repeated answers

- GIVEN an answer for plantuml-99, and a second answer for plantuml-1
- WHEN they arrive
- THEN both are ignored

### Verification notes

- Method: Unit test of the page file requests.
- Criteria: Only the first answer for a live edit id is delivered.
