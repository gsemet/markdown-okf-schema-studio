---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-042
uuid: 97b4af33-220d-4eb9-8458-e0413900d736
title: A new custom key is saved as a plain scalar when that is safe
description: When a writer saves the text of a just-added custom key, the
  extension SHALL write it as a plain YAML scalar when it reads back as the same
  string, and quote it otherwise.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A new custom key is saved as a plain scalar when that is safe

### Normative behavior

When a writer saves the text of a just-added custom key, the extension SHALL write it as a plain YAML scalar when it reads back as the same string, and quote it otherwise.

### Scenario: Nominal

- GIVEN a custom key just added with the empty string as value
- WHEN the writer types plain text and presses Enter
- THEN the editor is one text line, the save carries fieldValueStyle plain and the value is written unquoted

### Scenario: Boundary or refusal

- GIVEN the typed text yes, on or a date-like value
- WHEN the value is saved
- THEN it is written quoted; an existing field's save never asks for a plain scalar

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterEditor.test.ts) and test/core/frontmatter/okfFrontmatter.test.ts.
- Criteria: Tests T41 a new custom key opens a one-line text editor; plain scalar safety; plainScalar quotes a date-like value. The host accepts the plain style only for a field whose current value is the empty string.
