---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-013
uuid: 82663ea0-4c6f-4d2b-8405-9649543460ce
title: Mermaid element ids stay unique for the page life
description: When the page asks Mermaid to draw a diagram, it SHALL give the
  drawing an element id made of a counter that never repeats during the life of
  the page.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Archived. Not an observable behaviour; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Mermaid element ids stay unique for the page life

### Normative behavior

When the page asks Mermaid to draw a diagram, it SHALL give the drawing an element id made of a counter that never repeats during the life of the page.

### Scenario: Two passes

- GIVEN two successive passes over the same page
- WHEN Mermaid is asked to draw
- THEN every drawing carries a different id of the form myst-mermaid followed by a number

### Scenario: Replaced content

- GIVEN content replaced by a patch so that new diagram nodes appear
- WHEN the new nodes are drawn
- THEN their ids continue the counter and never reuse an earlier id

### Known issues

- Known issue: Untested; the counter lives in mermaidPreview.ts.

### Verification notes

- Method: No test: browser entry point.
- Criteria: No two drawings share an id.
