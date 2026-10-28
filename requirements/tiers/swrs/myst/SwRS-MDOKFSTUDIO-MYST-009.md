---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-009
uuid: 1aebae25-92d0-41cc-8253-5c8d6549d3dc
title: Dropdown admonitions collapse under their title
description: 'When an admonition has `:class: dropdown` or an `:open:` option, the
  extension SHALL render a collapsible section with the title as summary, closed unless
  `:open: true`.'
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-006
default_owner_email: gaetan@xeberon.net
---

## Dropdown admonitions collapse under their title

### Normative behavior

When an admonition has `:class: dropdown` or an `:open:` option, the extension SHALL render a collapsible section with the title as summary, closed unless `:open: true`.

### Scenario: Nominal

- GIVEN `:class: dropdown` without `:open:`
- WHEN the preview renders
- THEN a collapsible section is shown closed with the title as summary

### Scenario: Boundary or refusal

- GIVEN a dropdown with `:open: true`
- WHEN the preview renders
- THEN the section is open

### Verification notes

- Method: Unit test "dropdown admonitions render as openable details with a summary" in test/core/render/mystFeatures.test.ts
- Criteria: The toggle is the native details element.
