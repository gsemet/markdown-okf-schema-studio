---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-045
uuid: aba8c042-23c4-443a-98e7-0dc207882034
title: A changed included file redraws the diagrams that read files
description: When the page learns that an included file changed, it SHALL forget
  the kept results that read files and draw again the diagrams marked
  data-plantuml-includes true and those still drawing.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-053; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-053
default_owner_email: gaetan@xeberon.net
---

## A changed included file redraws the diagrams that read files

### Normative behavior

When the page learns that an included file changed, it SHALL forget the kept results that read files and draw again the diagrams marked data-plantuml-includes true and those still drawing.

### Scenario: File changed

- GIVEN a diagram that includes a file and a diagram that includes none
- WHEN the includes-changed event reaches the page
- THEN the first diagram asks the host again and is drawn with the new file text

### Scenario: Independent diagram

- GIVEN the diagram without includes
- WHEN the same event arrives
- THEN it keeps its picture and its kept result

### Verification notes

- Method: Unit test: after an included file changed, the diagrams that read files are drawn again from the host.
- Criteria: Only diagrams that read files are redrawn.
