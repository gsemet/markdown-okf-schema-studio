---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-170
uuid: 9f1602dd-12b8-4325-aa67-b05187da91fd
title: A new page starts each view choice from the panel, stored or default
  value
description: When a page opens, the extension SHALL start each view choice from
  the saved panel state, else the stored workspace value, else the default of
  that choice, except the theme mode, which starts from the stored workspace
  value before the saved panel state.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-014
- StRS-MDOKFSTUDIO-BLOCK-001
- StRS-MDOKFSTUDIO-LAYOUT-003
- StRS-MDOKFSTUDIO-PALETTE-002
- StRS-MDOKFSTUDIO-REVIEW-012
- StRS-MDOKFSTUDIO-THEME-004
- StRS-MDOKFSTUDIO-THEME-011
- StRS-MDOKFSTUDIO-TOOLBAR-001
- StRS-MDOKFSTUDIO-TOOLBAR-006
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-TOOLBAR-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/editingConfiguration.ts
- src/core/state/previewTheme.ts
- src/core/state/previewViewPreferences.ts
- src/page/features/anchorMode.ts
- src/page/features/themeMode.ts
- src/page/modules/commentsToggle.ts
- src/page/modules/tocColumn.ts
- src/page/modules/toolbarCollapse.ts
- src/page/modules/viewControls.ts
- src/page/modules/widthMode.ts
- src/page/runtime.ts
- src/session/features/rendering.ts
- src/session/workspaceChoices.ts
tested_in_files:
- test/core/configuration/editingConfiguration.test.ts
- test/core/state/previewTheme.test.ts
- test/core/state/previewViewPreferences.test.ts
- test/integration/lifecycle.test.ts
- test/integration/paletteMode.test.ts
- test/integration/reload-suite.ts
- test/page/diagReq.themeZoom.requirements.test.ts
- test/page/modules/commentsToggle.test.ts
- test/page/modules/tocColumn.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePageControls.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-038
---

## A new page starts each view choice from the panel, stored or default value

### Normative behavior

When a page opens, the extension SHALL start each view choice from the saved panel state, else the stored workspace value, else the default of that choice, except the theme mode, which starts from the stored workspace value before the saved panel state.

### Scenario (nominal): Order of sources for each view choice

The panel state is the state the webview saved with the panel (restored panel or rebuilt page). The stored value is the choice kept for the workspace (see SwRS-MDOKFSTUDIO-LIFE-169). A value of the wrong type or outside the accepted set is skipped and the next source is used.

| View choice | Panel state (first) | Stored value (second) | Default (last) | Accepted values and normalisation |
| --- | --- | --- | --- | --- |
| Edit mode | saved editMode, a boolean | the host passes initialEditMode true only when the preview is writable and the stored edit mode is true | off (reading mode); also off when the Edit button is greyed | a saved non-boolean is ignored; a stored value that is false, absent or not a boolean gives off; a read-only preview gives off |
| Palette mode | saved paletteMode | the host gives the valid mode stored for the workspace, else the value of the setting markdownOkfSchemaStudio.editing.defaultPaletteMode | gfm | only strict, gfm, myst and full |
| Width mode | saved viewWidthMode | stored widthMode | margin | only margin, auto and full |
| Zoom | saved viewZoom | stored zoom | 100 | rounded to a multiple of 10 and clamped to 70 to 200; a value that is not a finite number is ignored |
| Toolbar rows 2 to 5 | saved viewToolbarCollapsed, a boolean | stored toolbarCollapsed | collapsed | only the stored value false expands, so a missing value gives collapsed |
| Contents column | saved viewToc, a boolean | stored toc, open only when true | closed | a saved non-boolean is ignored |
| Comments button | saved viewComments, a boolean | stored comments, hidden only when false | shown | a saved non-boolean is ignored |
| Anchor mode | saved anchorToEditor, a boolean | no stored value: the setting markdownOkfSchemaStudio.preview.scrollPreviewWithEditor | the setting value | a saved non-boolean is ignored |
| Theme mode (exception) | saved previewThemeMode (second) | stored previewThemeMode (first) | cream | only current, dark, white and cream |

### Scenario (nominal): The saved panel state wins

| Input | Outcome |
| --- | --- |
| Context initialEditMode true and saved edit mode false | edit mode is off |
| Context initialEditMode true and no saved state | edit mode is on |
| Saved paletteMode myst and host initial mode strict | the palette mode is myst |
| Saved width mode full and stored width mode auto | the width mode is full |
| Saved viewZoom 120 and initial preference 150 | the zoom is 120 |
| Saved toolbar state collapsed and stored choice expanded | the toolbar is collapsed |
| Workspace preference toc open and saved state closed | the column is closed; with no saved state it would be open |
| Saved viewComments false | the gray chips are hidden and the Comments button is not pressed |
| Saved anchor mode off and setting on | the anchor mode is off |

### Scenario (nominal): The stored value or the setting applies without a saved state

| Input | Outcome |
| --- | --- |
| Writable preview in a trusted workspace whose stored edit mode is true | the runtime context carries initialEditMode true and the page starts in edit mode |
| Stored palette mode myst and setting strict | the initial mode in the page context is myst |
| Initial zoom preference 150, no saved state | the zoom is 150 |
| Stored zoom 130 accepted from a preview (validation: SwRS-MDOKFSTUDIO-TOOLBAR-013; storage: SwRS-MDOKFSTUDIO-LIFE-169), next page of the workspace built | its initial view preferences carry the zoom 130 and, without saved state, it starts at 130 |
| Preview at 130 %, window reloaded, or preview closed and reopened | the zoom is still 130 |
| Stored toolbar choice expanded, no saved state | the toolbar is expanded |
| No webview state and the comments preference false | the gray chips are hidden |
| No saved anchor mode and setting off | the anchor mode is off; with the setting on it is on |
| Workspace that stored current, dark, white or cream in turn | the html attribute data-sphinx-preview-theme-mode equals the stored mode in each case, and current is kept as a choice, not replaced by Cream |
| Restored panel whose saved state holds white and a workspace without a stored mode | the theme mode is white |
| Restored panel whose saved state holds white and a workspace that stored dark | the theme mode is dark: the stored workspace mode wins over the saved state |

### Scenario (nominal): A fresh workspace opens on the defaults

- GIVEN a fresh workspace that stored no choice, a page with no saved state and no setting changed
- WHEN the preview page starts and nothing is clicked
- THEN the page is in reading mode, the palette mode is gfm, the width mode is margin, the zoom is 100, the toolbar is collapsed (data-sphinx-preview-toolbar-state is collapsed, the group is hidden), the contents column is closed, the comments are shown, and the theme mode is cream

The Cream start is the same on a light and on a dark host theme:

| Input | Outcome |
| --- | --- |
| Fresh workspace, light VS Code theme, 900 px pane (visual scenario theme-zoom/v12) | the html attribute data-sphinx-preview-theme-mode is cream, the Theme button label is "Preview theme: Cream theme", its tooltip is "Cream theme (click for current theme)", the body background is rgb(245, 241, 232) and the text colour is rgb(43, 42, 39) |
| Fresh workspace, dark VS Code theme, 460 px pane (visual scenario theme-zoom/v13) | the page is the same light cream paper; the host theme is not visible |

### Scenario (refusal): An invalid value is ignored and the next source is used

| Input | Outcome |
| --- | --- |
| Stored edit mode false, absent or not a boolean | initialEditMode is false and the page starts in reading mode |
| Read-only preview whose stored edit mode is true | initialEditMode is false and the page starts in reading mode |
| Invalid stored width mode and no saved state | the invalid value is ignored and the width mode is margin |
| Stored palette mode that is not a mode and setting strict | the initial mode is strict |
| No saved state and no host initial palette mode | the palette mode is gfm |
| Workspace storage holding the text sepia under the theme mode key | no stored mode is returned, the boot context of the next page carries none, and the page shows Cream |
| Workspace storage holding white | white is returned as the stored theme mode |
| Saved zoom of the text big and initial zoom 150 | the saved value is ignored and the zoom is 150 |
| Boot context whose toolbarCollapsed is missing | the toolbar is collapsed, because only the value false expands it |

### Scenario (boundary): Zoom is rounded to the grid and clamped

| Input | Outcome |
| --- | --- |
| Page: saved zoom 133, then 300, then 10 | the zoom is 130, 200 and 70 |
| Host: stored zoom values 10, 69, 104, 105, 133 and 300 | the workspace preferences give 70, 70, 100, 110, 130 and 200 |
| Host: stored zoom of the text big or NaN, or stored preferences that are not an object | the zoom is 100 |
| Neither saved state nor initial preference | the zoom is 100 |

### Scenario (boundary): Starting on a default posts nothing, and a saved anchor mode that differs is posted once

| Input | Outcome |
| --- | --- |
| Fresh workspace, preview page starts and the runtime is installed | the page posts no previewThemeModeChanged message and no previewViewPreferenceChanged message, and the toolbar start posts no preference or theme message |
| The same page, Theme button clicked once | exactly one previewThemeModeChanged message is posted, carrying the new mode |
| Saved anchor mode off and setting on | one previewAnchorModeChanged message with anchorToEditor false is posted without a press |
| Saved anchor mode equal to the setting | nothing is posted |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-169: stores the choices that this requirement reads back at the next start.
- SwRS-MDOKFSTUDIO-TOOLBAR-013: accepts and validates the view preference the host stores.

### Verification notes

- Method: test/page/runtimePageControls.test.ts (saved state wins for edit mode, width mode, zoom, toolbar and comments; fresh workspace defaults and the Cream start; the stored theme mode, toolbar choice and zoom; no message posted at start)
- Method: test/page/runtimeEditPalette.test.ts (palette mode: saved state wins, host initial mode, gfm default)
- Method: test/page/modules/commentsToggle.test.ts (comments: saved preference and webview state, the attribute follows the preference without a button)
- Method: test/page/modules/tocColumn.test.ts (contents column: closed by default, preference opens it, saved state wins)
- Method: test/page/runtimeScroll.test.ts (theme mode saved and shared harnesses, theme modes cycle and the saved selection restores, anchor mode saved state and one post when it differs, nothing when equal)
- Method: test/page/diagReq.themeZoom.requirements.test.ts (page zoom rounded, clamped and ignored when not a number)
- Method: test/core/state/previewTheme.test.ts (fresh workspace has cream, every stored theme mode restored, invalid stored value ignored)
- Method: test/core/state/previewViewPreferences.test.ts (zoom clamp and rounding, bad input falls back to the default per field, fresh workspace toolbar collapsed, stored choice wins)
- Method: test/core/configuration/editingConfiguration.test.ts (stored palette mode wins over the setting, a fresh workspace starts in gfm)
- Method: test/integration/paletteMode.test.ts (the setting gives the first palette mode and the stored mode wins)
- Method: test/integration/lifecycle.test.ts (a posted theme mode dark is the stored mode in the html of the next page)
- Method: test/integration/reload-suite.ts (130 % survives a window reload and a reopen)
- Method: visual scenarios theme-zoom/v12 and theme-zoom/v13 (Cream start on a light and on a dark host), test/visual/capture_layout_checks.py check_fresh_workspace (zero posted messages, collapsed toolbar)
- Method: the host expression initialEditMode (src/session/features/rendering.ts) has no test of its own (untested); the Cream result for an unknown stored theme value on the page is not asserted by a session test (untested)
- Criteria: each view choice equals the first valid source in the order of the table, the theme mode taking the stored value first; the zoom equals the listed rounded values; nothing is posted at start except one previewAnchorModeChanged when the saved anchor mode differs from the setting.
