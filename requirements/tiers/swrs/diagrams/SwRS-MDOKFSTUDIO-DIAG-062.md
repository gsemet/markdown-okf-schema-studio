---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-062
uuid: 928249b5-d8e2-4ca0-9d39-8ace5fe82bae
title: A diagram includes at most 64 files
description: When a built-in diagram asks for a 65th distinct include, the page
  SHALL refuse it with the reason that a diagram includes at most 64 files.
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
superseded_by: SwRS-MDOKFSTUDIO-DIAG-061
default_owner_email: gaetan@xeberon.net
---

## A diagram includes at most 64 files

### Normative behavior

When a built-in diagram asks for a 65th distinct include, the page SHALL refuse it with the reason that a diagram includes at most 64 files.

### Scenario: Sixty-fifth file

- GIVEN a diagram with 65 distinct includes
- WHEN it is drawn
- THEN the 65th is refused with the 64-file reason

### Scenario: Repeated include

- GIVEN the same file included twice from the same file
- WHEN it is drawn
- THEN the file counts once

### Verification notes

- Method: Unit test: a diagram includes at most 64 files and at most 1 MiB of text with its includes.
- Criteria: The count is of distinct requests.
