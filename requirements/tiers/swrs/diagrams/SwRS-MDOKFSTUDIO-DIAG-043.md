---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-043
uuid: da5a4b4b-5248-4257-b35f-9788f4ccab6e
title: A superseded built-in render does not overwrite a newer one
description: When a newer render of the same diagram element starts before an
  earlier one finishes, the page SHALL show only the result of the newer render.
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
---

## A superseded built-in render does not overwrite a newer one

### Normative behavior

When a newer render of the same diagram element starts before an earlier one finishes, the page SHALL show only the result of the newer render.

### Scenario: Theme switch while reading files

- GIVEN a diagram whose files are being read
- WHEN a theme switch starts a second render of the element
- THEN only the second render's picture is shown

### Scenario: Late first result

- GIVEN the first render finishing after the second
- WHEN its result arrives
- THEN it is dropped and the element is unchanged

### Verification notes

- Method: Unit test: a render superseded while its files are read does not overwrite the newer result.
- Criteria: The element holds the newest render only.
