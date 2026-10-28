---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-086
uuid: 2c78bad4-8696-46c5-8105-b7df90dd12f1
title: The JAR pipeline takes the SVG from the process output
description: When the JAR pipeline runs a process for a diagram, the extension
  SHALL take as the picture the output from the first svg start tag to the last
  svg end tag.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-084
default_owner_email: gaetan@xeberon.net
---

## The JAR pipeline takes the SVG from the process output

### Normative behavior

When the JAR pipeline runs a process for a diagram, the extension SHALL take as the picture the output from the first svg start tag to the last svg end tag.

### Scenario: Log lines around

- GIVEN a process that prints log lines before and after the SVG
- WHEN the output is read
- THEN the picture is the SVG only and the log lines are ignored

### Scenario: Split characters

- GIVEN a multibyte character split across two output chunks
- WHEN the output is read
- THEN the character is decoded correctly in the picture

### Verification notes

- Method: Unit tests: renders PlantUML through the configured external JAR; decodes a multibyte character split across stdout chunks.
- Criteria: Picture equals the SVG span.
