---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-083
uuid: 7d594376-cf3e-4957-8e74-ce14ec136271
title: The PlantUML source disclosure is styled like Mermaid's
description: When a PlantUML figure shows its source disclosure, the extension
  SHALL style the summary in the description colour with a pointer cursor and a
  smaller font and leave a margin above the details.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The PlantUML source disclosure is styled like Mermaid's

### Normative behavior

When a PlantUML figure shows its source disclosure, the extension SHALL style the summary in the description colour with a pointer cursor and a smaller font and leave a margin above the details.

### Scenario: Disclosure

- GIVEN a PlantUML figure
- WHEN the preview is shown
- THEN the summary uses the description colour, a pointer cursor and font size 0.9em and the details has a top margin

### Scenario: Same as Mermaid

- GIVEN a Mermaid figure
- WHEN the preview is shown
- THEN its disclosure uses the same rules

### Known issues

- Known issue: Untested.

### Verification notes

- Method: No stylesheet test for the PlantUML rules.
- Criteria: Rules equal the Mermaid ones.
