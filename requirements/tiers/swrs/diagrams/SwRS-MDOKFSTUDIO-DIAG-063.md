---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-063
uuid: d84ddd06-57a0-4fd4-b490-9b8809873709
title: A diagram and its includes hold at most 1 MiB of text
description: When the text of a built-in diagram plus its included files would
  exceed 1 MiB, the page SHALL refuse the include that crosses the limit with
  the reason that the diagram with its included files exceeds the 1 MiB preview
  limit.
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

## A diagram and its includes hold at most 1 MiB of text

### Normative behavior

When the text of a built-in diagram plus its included files would exceed 1 MiB, the page SHALL refuse the include that crosses the limit with the reason that the diagram with its included files exceeds the 1 MiB preview limit.

### Scenario: Crossing the limit

- GIVEN a diagram whose included files together pass 1 MiB
- WHEN it is drawn
- THEN the include that crosses the limit is refused with that reason

### Scenario: Same file twice

- GIVEN one large file included twice
- WHEN it is drawn
- THEN its text is counted once

### Verification notes

- Method: Unit test: a diagram includes at most 64 files and at most 1 MiB of text with its includes.
- Criteria: The diagram's own text counts toward the limit.
