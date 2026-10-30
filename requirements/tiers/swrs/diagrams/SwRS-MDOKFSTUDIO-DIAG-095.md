---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-095
uuid: 626b07ca-6de8-463e-a618-8f8bef72d8b7
title: "Output without an SVG is reported"
description: "When a PlantUML process exits successfully but its output holds no complete
  SVG, the extension SHALL show PlantUML did not return SVG output. on the diagram
  with state error."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-089; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-089
default_owner_email: gaetan@xeberon.net
---

## Output without an SVG is reported

### Normative behavior

When a PlantUML process exits successfully but its output holds no complete SVG, the extension SHALL show PlantUML did not return SVG output. on the diagram with state error.

### Scenario: No SVG

- GIVEN a process that exits 0 and prints plain text
- WHEN the diagram is rendered
- THEN the diagram shows that message with state error

### Scenario: Unterminated SVG

- GIVEN output with an svg start tag and no end tag
- WHEN the diagram is rendered
- THEN the same message appears

### Verification notes

- Method: Unit test: returns diagnostics for PlantUML process failures and malformed output.
- Criteria: A complete svg span is required.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-089](SwRS-MDOKFSTUDIO-DIAG-089.md): JAR failures are reported on the diagram and in the status line
<!-- okf:links:end -->
