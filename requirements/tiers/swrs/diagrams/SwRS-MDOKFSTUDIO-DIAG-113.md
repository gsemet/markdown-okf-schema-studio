---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-113
uuid: ff4ea332-5acc-4fdb-999f-f21ab0a9f586
title: Include silence and malformed answers reach the diagram as reasons
description: When the host does not answer an include within 10 seconds or sends
  an answer that is not well formed, the page SHALL give the engine a failure
  reason exactly once.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-046; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-046
default_owner_email: gaetan@xeberon.net
---

## Include silence and malformed answers reach the diagram as reasons

### Normative behavior

When the host does not answer an include within 10 seconds or sends an answer that is not well formed, the page SHALL give the engine a failure reason exactly once.

### Scenario: Timeout

- GIVEN no answer for 10 seconds
- WHEN the time passes
- THEN the engine receives The editor did not answer. Try again.

### Scenario: Malformed answer

- GIVEN an ok answer without a text
- WHEN it arrives
- THEN the engine receives the file name followed by could not be read

### Known issues

- Known issue: The page without a connection to the editor answers with its own reason (see the file loader requirement).

### Verification notes

- Method: Unit test: refusals, stale answers and timeouts reach the bundle as reasons, once.
- Criteria: Each request ends in one reason.
