---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-036
uuid: cb502cbf-4f61-4085-b7cb-19ea02e9d200
title: "Unsupported directives inside included files name the file"
description: "When a local file read for the built-in engine contains a directive
  that needs a URL or a library, the diagram SHALL show the unavailable message naming
  the directive, its line, the file name and the useJar hint."
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
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-032
default_owner_email: gaetan@xeberon.net
---

## Unsupported directives inside included files name the file

### Normative behavior

When a local file read for the built-in engine contains a directive that needs a URL or a library, the diagram SHALL show the unavailable message naming the directive, its line, the file name and the useJar hint.

### Scenario: Library include in a file

- GIVEN an included file with an include of a library name on line 2
- WHEN the diagram is drawn
- THEN the message names the directive, line 2 and that file, with the useJar hint, and the state is unavailable

### Scenario: Not kept

- GIVEN the same diagram drawn again after the file was fixed
- WHEN the page draws it
- THEN the earlier refusal was not kept, so the engine runs again with the new file text

### Verification notes

- Method: Unit test of the diagram renderer with included files.
- Criteria: The refusing file is named and the result is not cached.
