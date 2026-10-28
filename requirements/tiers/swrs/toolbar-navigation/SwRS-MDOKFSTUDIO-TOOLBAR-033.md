---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-033
uuid: 91c09cbb-9778-48e8-a035-c527d56aab94
title: "The Table of contents button shows and hides the column"
description: "When the reader presses the Table of contents button, the extension
  SHALL toggle the open state of the column, set the button's aria-pressed, label,
  title and tooltip to Hide table of contents when open or Show table of contents
  when closed, set the attribute data-sphinx-preview-toc of the page root to open
  or closed, and run the layout update for the changed available width once."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-006
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/tocColumn.ts
tested_in_files:
- test/page/modules/tocColumn.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
---

## The Table of contents button shows and hides the column

### Normative behavior

When the reader presses the Table of contents button, the extension SHALL toggle the open state of the column, set the button's aria-pressed, label, title and tooltip to Hide table of contents when open or Show table of contents when closed, set the attribute data-sphinx-preview-toc of the page root to open or closed, and run the layout update for the changed available width once.

### Scenario (nominal): Open then close
- GIVEN a closed column
- WHEN the button is pressed, then pressed again
- THEN the column opens with aria-pressed true and the label Hide table of contents, then closes with aria-pressed false and the label Show table of contents

### Scenario (boundary): Initial state
- GIVEN the toolbar markup before the page script runs, and a page with no stored choice
- WHEN the button is read and the page starts
- THEN aria-pressed is false, the label is Show table of contents and the root attribute is closed

### Scenario (nominal): Root attribute follows each press
- GIVEN a page with the column closed
- WHEN the button is pressed twice
- THEN data-sphinx-preview-toc of the root is open after the first press and closed after the second

### Scenario (nominal): Each press runs the layout update once
- GIVEN a closed column
- WHEN the button is pressed
- THEN the change callback runs once
- WHEN the button is pressed again on the open column
- THEN the callback runs once more

### Related requirements
- SwRS-MDOKFSTUDIO-LIFE-169: the choice made with the button is stored for the workspace.
- SwRS-MDOKFSTUDIO-LIFE-170: a new page starts the column from the saved, stored or default value.

### Verification notes
- Method: test/page/modules/tocColumn.test.ts (all scenarios: the TOC is off by default and the page is marked closed; the toggle opens the TOC, posts the preference, remembers it and builds the entries; the toolbar markup test checks the initial attributes; the change callback count).
- Method: test/visual/capture_layout_checks.py (Root attribute follows each press through check_toc_column: state closed, then open).
- Criteria: aria-pressed and the three texts follow the open flag; the root attribute is open or closed; one callback call per press.
