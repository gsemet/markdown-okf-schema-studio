---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-040
uuid: 0d3c96ed-8423-459c-8f59-82f90cb02c84
title: The built-in result cache keeps 64 results
description: When the page has stored more than 64 built-in results, it SHALL
  drop the least recently used result.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Archived. Not an observable behaviour; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The built-in result cache keeps 64 results

### Normative behavior

When the page has stored more than 64 built-in results, it SHALL drop the least recently used result.

### Scenario: Sixty-five results

- GIVEN 65 distinct diagrams drawn in turn
- WHEN the 65th is stored
- THEN the first one is no longer kept and drawing it again runs the engine

### Scenario: Recent use

- GIVEN a stored result used again after newer ones
- WHEN the limit is exceeded
- THEN an unused newer result is dropped before it

### Verification notes

- Method: Unit test `the built-in result cache keeps 64 results and drops the least recently used` in `test/page/modules/diagReq.diagrams.requirements.test.ts`.
- Criteria: At most 64 results are kept.
