---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-004
uuid: 87b5459e-2418-488b-8d9f-22e12f388bd9
title: Mermaid pictures keep their natural size within the content width
description: When a Mermaid picture is wider than the content column, the
  extension SHALL scale it down to the column width keeping its proportions, and
  SHALL NOT enlarge a picture that is narrower.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Mermaid pictures keep their natural size within the content width

### Normative behavior

When a Mermaid picture is wider than the content column, the extension SHALL scale it down to the column width keeping its proportions, and SHALL NOT enlarge a picture that is narrower.

### Scenario: Wide picture

- GIVEN a Mermaid picture whose natural width exceeds the content column
- WHEN the preview is shown
- THEN the picture is displayed at the column width with its height scaled in proportion (max-width 100 percent, height auto)

### Scenario: Narrow picture

- GIVEN a Mermaid picture narrower than the content column
- WHEN the preview is shown
- THEN the picture keeps its natural size, is not enlarged and is centred

### Known issues

- Known issue: There is no minimum scale and no zoom: a very wide diagram is scaled until its labels become small (UX-46, not fixed, absent from docs/known-limitations.md). The unit test locks the containment, not a minimum label size.

### Verification notes

- Method: Unit test on the preview stylesheet; visual scenarios diagrams v01 to v03 check that the picture is not enlarged.
- Criteria: The stylesheet contains the containment rules and the rendered picture is never larger than its natural size.
