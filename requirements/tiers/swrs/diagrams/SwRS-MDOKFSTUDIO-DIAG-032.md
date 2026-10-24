---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-032
uuid: 6d1d3b08-6778-4104-9ed6-52868a07cc41
title: "Diagrams that need a URL or a library are refused with a message"
description: "When a built-in diagram has a line starting with !includeurl, !includedef
  or !import, an include of a URL or of a library name in angle brackets, or a !theme
  with from, the page SHALL show one message naming the directive and its line and
  the useJar hint instead of a picture, and SHALL set data-render-state to unavailable."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Diagrams that need a URL or a library are refused with a message

### Normative behavior

When a built-in diagram has a line starting with !includeurl, !includedef or !import, an include of a URL or of a library name in angle brackets, or a !theme with from, the page SHALL show one message naming the directive and its line and the useJar hint instead of a picture, and SHALL set data-render-state to unavailable.

### Scenario: Library include

- GIVEN a diagram with an include of the C4 library name in angle brackets on line 3
- WHEN the page draws it
- THEN the diagram shows a message naming that directive and line 3 and the useJar hint, no picture, state unavailable, and the source disclosure keeps the text

### Scenario: CRLF and indentation

- GIVEN a source with CRLF line endings and an indented !includeurl line on line 2
- WHEN the page draws it
- THEN the message names line 2

### Known issues

- Known issue: The directive is matched at the start of a line only; one placed after other text on the line is not detected and falls under the generic engine failure message.

### Verification notes

- Method: Unit tests of the directive scan and of the diagram renderer; visual scenario diagrams v12.
- Criteria: The engine is not run and the host is not asked.
