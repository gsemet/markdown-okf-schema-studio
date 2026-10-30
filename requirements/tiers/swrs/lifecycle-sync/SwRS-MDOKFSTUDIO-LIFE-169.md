---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-169
uuid: f4b6cbd3-fe56-4d6f-b3dc-c9e86f2d114a
title: A view choice made on the page is stored for the workspace
description: When the writer changes a view choice on the page, the extension
  SHALL keep it in the saved state of the panel, post it to the host with the
  identity of the page, and let the host validate it and store it for the
  workspace according to the table of view choices.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-014
- StRS-MDOKFSTUDIO-BLOCK-001
- StRS-MDOKFSTUDIO-LAYOUT-003
- StRS-MDOKFSTUDIO-PALETTE-002
- StRS-MDOKFSTUDIO-THEME-004
- StRS-MDOKFSTUDIO-THEME-011
- StRS-MDOKFSTUDIO-TOOLBAR-001
- StRS-MDOKFSTUDIO-TOOLBAR-006
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/state/previewViewPreferences.ts
- src/page/features/anchorMode.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/editMode.ts
- src/page/features/themeMode.ts
- src/page/modules/editPalette.ts
- src/page/modules/tocColumn.ts
- src/page/modules/toolbarCollapse.ts
- src/page/modules/viewControls.ts
- src/page/modules/widthMode.ts
- src/session/features/scrollSync.ts
- src/session/features/viewState.ts
- src/session/workspaceChoices.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/core/state/previewTheme.test.ts
- test/core/state/previewViewPreferences.test.ts
- test/integration/lifecycle.test.ts
- test/integration/paletteMode.test.ts
- test/integration/previewEditing.test.ts
- test/page/blockReq.requirements.test.ts
- test/page/modules/editPalette.test.ts
- test/page/modules/tocColumn.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePageControls.test.ts
- test/page/runtimeScroll.test.ts
- test/session/blockReq.requirements.test.ts
- test/session/diagReq.viewState.requirements.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-021
---

## A view choice made on the page is stored for the workspace

### Normative behavior

When the writer changes a view choice on the page, the extension SHALL keep it in the saved state of the panel, post it to the host with the identity of the page, and let the host validate it and store it for the workspace according to the table of view choices.

### Scenario (nominal): One row per view choice

- GIVEN a preview with the identity of its current render
- WHEN the writer changes one of the view choices of the table
- THEN the page writes the saved-state field of the row next to the other saved fields, posts the message of the row with the document, revision and request identity of the page, and the host stores the value under the storage key of the row

| View choice | Page control | Saved-state field | Message and field | Accepted values | Host validation | Storage key | Read-only preview |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Edit mode | Edit button | editMode | previewEditModeChanged, editMode | boolean | Dropped unless the preview is writable and the value is a boolean | markdownOkfSchemaStudio.editMode | Not stored |
| Palette mode | Mode select of the block editor | paletteMode | previewPaletteModeChanged, mode | strict, gfm, myst, full | Dropped unless the preview is writable and the mode is one of the four | markdownOkfSchemaStudio.paletteMode | Not stored |
| Theme mode | Theme button | previewThemeMode | previewThemeModeChanged, previewThemeMode | current, dark, white, cream | Dropped unless the value is one of the four | previewThemeMode | Stored |
| Zoom | Zoom in and Zoom out | viewZoom | previewViewPreferenceChanged, preference zoom | integer from 70 to 200 | Refused outside the range or when not an integer | markdownOkfSchemaStudio.viewPreferences, field zoom | Stored |
| Width mode | Width button | viewWidthMode | previewViewPreferenceChanged, preference widthMode | margin, auto, full | Refused for any other value | markdownOkfSchemaStudio.viewPreferences, field widthMode | Stored |
| Table of contents | Table of contents button | viewToc | previewViewPreferenceChanged, preference toc | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field toc | Stored |
| Toolbar collapsed | Chevron of the toolbar | viewToolbarCollapsed | previewViewPreferenceChanged, preference toolbarCollapsed | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field toolbarCollapsed | Stored |
| Comments | Comments button | viewComments | previewViewPreferenceChanged, preference comments | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field comments | Stored |
| Incoming changes | Diff button | viewIncomingChanges | previewViewPreferenceChanged, preference incomingChanges | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field incomingChanges | Stored |
| Anchor mode | Anchor button | anchorToEditor | previewAnchorModeChanged, anchorToEditor | boolean | Dropped unless the value is a boolean | None: set as scrollPreviewWithEditor in the configuration and the loaded context of that preview only | Applied to that preview |

### Scenario (nominal): The page keeps its saved state

- GIVEN a saved state that already holds scroll fields and other view fields
- WHEN the writer presses the Theme button, the Edit button, a Zoom button, the Width button, the Table of contents button or the chevron, or the page writes a state snapshot
- THEN the saved state holds the new value (previewThemeMode dark after Current, editMode true then false on two presses, viewZoom 110 from 100, viewWidthMode auto from margin, viewToc true, viewToolbarCollapsed true then false on a second press with a second message of value false) and keeps its other fields; after a patch to a newer revision the message carries the identity the patch moved the page to (untested for this message); the snapshot keeps previewThemeMode (cream in Cream mode), the TOC visibility and the folded sections

### Scenario (nominal): The host stores a preference as one normalized object

- GIVEN a workspace storage and a previewViewPreferenceChanged message with preference toc and value true
- WHEN the host handles the message
- THEN the session preferences hold toc true and the key markdownOkfSchemaStudio.viewPreferences holds the whole normalized preferences object, not the one field

### Scenario (nominal): The host remembers a valid theme, edit mode or palette mode

- GIVEN an open writable preview whose workspace holds no stored value
- WHEN the page reports previewThemeModeChanged dark, previewEditModeChanged with editMode true, or previewPaletteModeChanged gfm
- THEN the value is held for the session where the row says so, written to the workspace storage, and carried by the boot context of the next page of the workspace (the theme mode dark; the palette mode gfm wins over the setting)

### Scenario (boundary): No change, no message

- GIVEN a page at 200 percent zoom, or a page that has just started
- WHEN Zoom in is clicked at 200 percent, or nothing is clicked, or the page calls setMode on the palette
- THEN no zoom message and no previewPaletteModeChanged message is posted; a chosen palette mode in the select posts exactly one previewPaletteModeChanged (from the GFM mode choosing MyST: one message with mode myst, saved state paletteMode myst)

### Scenario (refusal): The host refuses a value outside the table

- GIVEN an open preview
- WHEN a message arrives with the width mode wide, a zoom outside 70 to 200, a preference name that is not in the table, a theme mode that is not one of the four, a palette mode that is not strict, gfm, myst or full, or an editMode or anchorToEditor that is not a boolean
- THEN the message is refused or ignored by the validator of its type and the stored value is unchanged

### Scenario (refusal): A stale message or a read-only preview stores nothing where the row says so

- GIVEN a message that names an older render than the page now holds, or an edit mode or palette mode report from a read-only or untrusted preview
- WHEN the host receives it
- THEN the stale message is dropped before its handler (by the page-state gate for previewThemeModeChanged, previewEditModeChanged and previewAnchorModeChanged, by the render gate for previewViewPreferenceChanged and previewPaletteModeChanged), a read-only preview stores no edit mode and no palette mode, and no preference changes

### Scenario (boundary): The storage is missing or rejects the write

- GIVEN workspace storage whose update fails, or choices whose storage is not loaded or was released at deactivation
- WHEN the host stores a theme mode or a view preference picked by the reader
- THEN the value is held for the session, a rejected write is logged to the output channel of the extension as "Failed to persist the Markdown preview theme mode." or "Failed to persist the Markdown preview view preferences." and shows the reader one warning, "The Markdown preview could not save your display choice; it holds until VS Code closes.", repeated only after a write succeeded in between, and with no storage nothing is written and nothing is logged

### Scenario (boundary): Stored preferences are normalized field by field

| Stored value | Outcome |
| --- | --- |
| widthMode bad and toc true | widthMode margin, toc stays true (only the bad field is replaced) |
| A list, or missing | Every field has its default: zoom 100, widthMode margin, toc off, incomingChanges on, comments on, toolbarCollapsed on |
| Any applied preference | The whole object is normalized again (applyViewPreference), so the stored object is always valid |

### Known issues

- Known issue: the preference message is accepted by read-only and untrusted previews because it edits no document.

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-170: the start of a new page from the saved, stored or default value of each choice, with its rounding.
- SwRS-MDOKFSTUDIO-TRUST-006: a read-only preview keeps the viewing choices (theme, zoom, width, table of contents, comments, incoming changes).

### Verification notes

- Method: test/page/blockReq.requirements.test.ts (the saved state holds editMode next to its other fields, on and off).
- Method: test/session/blockReq.requirements.test.ts (the host stores a boolean edit mode of a writable preview and ignores the read-only and the non-boolean reports).
- Method: test/page/runtimeScroll.test.ts (the theme click posts previewThemeModeChanged with the page identity and writes previewThemeMode; the anchor switch posts previewAnchorModeChanged; the identity after a patch and the snapshot field are untested).
- Method: test/page/runtimePageControls.test.ts (zoom buttons post zoom and write viewZoom, the zoom limits post nothing more, the width button cycles margin, auto, full, the collapse button, the table of contents button).
- Method: test/page/modules/editPalette.test.ts and test/page/runtimeEditPalette.test.ts (one previewPaletteModeChanged per chosen mode, none after setMode).
- Method: test/page/modules/tocColumn.test.ts (the toggle posts toc and remembers it).
- Method: test/integration/paletteMode.test.ts (a reported palette mode is stored and wins over the setting in the next panel; the read-only case is deduced from the code, untested).
- Method: test/integration/lifecycle.test.ts and test/core/state/previewTheme.test.ts (previewThemeModeChanged dark is stored and carried by the next page; the stale-message drop is untested).
- Method: test/core/state/previewViewPreferences.test.ts (one key, normalized object, no write without storage) and test/core/protocol/pageToHost.test.ts (validators, width mode wide refused).
- Method: test/session/diagReq.viewState.requirements.test.ts (a theme mode or a view preference that cannot be saved still holds for the session, is logged by the logger of the host, and warns the reader once).
- Method: test/integration/previewEditing.test.ts (previewAnchorModeChanged false then true sets the configuration of the preview; the update of the loaded context is untested).
- Criteria: after each change the saved state, the posted message and the stored value equal the value shown; an invalid value leaves the stored value unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-014](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-014.md): Previews come back after a reload, remember recent documents and leave nothing behind
  - [StRS-MDOKFSTUDIO-BLOCK-001](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-001.md): A writer switches edit mode and finds it as left
  - [StRS-MDOKFSTUDIO-LAYOUT-003](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
  - [StRS-MDOKFSTUDIO-PALETTE-002](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-002.md): A writer chooses which palette buttons are offered
  - [StRS-MDOKFSTUDIO-THEME-004](../../strs/theme-zoom/StRS-MDOKFSTUDIO-THEME-004.md): The theme choice holds for the workspace and survives slow loads and bad values
  - [StRS-MDOKFSTUDIO-THEME-011](../../strs/theme-zoom/StRS-MDOKFSTUDIO-THEME-011.md): A reader zooms the text and the column and keeps the zoom
  - [StRS-MDOKFSTUDIO-TOOLBAR-001](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-001.md): The toolbar groups its controls, collapses and remembers view choices
  - [StRS-MDOKFSTUDIO-TOOLBAR-006](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-006.md): The reader uses a table of contents beside the document
  - [StRS-MDOKFSTUDIO-TOOLBAR-013](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-013.md): The reader decides how the panes scroll together and sees the cursor block
- Depends on:
  - [SwRS-MDOKFSTUDIO-LIFE-170](SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LAYOUT-021](../layout-width/SwRS-MDOKFSTUDIO-LAYOUT-021.md): A width mode choice is saved for the workspace
<!-- okf:links:end -->
