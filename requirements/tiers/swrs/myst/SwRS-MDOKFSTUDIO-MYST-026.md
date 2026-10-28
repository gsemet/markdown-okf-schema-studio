---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-026
uuid: d53449b0-66cb-465c-8945-11dfdc8f51dc
title: Unparsable formulas stay readable
description: When KaTeX cannot parse a formula, the extension SHALL keep its raw
  TeX with a wavy underline and the tooltip This equation could not be rendered
  by KaTeX, and still render the other equations.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-024
default_owner_email: gaetan@xeberon.net
---

## Unparsable formulas stay readable

### Normative behavior

When KaTeX cannot parse a formula, the extension SHALL keep its raw TeX with a wavy underline and the tooltip This equation could not be rendered by KaTeX, and still render the other equations.

### Scenario: Nominal

- GIVEN a document with one invalid and one valid formula
- WHEN the preview renders
- THEN the invalid one shows raw TeX with the tooltip and the valid one is typeset

### Scenario: Boundary or refusal

- GIVEN a document with only an invalid formula
- WHEN the preview renders
- THEN no warning is listed in the status region or Problems view

### Verification notes

- Method: Unit test "invalid LaTeX stays readable without breaking valid equations" in test/core/render/mathRenderer.test.ts
- Criteria: Failure is local to the formula.
