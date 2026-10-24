---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-025
uuid: a67671ff-fd6a-4c4b-9020-40d44e7f6434
title: Allow copying in read-only previews
description: When a preview is read-only because the workspace is untrusted or
  the file is standalone, the extension SHALL still write the requested code
  text to the clipboard and edit nothing.
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

## Allow copying in read-only previews

### Normative behavior

When a preview is read-only because the workspace is untrusted or the file is standalone, the extension SHALL still write the requested code text to the clipboard and edit nothing.

### Scenario: nominal behavior

- GIVEN an untrusted workspace preview
- WHEN the reader clicks Copy code
- THEN the code is on the clipboard and the document is unchanged

### Scenario: boundary or refusal behavior

- GIVEN a standalone file preview
- WHEN the reader clicks Copy code
- THEN the code is on the clipboard and no edit request is processed

### Verification notes

- Method: Integration test in the untrusted and standalone suites.
- Criteria: Clipboard written; no document edit.
