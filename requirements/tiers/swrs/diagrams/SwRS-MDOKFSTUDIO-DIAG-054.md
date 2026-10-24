---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-054
uuid: d9f64b34-93fb-4976-a89a-6e4b75dc01db
title: Empty names, URLs and library names are never read
description: When an include request has an empty name after trimming, a URL, or
  a library name in angle brackets, the host SHALL refuse it without reading the
  disk.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Empty names, URLs and library names are never read

### Normative behavior

When an include request has an empty name after trimming, a URL, or a library name in angle brackets, the host SHALL refuse it without reading the disk.

### Scenario: Library name

- GIVEN an include request for C4/C4_Context in angle brackets
- WHEN the host resolves it
- THEN it is refused with a reason saying the built-in engine reads no URL and no standard library

### Scenario: Blank name

- GIVEN an include request whose name is only spaces
- WHEN the host resolves it
- THEN it is refused with the reason The include names no file.

### Known issues

- Known issue: The check treats any name starting with a letter sequence and a colon as a URL, so a Windows drive path such as C:\diagrams\a.puml is refused as not local.

### Verification notes

- Method: Unit test of the include resolver.
- Criteria: No disk access for these names.
