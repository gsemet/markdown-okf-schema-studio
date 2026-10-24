---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-067
uuid: 159b9f46-bc8b-486d-a5ed-9b5e63ff9179
title: A navigation saves the open field editor as a flush
description: When a navigation or a host flush request occurs while a field or
  key editor is open, the extension SHALL save the typed text as a flush before
  leaving.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A navigation saves the open field editor as a flush

### Normative behavior

When a navigation or a host flush request occurs while a field or key editor is open, the extension SHALL save the typed text as a flush before leaving.

### Scenario: Nominal

- GIVEN a YAML field editor holding invalid YAML and a click on a link to another file
- WHEN the page navigates
- THEN a save with flush true and the text as typed is posted before the navigation

### Scenario: Boundary or refusal

- GIVEN a number field with a bad number, and a key with surrounding spaces
- WHEN the page flushes
- THEN the number is sent as typed text, the key is trimmed and an empty key keeps the old one

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeEditorFlush.test.ts).
- Criteria: Tests CR 025 a host flush request saves an open frontmatter field and marks it as a flush; invalid YAML is still sent on a flush.
