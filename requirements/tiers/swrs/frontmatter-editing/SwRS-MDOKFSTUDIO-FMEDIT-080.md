---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-080
uuid: d48fe89c-274a-4206-96a2-fb934891be39
title: The figure editor and insert points ignore input while a field editor is
  open
description: While a field editor is open, the extension SHALL ignore the Edit
  figure button and the Enter key on an insert point.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The figure editor and insert points ignore input while a field editor is open

### Normative behavior

While a field editor is open, the extension SHALL ignore the Edit figure button and the Enter key on an insert point.

### Scenario: Nominal

- GIVEN a field editor open in edit mode
- WHEN the writer presses Edit figure on a figure
- THEN no figure editor opens

### Scenario: Boundary or refusal

- GIVEN the same editor
- WHEN the writer presses Enter on a plus insert point
- THEN no block editor opens at the insert point

### Verification notes

- Method: Inspection of openFigureEditor (src/page/features/editorChrome.ts) and the insert point key handler (src/page/features/insertPoints.ts).
- Criteria: Both return when activeFrontmatterEdit is set.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
<!-- okf:links:end -->
