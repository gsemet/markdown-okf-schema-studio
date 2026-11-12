---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-137
uuid: cb1ae4cd-0212-4b18-9a2d-08956571f4f7
title: The exported page shows the content without comments or editing controls
description: When the extension writes the exported file, it SHALL write the
  content as the reader sees it with every section unfolded, tabs that switch
  and dropdowns that open without JavaScript, and SHALL leave out review
  comments, comment marks and editing controls.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/export/exportContent.ts
- src/core/export/exportTabs.ts
- src/core/export/htmlExport.ts
- src/page/modules/exportSnapshot.ts
tested_in_files:
- test/core/export/htmlExport.test.ts
- test/page/exportWhileEditing.test.ts
- test/page/modules/exportSnapshot.test.ts
- test/visual/capture_export_html.py
- test/visual/exportHtmlScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The exported page shows the content without comments or editing controls

### Normative behavior

When the extension writes the exported file, it SHALL write the content as the reader sees it with every section unfolded, tabs that switch and dropdowns that open without JavaScript, and SHALL leave out review comments, comment marks and editing controls.

### Scenario (nominal): The content without chrome

- GIVEN a page with a review comment, a TODO comment chip and the editing controls of edit mode
- WHEN the page is exported
- THEN the file has no `[data-okf-comment-kind]` element, no comment text and no `button`

### Scenario (nominal): Tabs and dropdowns work with no script

- GIVEN a page with a tab set of two tabs and a dropdown
- WHEN the file is opened with JavaScript off and a click lands on the label of the second tab, then on the dropdown summary
- THEN the second panel replaces the first, the dropdown opens, and a tab set that showed its second tab when exported opens on it

### Scenario (boundary): Sections and checkboxes

| Input | Outcome |
| --- | --- |
| A folded section | It is written unfolded |
| A task checkbox | It is shown as checked or not as in the preview, and cannot be changed |
| The diagrams are still drawing | The page waits up to 10 seconds, then exports what it shows (a diagram in error or unavailable does not hold the export) |
| A block, a table cell or a front matter key or value is being edited | It is written as last rendered (the text autosaved so far, about 400 ms behind the typing); the editor stays open, is not in the file, and the export saves nothing |

### Verification notes

- Method: test/core/export/htmlExport.test.ts (the chrome rules, the tab conversion, the sections, the content under an open editor), test/page/modules/exportSnapshot.test.ts (the snapshot, the shown tabs, the diagram wait), test/page/exportWhileEditing.test.ts (the real block, table cell and front matter editors opened, then the export built from the snapshot: the edited content is in the file, shown, with no editor, and the editor is still open), test/visual/capture_export_html.py (the tabs and the missing chrome, scenarios toolbar-navigation/v42 and v43; the text of an edited table cell visible in the file opened with JavaScript off, scenario toolbar-navigation/v44).
- Criteria: no `button`, no review mark and no comment text in the file; the checked radio of each tab set shows its panel; the text under an open editor is in the file with no `hidden`, `aria-hidden` or cell-content wrapper around it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-014](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-014.md): A writer shares one page as a self-contained HTML file
<!-- okf:links:end -->
