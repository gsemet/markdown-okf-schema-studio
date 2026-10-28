---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-091
uuid: 6d8a4e3b-1774-4f14-a0a7-349de2b2bd6f
title: The figure directive renders with its own styles and actions
description: When a document holds a `{figure}` directive, the extension SHALL
  render it with the figure styles and offer the figure palette action.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-031; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-031
default_owner_email: gaetan@xeberon.net
---

## The figure directive renders with its own styles and actions

### Normative behavior

When a document holds a `{figure}` directive, the extension SHALL render it with the figure styles and offer the figure palette action.

### Scenario: Nominal

- GIVEN a `{figure}`
- WHEN the preview renders
- THEN figure styles apply and the figure editor action is offered

### Scenario: Boundary or refusal

- GIVEN a `{figure}` with an invalid width
- WHEN the preview renders
- THEN the invalid width is dropped and the figure still renders

### Verification notes

- Method: Unit test "every plug-in renders, styles the preview and names MyST palette actions that exist" in test/core/directives/registry.test.ts
- Criteria: Figure family behaves per name.
