---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-090
uuid: 98c5c8e9-1476-4e47-8778-90ca952de5c8
title: The frontmatter properties table collapses under its header and is shown
  again on every page load
description: When a writer presses the toggle next to the Frontmatter properties
  title, the extension SHALL hide the table below the header, show it again on
  the next press, keep the state across content patches and edits of the open
  document, and show the table expanded whenever the page loads or a document is
  opened.
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
- src/core/frontmatter/propertiesTable.ts
- src/page/features/pageInput.ts
tested_in_files:
- test/core/frontmatter/propertiesTable.test.ts
- test/page/runtimeFrontmatterFields.test.ts
- test/visual/frontmatterCollapseScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The frontmatter properties table collapses under its header and is shown again on every page load

### Normative behavior

When a writer presses the toggle next to the Frontmatter properties title, the extension SHALL hide the table below the header, show it again on the next press, keep the state across content patches and edits of the open document, and show the table expanded whenever the page loads or a document is opened.

### Scenario (nominal): Collapse and expand

- GIVEN a document with a frontmatter properties table shown
- WHEN the writer presses the toggle next to the title Frontmatter properties
- THEN the table is hidden while the title and the toggle stay, the toggle reports aria-expanded false and is labelled Expand frontmatter properties, and a second press shows the table again with aria-expanded true

### Scenario (nominal): The state holds while the document stays open

- GIVEN the table collapsed
- WHEN the properties section is replaced by a content patch or an edit
- THEN the table stays collapsed and the toggle keeps reporting aria-expanded false

### Scenario (boundary): Page load and newly opened document

| Input | Outcome |
| --- | --- |
| A page loads while the table was collapsed in the previous page | The table is shown and aria-expanded is true; the state is never stored in the panel state or the workspace |
| A document is opened in a new preview | The table is shown |
| The issue badge is pressed while the table is collapsed | The table is shown first, then the focus goes to the first row with an issue |

### Scenario (boundary): Keyboard and the Description column

| Input | Outcome |
| --- | --- |
| Enter or Space on the focused toggle | The toggle is a button, so it collapses or expands the table and opens no editor |
| The Description column collapsed or expanded | Independent of the table state; the table keeps its state |

### Verification notes

- Method: `test/core/frontmatter/propertiesTable.test.ts` (one toggle in the title, expanded by default, button markup with aria-expanded, aria-label and title).
- Method: `test/page/runtimeFrontmatterFields.test.ts` (click collapses and expands, a content patch keeps the state, a fresh page starts expanded).
- Method: visual scenarios `frontmatter-schema/v28` to `v31` in `test/visual/frontmatterCollapseScenarios.ts` (table hidden and shown, light and dark).
- Criteria: html carries data-okf-frontmatter-collapsed true only after a press; the table computed display is none while collapsed; the toggle aria-expanded is the inverse of the collapsed state.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-001](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-001.md): Frontmatter appears as a readable, configurable properties table
<!-- okf:links:end -->
