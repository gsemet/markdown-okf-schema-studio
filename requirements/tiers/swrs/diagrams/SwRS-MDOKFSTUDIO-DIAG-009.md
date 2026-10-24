---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-009
uuid: 895ffe95-2339-420d-bd1a-380f4f3740d5
title: Unchanged Mermaid diagrams are not drawn again
description: When the page needs a Mermaid diagram whose source and theme
  colours equal those of an earlier drawing, it SHALL show that drawing without
  running Mermaid again.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Unchanged Mermaid diagrams are not drawn again

### Normative behavior

When the page needs a Mermaid diagram whose source and theme colours equal those of an earlier drawing, it SHALL show that drawing without running Mermaid again.

### Scenario: Replaced node

- GIVEN a Mermaid diagram already drawn, then a content update that replaces its node with the same source under the same theme
- WHEN the page draws the new node
- THEN the earlier picture is shown and Mermaid is not run

### Scenario: Changed source or theme

- GIVEN a drawn diagram whose source or theme colours changed
- WHEN the page draws it
- THEN Mermaid runs again; a theme attribute change that leaves the colours as they were draws nothing

### Known issues

- Known issue: The plan actions keep, reuse and render are wired in mermaidPreview.ts, which has no unit test.

### Verification notes

- Method: Unit tests of the drawing cache (PERF-07); the wiring in the browser entry point is covered by the real VS Code scenario only.
- Criteria: Same source and theme give no second run; a different source or theme gives a new run.
