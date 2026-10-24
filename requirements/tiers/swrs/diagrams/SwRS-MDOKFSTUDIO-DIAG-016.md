---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-016
uuid: b5d800bd-6eff-4481-9029-9cae0cf17993
title: An invalid Mermaid diagram keeps exactly one error
description: When a Mermaid diagram that cannot be drawn is drawn again, the
  page SHALL replace the earlier error with the new one so that the diagram
  holds exactly one error message and one parser details section.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## An invalid Mermaid diagram keeps exactly one error

### Normative behavior

When a Mermaid diagram that cannot be drawn is drawn again, the page SHALL replace the earlier error with the new one so that the diagram holds exactly one error message and one parser details section.

### Scenario: Theme switches

- GIVEN an invalid Mermaid diagram
- WHEN the theme changes through dark, white, cream and the original mode
- THEN after each change the diagram holds one error message and one details section

### Scenario: Changing reason

- GIVEN an error shown for line 2 and a new error for line 3
- WHEN the page shows the second error
- THEN the details section holds only the line 3 reason

### Known issues

- Known issue: The visual check sets the render state to pending before each theme change to force a redraw.

### Verification notes

- Method: Unit test of the error element; visual scenarios diagrams v08 and v09 (theme switch check).
- Criteria: Never more than one error element and one details section per diagram.
