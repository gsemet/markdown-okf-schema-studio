---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-039
uuid: 34742c40-549f-4806-b481-2bb97f064d4a
title: "Built-in pictures are kept by source, base and variant"
description: "When the page needs a built-in diagram whose source, include base and
  light or dark variant equal those of an earlier result, it SHALL show that result
  without running the engine."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Built-in pictures are kept by source, base and variant

### Normative behavior

When the page needs a built-in diagram whose source, include base and light or dark variant equal those of an earlier result, it SHALL show that result without running the engine.

### Scenario: Patch and switch back

- GIVEN a drawn diagram, a content patch that keeps its source, and a theme switch to dark and back
- WHEN the page draws the diagram again
- THEN the engine runs once for the light variant and once for the dark variant, not again on the switch back

### Scenario: Different base

- GIVEN two diagrams with the same text and different include bases
- WHEN the page draws both
- THEN the engine runs for each

### Verification notes

- Method: Unit test: the same source in the same theme renders once; a theme change renders again from the kept source.
- Criteria: A repeated key causes no engine run.
