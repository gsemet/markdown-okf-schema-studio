---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-048
uuid: c2f6b557-7126-4b31-8855-9cc2eecd2084
title: A changed setting that the page reads only at startup loads a new page
  document
description: When scrollPreviewWithEditor, scrollEditorWithPreview,
  markEditorSelection or stickyHeadingDepth changes, the extension SHALL load a
  new page document instead of patching the loaded one.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
- StRS-MDOKFSTUDIO-LIFE-010
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A changed setting that the page reads only at startup loads a new page document

### Normative behavior

When scrollPreviewWithEditor, scrollEditorWithPreview, markEditorSelection or stickyHeadingDepth changes, the extension SHALL load a new page document instead of patching the loaded one.

### Scenario: Changed startup setting

- GIVEN a loaded page and a change of scrollEditorWithPreview
- WHEN the next render is shown
- THEN the runtime context key differs, so the page document is assigned again and the new value reaches the page in its boot context

### Scenario: Live setting

- GIVEN a change of showComments
- WHEN the setting changes
- THEN the page follows through a message and the context key is not affected

### Verification notes

- Method: Unit test test/core/preview/contentPatch.test.ts "T34: the runtime context key covers the startup settings and nothing the page follows itself".
- Criteria: runtimeContextKey differs exactly when a startup setting differs.

### Archived

Merged into SwRS-MDOKFSTUDIO-LIFE-076, which lists the startup settings.
