---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-054
uuid: 0eef9a54-af5a-4c1b-99a4-25decc9b8439
title: Grid columns follow the pane width
description: When the preview pane width changes, the extension SHALL pick grid
  columns by container width (480, 640, 800 px), not the window width.
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
default_owner_email: gaetan@xeberon.net
---

## Grid columns follow the pane width

### Normative behavior

When the preview pane width changes, the extension SHALL pick grid columns by container width (480, 640, 800 px), not the window width.

### Scenario: Nominal

- GIVEN four items at 900 px
- WHEN the preview renders
- THEN they form 2 columns

### Scenario: Boundary or refusal

- GIVEN the same grid at 460 px
- WHEN the preview renders
- THEN they form 1 column, every card inside the pane and the text after the grid intact

### Verification notes

- Method: Unit test "the grid stylesheet collapses to one column in a narrow pane" in test/core/render/gridToctree.test.ts; Visual scenario `myst/v${22 + index}-grid-cards-full-${theme}-${width}` in test/visual/scenarioDefinitions2.ts
- Criteria: One visual family across themes and widths.
