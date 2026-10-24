---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-020
uuid: 10846312-8b36-49fc-92d6-8b0ae9242ce9
title: Render read-only in an untrusted workspace
description: When the workspace is untrusted or the file is standalone, the
  extension SHALL still render the preview read-only with the resource root
  reduced to the document's folder.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Render read-only in an untrusted workspace

### Normative behavior

When the workspace is untrusted or the file is standalone, the extension SHALL still render the preview read-only with the resource root reduced to the document's folder.

### Scenario: Nominal render read-only in an untrusted workspace

- GIVEN an untrusted workspace
- WHEN a document is previewed
- THEN it renders read-only

### Scenario: Boundary or refusal of render read-only in an untrusted workspace

- GIVEN an include of a file outside the document folder
- WHEN it is rendered untrusted
- THEN the include is refused with a warning

### Verification notes

- Method: test
- Criteria: The untrusted render succeeds with a document-folder root.
