---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-057
uuid: 6a129795-6cb9-4ac7-b136-2a8df9c3b2ca
title: The trust state sets the folders an include may read
description: When the workspace is trusted, the host SHALL serve include files
  from the workspace, and in Restricted Mode only from the document's folder and
  below.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-054; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-054
---

## The trust state sets the folders an include may read

### Normative behavior

When the workspace is trusted, the host SHALL serve include files from the workspace, and in Restricted Mode only from the document's folder and below.

### Scenario: Trusted workspace

- GIVEN a trusted workspace and an include of a sibling folder inside the workspace
- WHEN the host resolves it
- THEN the file is served

### Scenario: Restricted Mode

- GIVEN an untrusted workspace and the same include
- WHEN the host resolves it
- THEN it is refused with the reason that the file is outside the folders the preview reads

### Verification notes

- Method: Unit tests: a trusted workspace serves the workspace; Restricted Mode serves only the document's folder and below.
- Criteria: Folder scope follows trust.
