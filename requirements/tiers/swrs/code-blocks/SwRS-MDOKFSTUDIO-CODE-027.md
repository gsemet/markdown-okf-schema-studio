---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-027
uuid: 11674611-857d-4a73-ba69-f2b2cfa96454
title: Drop a copy request from a stale page
description: When a copy request comes from a page whose document version or
  render request is no longer current, the extension SHALL drop it without
  writing the clipboard.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-065; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## Drop a copy request from a stale page

### Normative behavior

When a copy request comes from a page whose document version or render request is no longer current, the extension SHALL drop it without writing the clipboard.

### Scenario: nominal behavior

- GIVEN the document changed since the page rendered
- WHEN a copy request arrives
- THEN it is dropped and the clipboard is unchanged

### Scenario: boundary or refusal behavior

- GIVEN the page is current
- WHEN a copy request arrives
- THEN the text is written to the clipboard

### Verification notes

- Method: Unit test of the message dispatcher.
- Criteria: Stale requests are not handled; current requests are.
