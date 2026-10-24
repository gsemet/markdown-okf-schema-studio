---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-018
uuid: 4d74c790-a832-4931-8c3f-9e157953a2f4
title: Refuse includes outside the allowed roots
description: When an include points outside the allowed roots, uses an absolute
  path or a URL scheme, has an undecodable path or a symlink that escapes its
  root, the extension SHALL NOT read the file and SHALL list a warning naming
  the request.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Refuse includes outside the allowed roots

### Normative behavior

When an include points outside the allowed roots, uses an absolute path or a URL scheme, has an undecodable path or a symlink that escapes its root, the extension SHALL NOT read the file and SHALL list a warning naming the request.

### Scenario: Nominal refuse includes outside the allowed roots

- GIVEN an include of `../../secret.md` outside the roots
- WHEN it is rendered
- THEN the file is not read and a warning with its value is listed

### Scenario: Boundary or refusal of refuse includes outside the allowed roots

- GIVEN an include with an `https:` URL
- WHEN it is rendered
- THEN the URL is not fetched and a warning is listed

### Verification notes

- Method: test
- Criteria: Each refusal code lists a warning item and reads no file.
