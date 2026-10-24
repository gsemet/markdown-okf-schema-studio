---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-019
uuid: 77c7ef91-774e-43c6-95d4-c03409e937bb
title: Copy the raw code with one click
description: When the reader clicks the copy button, the extension SHALL put the
  block's code only on the clipboard, without file name or line numbers, lines
  joined with newlines and a trailing newline.
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

## Copy the raw code with one click

### Normative behavior

When the reader clicks the copy button, the extension SHALL put the block's code only on the clipboard, without file name or line numbers, lines joined with newlines and a trailing newline.

### Scenario: nominal behavior

- GIVEN a numbered, emphasized block with a file name
- WHEN the reader clicks Copy code
- THEN the clipboard holds the code lines only, joined by newlines with a trailing newline

### Scenario: boundary or refusal behavior

- GIVEN a diff block
- WHEN the reader clicks Copy code
- THEN the clipboard holds the lines with their `+` and `-` markers and nothing else

### Verification notes

- Method: Unit test of the posted text and the host clipboard handler.
- Criteria: Clipboard text equals the source code plus one trailing newline.
