---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-015
uuid: 04e7e73d-57df-4049-a49e-4809e6f56719
title: Map included blocks to the include directive
description: When a block comes from an included file, the extension SHALL map
  it to the lines of the `{include}` directive in the host document and mark it
  as included, also for nested includes.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-012; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-012
default_owner_email: gaetan@xeberon.net
---

## Map included blocks to the include directive

### Normative behavior

When a block comes from an included file, the extension SHALL map it to the lines of the `{include}` directive in the host document and mark it as included, also for nested includes.

### Scenario: Nominal map included blocks to the include directive

- GIVEN an include on line 7 of the host document
- WHEN it is rendered
- THEN every block of the included file carries line 7 and the included mark

### Scenario: Boundary or refusal of map included blocks to the include directive

- GIVEN an included file that includes another file
- WHEN it is rendered
- THEN blocks of the inner file carry the outer directive line and the included mark

### Verification notes

- Method: Unit test "included blocks map to the directive lines only" in test/core/render/includeMapping.test.ts
- Criteria: Included blocks carry the host directive line and the included attribute at any depth.
