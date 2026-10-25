---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-055
uuid: b393a4a7-dd69-4fa5-bf59-357caafaed5b
title: Grid item cards show title, header, body, footer and link
description: When a `{grid-item-card}` is rendered, the extension SHALL show its
  title, an optional header before `^^^`, body and footer after `+++`, and make
  the title one link when `:link:` is given.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-053; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-053
---

## Grid item cards show title, header, body, footer and link

### Normative behavior

When a `{grid-item-card}` is rendered, the extension SHALL show its title, an optional header before `^^^`, body and footer after `+++`, and make the title one link when `:link:` is given.

### Scenario: Nominal

- GIVEN a card with title, header, body and footer
- WHEN the preview renders
- THEN all four parts show

### Scenario: Boundary or refusal

- GIVEN a card with `:link:` and `:link-type: ref`, or without title, link or parts, or whose title holds a link
- WHEN the preview renders
- THEN ref gives a #label link, doc adds .md, an empty card shows an empty body and only one link is made

### Verification notes

- Method: Unit test "a grid-item-card renders header, body, footer and a stretched link" in test/core/render/gridToctree.test.ts
- Criteria: `:link-alt:` is the tooltip.
