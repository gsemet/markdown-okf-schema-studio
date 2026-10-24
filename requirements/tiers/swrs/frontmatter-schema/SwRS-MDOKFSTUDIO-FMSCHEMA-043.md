---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-043
uuid: 438c6922-af45-483e-927a-599d9d430b9a
title: The table is refreshed in place 300 ms after the last edit
description: When the frontmatter of the shown document changes, the extension
  SHALL re-analyse it 300 ms after the last change and replace the properties
  section on the open page without reloading it.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The table is refreshed in place 300 ms after the last edit

### Normative behavior

When the frontmatter of the shown document changes, the extension SHALL re-analyse it 300 ms after the last change and replace the properties section on the open page without reloading it.

### Scenario: Typing in the frontmatter

- GIVEN a preview open on a document and the writer changing a field value in the editor
- WHEN 300 ms pass without further edits
- THEN the properties section is replaced in place and the rest of the page, its scroll position and its open editors are untouched

### Scenario: Page not ready

- GIVEN the page is not ready for the current render
- WHEN the table changes
- THEN the whole document is loaded again instead of patching

### Verification notes

- Method: Unit test of the frontmatter controller; real-input test.
- Criteria: Each new change restarts the 300 ms timer; unchanged markup posts nothing.
