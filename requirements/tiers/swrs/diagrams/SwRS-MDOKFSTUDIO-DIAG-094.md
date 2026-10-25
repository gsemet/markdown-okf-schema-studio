---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-094
uuid: 6daa628f-90f2-40d9-a0d1-2fc9eb1e3011
title: "A failing PlantUML process shows its exit and error output"
description: "When a PlantUML process exits with a non-zero code or a signal, the
  extension SHALL show PlantUML exited with code N or signal S, followed by a colon
  and the process's error output or PlantUML returned no diagnostic., on the diagram
  with state error."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-089; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-089
---

## A failing PlantUML process shows its exit and error output

### Normative behavior

When a PlantUML process exits with a non-zero code or a signal, the extension SHALL show PlantUML exited with code N or signal S, followed by a colon and the process's error output or PlantUML returned no diagnostic., on the diagram with state error.

### Scenario: Exit code

- GIVEN a process that exits with code 1 and error output Syntax Error
- WHEN the diagram is rendered
- THEN the diagram shows PlantUML exited with code 1: Syntax Error with state error

### Scenario: No output

- GIVEN a process that exits with code 2 and no error output
- WHEN the diagram is rendered
- THEN the diagram shows PlantUML exited with code 2: PlantUML returned no diagnostic.

### Known issues

- Known issue: The signal wording is untested.

### Verification notes

- Method: Unit test: returns diagnostics for PlantUML process failures and malformed output.
- Criteria: Message wording and state.
