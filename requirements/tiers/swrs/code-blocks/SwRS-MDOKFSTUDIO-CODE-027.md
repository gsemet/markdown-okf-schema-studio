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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Drop a copy request from a stale page

### Normative behavior

When a copy request comes from a page whose document version or render request is no longer current, the extension SHALL drop it without writing the clipboard.

Known issue: the copy button still shows Copied although the host dropped the request and the clipboard is unchanged; the version check is stricter than needed for a copy, which edits nothing (backlog P2/copy-button-false-copied).

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
