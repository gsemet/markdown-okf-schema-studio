---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-016
uuid: 593b5571-4f9b-49ef-9bc8-57d6d3ceaeb3
title: Limit the include budget per render
description: When a render has expanded 2000 includes or 10 Mi characters of
  included text, the extension SHALL list one budget warning and leave the
  remaining includes as placeholders.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-013; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-013
default_owner_email: gaetan@xeberon.net
---

## Limit the include budget per render

### Normative behavior

When a render has expanded 2000 includes or 10 Mi characters of included text, the extension SHALL list one budget warning and leave the remaining includes as placeholders.

### Scenario: Nominal limit the include budget per render

- GIVEN a document with 2001 include directives
- WHEN it is rendered
- THEN 2000 are expanded, the rest are placeholders and one budget warning is listed

### Scenario: Boundary or refusal of limit the include budget per render

- GIVEN a document within both limits
- WHEN it is rendered
- THEN no budget warning is listed

### Verification notes

- Method: Unit test "include fan-out stops at the budget with one diagnostic" in test/core/render/includeBudget.test.ts
- Criteria: One "Include budget exhausted" warning appears at the limit and none below it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-002](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-002.md): A writer composes a document from included files
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-013](SwRS-MDOKFSTUDIO-CORE-013.md): Includes are bounded by depth, budget, size and allowed roots
<!-- okf:links:end -->
