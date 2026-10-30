---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-007
uuid: 9ee5efbd-a184-4e2b-809c-bd80a61ff977
title: "The chevron collapses the toolbar to its first row"
description: "When the reader presses the collapse button, the extension SHALL toggle
  the hidden attribute of the group that holds the navigation and view rows, which
  takes them out of the Tab order, set the button label, title and tooltip to Show
  view controls when collapsed or Hide view controls when expanded with aria-expanded
  to match, and set the attribute data-sphinx-preview-toolbar-state of the page root
  to collapsed or expanded."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/toolbarCollapse.ts
tested_in_files:
- test/page/runtimePageControls.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
---

## The chevron collapses the toolbar to its first row

### Normative behavior

When the reader presses the collapse button, the extension SHALL toggle the hidden attribute of the group that holds the navigation and view rows, which takes them out of the Tab order, set the button label, title and tooltip to Show view controls when collapsed or Hide view controls when expanded with aria-expanded to match, and set the attribute data-sphinx-preview-toolbar-state of the page root to collapsed or expanded.

### Scenario (nominal): Collapse then expand
- GIVEN an expanded toolbar
- WHEN the collapse button is pressed, then pressed again
- THEN the group is hidden, only the main row stays reachable by Tab, and then the group shows again with the same height

### Scenario (boundary): Keyboard order when collapsed
- GIVEN a collapsed toolbar
- WHEN the Tab order of the toolbar is read
- THEN it holds Refresh, Anchor, Edit and Show view controls only

### Scenario (boundary): Button and root attribute per state
| State | aria-expanded | Label, title and tooltip | data-sphinx-preview-toolbar-state of the root |
| --- | --- | --- | --- |
| collapsed | false | Show view controls | collapsed |
| expanded | true | Hide view controls | expanded |

The root never carries a data-sphinx-preview-toolbar attribute.

### Scenario (nominal): At start and after each press
- GIVEN a page that starts expanded
- WHEN the page starts and the chevron is pressed twice
- THEN the attribute is expanded at start, collapsed after the first press and expanded after the second

### Verification notes
- Method: test/page/runtimePageControls.test.ts (unit test P8: the collapse button hides rows 2 to 5, label and aria-expanded after a click, the root attribute and the assertion that the root never matches the toolbar selector; scenarios Collapse then expand, Button and root attribute per state, At start and after each press).
- Method: test/visual/capture_layout_checks.py (check_toolbar_collapse on toolbar-navigation/v07, v09, v11, v13, v15, v17, v19 and v21: Tab order, height shrinks, the toolbar does not move, expanding restores it, aria-expanded true or false; scenarios Collapse then expand, Keyboard order when collapsed, Button and root attribute per state).
- Criteria: rows.hidden follows the state; the collapsed Tab order is the main row plus Show view controls; the toolbar top and right do not change; aria-expanded and the three texts follow the collapsed flag; the root attribute equals collapsed or expanded and the root has no data-sphinx-preview-toolbar attribute.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-001](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-001.md): The toolbar groups its controls, collapses and remembers view choices
<!-- okf:links:end -->
