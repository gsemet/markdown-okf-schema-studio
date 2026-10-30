---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-060
uuid: fbb9f7d3-f904-467d-a52b-1cfb07b150ff
title: Toctree reversed option flips the order
description: When a toctree has `:reversed:`, the extension SHALL flip the entry
  order.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-057; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-057
default_owner_email: gaetan@xeberon.net
---

## Toctree reversed option flips the order

### Normative behavior

When a toctree has `:reversed:`, the extension SHALL flip the entry order.

### Scenario: Nominal

- GIVEN three entries with `:reversed:`
- WHEN the preview renders
- THEN they appear in reverse order

### Scenario: Boundary or refusal

- GIVEN three entries without it
- WHEN the preview renders
- THEN they keep the written order

### Verification notes

- Method: Unit test "a toctree with :reversed: flips the entry order and keeps the written order otherwise" in test/core/render/renderReq.myst.requirements.test.ts
- Criteria: `:reversed:` flips the order; without it the written order is kept.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-012](../../strs/myst/StRS-MDOKFSTUDIO-MYST-012.md): A toctree shows the linked documents and marks missing ones
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-057](SwRS-MDOKFSTUDIO-MYST-057.md): Toctree lists linked documents and marks missing ones
<!-- okf:links:end -->
