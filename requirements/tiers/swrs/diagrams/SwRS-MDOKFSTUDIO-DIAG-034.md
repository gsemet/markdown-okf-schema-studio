---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-034
uuid: d2a58a5b-7b55-4706-bf64-49ee91fdfaf9
title: The file loader refuses local files without a render or a host
description: When the built-in engine asks for a local file outside a render or
  when the page has no host connection, the page SHALL refuse the request with a
  reason that names the file.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-032; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-032
---

## The file loader refuses local files without a render or a host

### Normative behavior

When the built-in engine asks for a local file outside a render or when the page has no host connection, the page SHALL refuse the request with a reason that names the file.

### Scenario: No host

- GIVEN a diagram renderer created without a host
- WHEN the engine asks for a local file
- THEN the request is refused with a reason naming the file

### Scenario: No connection

- GIVEN a page that has no connection to the editor
- WHEN an include request is dispatched
- THEN the request is answered with the reason that the page has no connection to the editor

### Known issues

- Known issue: The no-connection branch of askHost in plantumlPreview.ts is untested.

### Verification notes

- Method: Unit tests of the file loader.
- Criteria: No file text ever reaches the engine in these cases.
