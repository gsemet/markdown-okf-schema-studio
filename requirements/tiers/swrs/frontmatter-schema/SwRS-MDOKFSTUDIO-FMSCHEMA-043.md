---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-043
uuid: 438c6922-af45-483e-927a-599d9d430b9a
title: The table is refreshed in place after edits, after the field editor
  closes
description: When the frontmatter of the shown document changes, the extension
  SHALL re-analyse it 300 ms after the last change and replace the properties
  section on the open page without reloading it, holding the new markup back
  while a frontmatter field editor is open and applying it after the editor
  closes.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/hostHandlers.ts
- src/session/features/frontmatter.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/runtimeFrontmatterFields.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-FMSCHEMA-044
---

## The table is refreshed in place after edits, after the field editor closes

### Normative behavior

When the frontmatter of the shown document changes, the extension SHALL re-analyse it 300 ms after the last change and replace the properties section on the open page without reloading it, holding the new markup back while a frontmatter field editor is open and applying it after the editor closes.

### Scenario (nominal): Typing in the frontmatter

- GIVEN a preview open on a document and the writer changing a field value in the editor
- WHEN 300 ms pass without further edits
- THEN the properties section is replaced in place and the rest of the page, its scroll position and its open editors are untouched

### Scenario (refusal): Page not ready

- GIVEN the page is not ready for the current render
- WHEN the table changes
- THEN the whole document is loaded again instead of patching

### Scenario (boundary): New table while a field editor is open

- GIVEN a frontmatter field editor open on the page
- WHEN the host posts a new properties table
- THEN the page keeps the current table and remembers the markup and its sequence number

### Scenario (nominal): Editor closed

- GIVEN the writer saves or cancels the editor
- WHEN the editor closes
- THEN the remembered markup replaces the table

### Verification notes

- Method: test/integration/realInput/markers.ts (typing in the frontmatter, page not ready; unit test of the frontmatter controller and real-input test).
- Method: test/page/runtimeFrontmatterFields.test.ts (new table while a field editor is open, editor closed).
- Criteria: Each new change restarts the 300 ms timer; unchanged markup posts nothing. Only the latest deferred markup is kept.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-001](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-001.md): Frontmatter appears as a readable, configurable properties table
- Supersedes:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-044](SwRS-MDOKFSTUDIO-FMSCHEMA-044.md): A new table waits while a field editor is open
<!-- okf:links:end -->
