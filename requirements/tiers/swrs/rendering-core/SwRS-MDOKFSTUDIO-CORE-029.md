---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-029
uuid: 2abc210d-c78d-4c7b-8f8f-cba7bcb151b1
title: Style headings
description: When the preview shows headings, the extension SHALL use weight
  600, h1 at 2em and h2 at 1.5em with a bottom rule, h3 at 1.25em and h4 at 1em,
  and top-level headings SHALL clear floating figures.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Style headings

### Normative behavior

When the preview shows headings, the extension SHALL use weight 600, h1 at 2em and h2 at 1.5em with a bottom rule, h3 at 1.25em and h4 at 1em, and top-level headings SHALL clear floating figures.

### Scenario: Nominal style headings

- GIVEN an h1 and an h2
- WHEN they are shown
- THEN both carry a bottom rule at their sizes

### Scenario: Boundary or refusal of style headings

- GIVEN a heading after a floating figure
- WHEN it is shown
- THEN it starts below the figure

### Verification notes

- Method: test
- Criteria: Computed heading sizes, weight and clear match.
