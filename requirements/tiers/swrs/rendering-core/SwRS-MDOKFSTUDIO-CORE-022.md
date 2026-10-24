---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-022
uuid: 725d038d-c6c0-4ea4-8cc5-c9b1ea831414
title: Show an inert placeholder for an unresolvable directive
description: When a document holds a directive that needs a full build (an
  unknown directive, `toc`, an unexpanded `{include}`, `{embed}`, `{glossary}`
  or a known directive that renders nothing), the extension SHALL render an
  inert placeholder with the directive name, its arguments and its body as text.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Show an inert placeholder for an unresolvable directive

### Normative behavior

When a document holds a directive that needs a full build (an unknown directive, `toc`, an unexpanded `{include}`, `{embed}`, `{glossary}` or a known directive that renders nothing), the extension SHALL render an inert placeholder with the directive name, its arguments and its body as text.

### Scenario: Nominal show an inert placeholder for an unresolvable directive

- GIVEN an unknown directive `{foo} bar` with a body
- WHEN it is rendered
- THEN a placeholder shows `{foo} bar` and the body text, mapped to its line

### Scenario: Boundary or refusal of show an inert placeholder for an unresolvable directive

- GIVEN a known directive that renders to nothing
- WHEN it is rendered
- THEN the placeholder is shown, not an empty gap

### Verification notes

- Method: test
- Criteria: The placeholder holds name, arguments and body and keeps its source line.
