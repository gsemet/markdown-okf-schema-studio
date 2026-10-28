---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-041
uuid: b057ea17-cfda-4db3-b804-b2e9ea798022
title: Results with refused includes are not kept
description: When a built-in render ends with a refused include or an included
  file holding an unsupported directive, the page SHALL NOT keep the result, so
  the next render asks again.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-039; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-039
default_owner_email: gaetan@xeberon.net
---

## Results with refused includes are not kept

### Normative behavior

When a built-in render ends with a refused include or an included file holding an unsupported directive, the page SHALL NOT keep the result, so the next render asks again.

### Scenario: Refused include

- GIVEN a diagram whose include the host refuses
- WHEN the diagram is drawn twice
- THEN the host is asked again at the second render and a fixed file then shows the picture

### Scenario: Plain engine error

- GIVEN a diagram with a syntax error and no include problem
- WHEN it is drawn twice with the same source
- THEN the second drawing shows the kept error without running the engine

### Known issues

- Known issue: A plain engine failure (syntax error) is kept by the result cache and is not retried until the source or the variant changes, unlike an include failure.

### Verification notes

- Method: Unit test: a refused include shows the host's reason and is asked again at the next render.
- Criteria: Include failures are not cached; plain engine errors are.
