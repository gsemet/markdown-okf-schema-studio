---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-031
uuid: 613ef830-cae4-48be-9f33-636d3747085f
title: Raw HTML tables keep cell attributes
description: When a document contains a raw HTML table, the extension SHALL
  render its cells with rowspan and colspan from 1 to 999, align, scope, simple
  class names and title, and SHALL remove script, style, iframe, svg, form,
  embed and object elements with their content.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Raw HTML tables keep cell attributes

### Normative behavior

When a document contains a raw HTML table, the extension SHALL render its cells with rowspan and colspan from 1 to 999, align, scope, simple class names and title.

### Scenario: Spans preserved

- GIVEN a raw table with colspan=2 and rowspan=2 cells
- WHEN the preview is rendered
- THEN the cells span as written

### Scenario: Span limits

- GIVEN cells with colspan=999, colspan=1000 and rowspan=0
- WHEN the preview is rendered
- THEN 999 is kept and the out-of-range values 1000 and 0 are not applied

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Spans 1 to 999 kept, others refused.
