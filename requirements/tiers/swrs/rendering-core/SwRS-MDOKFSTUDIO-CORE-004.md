---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-004
uuid: 8287f398-3420-4bb1-9645-f371208b98ba
title: Map a multi-line block to its end line
description: When a mapped block spans several source lines, the extension SHALL
  give it an end line in addition to its start line.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-003; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-003
default_owner_email: gaetan@xeberon.net
---

## Map a multi-line block to its end line

### Normative behavior

When a mapped block spans several source lines, the extension SHALL give it an end line in addition to its start line.

### Scenario: Nominal map a multi-line block to its end line

- GIVEN a code fence on lines 5 to 9
- WHEN it is rendered
- THEN the block carries start line 5 and end line 9

### Scenario: Boundary or refusal of map a multi-line block to its end line

- GIVEN a one-line paragraph
- WHEN it is rendered
- THEN the block carries its start line and no larger end line

### Verification notes

- Method: Unit test "multiline blocks retain their full mapped source range" in test/core/render/mystFeatures.test.ts
- Criteria: Multi-line blocks expose their full source range; single-line blocks do not exceed it.
