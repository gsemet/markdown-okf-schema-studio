---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-064
uuid: c3570a72-928e-4f49-9ef1-82298e19f339
title: An include cycle stops with a message
description: When an included file includes one of its ancestors, including the
  diagram's own .puml file, the page SHALL stop with the reason that the file
  includes itself (an include cycle) instead of looping.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-061; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-061
default_owner_email: gaetan@xeberon.net
---

## An include cycle stops with a message

### Normative behavior

When an included file includes one of its ancestors, including the diagram's own .puml file, the page SHALL stop with the reason that the file includes itself (an include cycle) instead of looping.

### Scenario: Cycle

- GIVEN file a includes file b which includes file a
- WHEN the diagram is drawn
- THEN the diagram shows the cycle reason naming the file and does not loop

### Scenario: Back to the diagram file

- GIVEN a {uml} diagram file that includes itself
- WHEN the diagram is drawn
- THEN the same cycle reason is shown

### Verification notes

- Method: Unit test: an include cycle is stopped with a message, also back to the diagram's own file.
- Criteria: No unbounded recursion.
