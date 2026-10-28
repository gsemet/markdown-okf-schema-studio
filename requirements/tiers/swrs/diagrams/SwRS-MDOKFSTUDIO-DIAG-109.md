---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-109
uuid: d5a9a538-e723-45d8-9c4c-6d3063ddb046
title: Results of an older render stage are dropped
description: When JAR results belong to a render stage that is no longer the
  current one, the extension SHALL drop them.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-105; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-105
default_owner_email: gaetan@xeberon.net
---

## Results of an older render stage are dropped

### Normative behavior

When JAR results belong to a render stage that is no longer the current one, the extension SHALL drop them.

### Scenario: Newer render

- GIVEN a render superseded while its diagrams were drawing
- WHEN the old results arrive
- THEN they are not applied

### Scenario: Current render

- GIVEN the current render
- WHEN its results arrive
- THEN they are applied

### Verification notes

- Method: Unit test `JAR results of a render that is no longer the current one are dropped` in `test/session/diagReq.plantuml.requirements.test.ts`.
- Criteria: Only the current stage is updated.
