---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-001
uuid: 0b6e83d2-0342-4f9a-8fa9-af6b80f8e294
title: Render the unsaved buffer in process
description: When the active Markdown buffer changes, the extension SHALL render
  the buffer text, saved or unsaved, to HTML inside the extension process.
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

## Render the unsaved buffer in process

### Normative behavior

When the active Markdown buffer changes, the extension SHALL render the buffer text, saved or unsaved, to HTML inside the extension process.

### Scenario: Nominal render the unsaved buffer in process

- GIVEN a Markdown document with unsaved edits is open in the editor
- WHEN the preview renders
- THEN the page shows the unsaved text and no Sphinx process or temporary file is used

### Scenario: Boundary or refusal of render the unsaved buffer in process

- GIVEN the buffer is dirty and the file on disk holds older text
- WHEN the preview renders
- THEN the rendered HTML matches the buffer text, not the disk text

### Verification notes

- Method: test
- Criteria: A render of a dirty buffer returns HTML for the buffer text and spawns no subprocess.
