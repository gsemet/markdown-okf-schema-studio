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
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
scenarios:
- id: S1
  title: One row per view choice
- id: S2
  title: The page keeps its saved state
- id: S3
  title: The host stores a preference as one normalized object
- id: S4
  title: The host remembers a valid theme, edit mode or palette mode
- id: S5
  title: Zoom and own-key rows of a view preference message
- id: S6
  title: No change, no message
- id: S7
  title: The host refuses a value outside the table
- id: S8
  title: A stale message stores nothing where the row says so
- id: S9
  title: The storage is missing or rejects the write
- id: S10
  title: Stored preferences are normalized field by field
- id: S11
  title: A palette mode or a theme mode outside the four is dropped
- id: S12
  title: An accepted palette mode or theme mode
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
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
- test/core/protocol/pageStateMessages.test.ts
- test/core/protocol/pageToHost.test.ts
- test/core/state/previewTheme.test.ts
- test/core/state/previewViewPreferences.test.ts
- test/integration/paletteMode.test.ts
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
- SwRS-MDOKFSTUDIO-PALETTE-010
- SwRS-MDOKFSTUDIO-THEME-013
- SwRS-MDOKFSTUDIO-TOOLBAR-013
---

## A view choice made on the page is stored for the workspace

### Normative behavior

When the writer changes a view choice on the page, the extension SHALL keep it in the saved state of the panel, post it to the host with the identity of the page, and let the host validate it and store it for the workspace according to the table of view choices.

### Scenario S1 (nominal): One row per view choice

- GIVEN a preview with the identity of its current render
- WHEN the writer changes one of the view choices of the table
- THEN the page writes the saved-state field of the row next to the other saved fields, posts the message of the row with the document, revision and request identity of the page, and the host stores the value under the storage key of the row

| View choice | Page control | Saved-state field | Message and field | Accepted values | Host validation | Storage key | Preview with restricted reads |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Edit mode | Edit button | editMode | previewEditModeChanged, editMode | boolean | Dropped unless the value is a boolean | markdownOkfSchemaStudio.editMode | Stored like any other |
| Palette mode | Mode select of the block editor | paletteMode | previewPaletteModeChanged, mode | strict, gfm, myst, full | Dropped unless the mode is one of the four | markdownOkfSchemaStudio.paletteMode | Stored like any other |
| Theme mode | Theme button | previewThemeMode | previewThemeModeChanged, previewThemeMode | current, dark, white, cream | Dropped unless the value is one of the four | previewThemeMode | Stored |
| Zoom | Zoom in and Zoom out | viewZoom | previewViewPreferenceChanged, preference zoom | integer from 70 to 200 | Refused outside the range or when not an integer | markdownOkfSchemaStudio.viewPreferences, field zoom | Stored |
| Width mode | Width button | viewWidthMode | previewViewPreferenceChanged, preference widthMode | margin, auto, full | Refused for any other value | markdownOkfSchemaStudio.viewPreferences, field widthMode | Stored |
| Table of contents | Table of contents button | viewToc | previewViewPreferenceChanged, preference toc | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field toc | Stored |
| Toolbar collapsed | Chevron of the toolbar | viewToolbarCollapsed | previewViewPreferenceChanged, preference toolbarCollapsed | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field toolbarCollapsed | Stored |
| Comments | Comments button | viewComments | previewViewPreferenceChanged, preference comments | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field comments | Stored |
| Incoming changes | Diff button | viewIncomingChanges | previewViewPreferenceChanged, preference incomingChanges | boolean | Refused when not a boolean | markdownOkfSchemaStudio.viewPreferences, field incomingChanges | Stored |
| Anchor mode | Anchor button | anchorToEditor | previewAnchorModeChanged, anchorToEditor | boolean | Dropped unless the value is a boolean | None: set as scrollPreviewWithEditor in the configuration and the loaded context of that preview only | Applied to that preview |

### Scenario S2 (nominal): The page keeps its saved state

- GIVEN a saved state that already holds scroll fields and other view fields
- WHEN the writer presses the Theme button, the Edit button, a Zoom button, the Width button, the Table of contents button or the chevron, or the page writes a state snapshot
- THEN the saved state holds the new value (previewThemeMode dark after Current, editMode true then false on two presses, viewZoom 110 from 100, viewWidthMode auto from margin, viewToc true, viewToolbarCollapsed true then false on a second press with a second message of value false) and keeps its other fields; after a patch to a newer revision the message carries the identity the patch moved the page to (untested for this message); the snapshot keeps previewThemeMode (cream in Cream mode), the TOC visibility and the folded sections

### Scenario S3 (nominal): The host stores a preference as one normalized object

- GIVEN a workspace storage and a previewViewPreferenceChanged message with preference toc and value true
- WHEN the host handles the message
- THEN the session preferences hold toc true and the key markdownOkfSchemaStudio.viewPreferences holds the whole normalized preferences object, not the one field

### Scenario S4 (nominal): The host remembers a valid theme, edit mode or palette mode

- GIVEN an open preview whose workspace holds no stored value
- WHEN the page reports previewThemeModeChanged dark, previewEditModeChanged with editMode true, or previewPaletteModeChanged gfm
- THEN the value is held for the session where the row says so, written to the workspace storage, and carried by the boot context of the next page of the workspace (the theme mode dark; the palette mode gfm wins over the setting)

### Scenario S5 (boundary): Zoom and own-key rows of a view preference message

| Input | Outcome |
| --- | --- |
| zoom 70, 130 and 200 | all three are accepted |
| zoom 60, 210, 1.2, the text 100 and NaN | all five are dropped without an answer and the stored zoom is unchanged |
| toc, incomingChanges, comments and toolbarCollapsed with a boolean; widthMode margin, auto or full | each message is accepted |
| toc of the string true, comments of 1, widthMode wide or the number 1 | each message is refused and the host does not change a preference |
| an unknown preference name, or a name that is not an own key of the validators | refused |

### Scenario S6 (boundary): No change, no message

- GIVEN a page at 200 percent zoom, or a page that has just started
- WHEN Zoom in is clicked at 200 percent, or nothing is clicked, or the page calls setMode on the palette
- THEN no zoom message and no previewPaletteModeChanged message is posted; a chosen palette mode in the select posts exactly one previewPaletteModeChanged (from the GFM mode choosing MyST: one message with mode myst, saved state paletteMode myst)

### Scenario S7 (refusal): The host refuses a value outside the table

- GIVEN an open preview
- WHEN a message arrives with the width mode wide, a zoom outside 70 to 200, a preference name that is not in the table, a theme mode that is not one of the four, a palette mode that is not strict, gfm, myst or full, or an editMode or anchorToEditor that is not a boolean
- THEN the message is refused or ignored by the validator of its type and the stored value is unchanged

### Scenario S8 (refusal): A stale message stores nothing where the row says so

- GIVEN a message that names an older render than the page now holds, or an edit mode or palette mode report whose value is invalid
- WHEN the host receives it
- THEN the stale message is dropped before its handler (by the page-state gate for previewThemeModeChanged, previewEditModeChanged and previewAnchorModeChanged, by the render gate for previewViewPreferenceChanged and previewPaletteModeChanged), an invalid edit mode or palette mode is not stored, and no preference changes

### Scenario S9 (boundary): The storage is missing or rejects the write

- GIVEN workspace storage whose update fails, or choices whose storage is not loaded or was released at deactivation
- WHEN the host stores a theme mode or a view preference picked by the reader
- THEN the value is held for the session, a rejected write is logged to the output channel of the extension as "Failed to persist the Markdown preview theme mode." or "Failed to persist the Markdown preview view preferences." and shows the reader one warning, "The Markdown preview could not save your display choice; it holds until VS Code closes.", repeated only after a write succeeded in between, and with no storage nothing is written and nothing is logged

### Scenario S10 (boundary): Stored preferences are normalized field by field

| Stored value | Outcome |
| --- | --- |
| widthMode bad and toc true | widthMode margin, toc stays true (only the bad field is replaced) |
| A list, or missing | Every field has its default: zoom 100, widthMode margin, toc off, incomingChanges on, comments on, toolbarCollapsed on |
| Any applied preference | The whole object is normalized again (applyViewPreference), so the stored object is always valid |

### Scenario S11 (refusal): A palette mode or a theme mode outside the four is dropped

- GIVEN a workspace whose stored palette mode is gfm and an open preview
- WHEN the page posts previewPaletteModeChanged with a mode of the table, or previewThemeModeChanged with a theme mode of the table
- THEN the message is rejected by the protocol validator of its type, nothing is stored, no result is posted to the page, and the next preview still starts in the stored mode

| Message | Field value | Outcome |
| --- | --- | --- |
| previewPaletteModeChanged | html | rejected |
| previewPaletteModeChanged | the empty text | rejected |
| previewPaletteModeChanged | a number or true (not a string) | rejected |
| previewPaletteModeChanged | missing | rejected |
| previewThemeModeChanged | sepia (or neon) | rejected |
| previewThemeModeChanged | missing previewThemeMode | rejected |

### Scenario S12 (nominal): An accepted palette mode or theme mode

- GIVEN a palette whose select changes to another of the modes strict, gfm, myst or full, or the Theme button pressed (any of current, dark, white and cream)
- WHEN the page posts the message once, with the identity fields documentId, revision and requestId (the envelope is checked first, see SwRS-MDOKFSTUDIO-TRUST-052) and the field mode or previewThemeMode
- THEN the host accepts it through the gate of its type (see SwRS-MDOKFSTUDIO-TRUST-065), stores the mode for the workspace, and the next preview starts in it (see SwRS-MDOKFSTUDIO-LIFE-170)

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-170: the start of a new page from the saved, stored or default value of each choice, with its rounding.
- SwRS-MDOKFSTUDIO-TRUST-005: a preview with restricted reads keeps the viewing choices (theme, zoom, width, table of contents, comments, incoming changes).

### Verification notes

- Method: test/page/blockReq.requirements.test.ts (the saved state holds editMode next to its other fields, on and off).
- Method: test/session/blockReq.requirements.test.ts (the host stores a boolean edit mode, also from a preview with restricted reads, and ignores the non-boolean reports).
- Method: test/page/runtimeScroll.test.ts (the theme click posts previewThemeModeChanged with the page identity and writes previewThemeMode; the anchor switch posts previewAnchorModeChanged; the identity after a patch and the snapshot field are untested).
- Method: test/page/runtimePageControls.test.ts (zoom buttons post zoom and write viewZoom, the zoom limits post nothing more, the width button cycles margin, auto, full, the collapse button, the table of contents button).
- Method: test/page/modules/editPalette.test.ts and test/page/runtimeEditPalette.test.ts (one previewPaletteModeChanged per chosen mode, none after setMode).
- Method: test/page/modules/tocColumn.test.ts (the toggle posts toc and remembers it).
- Method: test/integration/paletteMode.test.ts (a reported palette mode is stored and wins over the setting in the next panel; the Restricted Mode case is checked in test/session/diagReq.viewState.requirements.test.ts).
- Method: test/integration/lifecycle.test.ts and test/core/state/previewTheme.test.ts (previewThemeModeChanged dark is stored and carried by the next page; the stale-message drop is checked in test/session/diagReq.viewState.requirements.test.ts).
- Method: test/core/state/previewViewPreferences.test.ts (one key, normalized object, no write without storage) and test/core/protocol/pageToHost.test.ts (validators, width mode wide refused).
- Method: test/session/diagReq.viewState.requirements.test.ts (a theme mode or a view preference that cannot be saved still holds for the session, is logged by the logger of the host, and warns the reader once).
- Method: test/integration/previewEditing.test.ts (previewAnchorModeChanged false then true sets the configuration of the preview; the update of the loaded context is untested).
- Method: test/core/protocol/pageToHost.test.ts (previewPaletteModeChanged accepts only strict, gfm, myst or full: html, the empty text, true and a missing mode are rejected; the number case is deduced from the validator, not tested) and test/integration/paletteMode.test.ts (an invalid palette mode is not stored); test/integration/untrusted-suite.ts (the palette mode of a Restricted Mode preview)
- Method: test/core/protocol/pageStateMessages.test.ts, unit test `the page-state validators accept exactly what the frozen validator accepted` (the theme modes cream and neon and an absent mode, on the live validator PAGE_TO_HOST_VALIDATORS.previewThemeModeChanged in src/core/protocol/pageToHost.ts; the guard in src/session/features/viewState.ts repeats the check and is not tested separately)
- Criteria: after each change the saved state, the posted message and the stored value equal the value shown; an invalid value leaves the stored value unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-014](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-014.md): Previews come back after a reload, and each document keeps its reading place and view choices
  - [StRS-MDOKFSTUDIO-BLOCK-001](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-001.md): A writer switches edit mode and finds it as left
- Depends on:
  - [SwRS-MDOKFSTUDIO-LIFE-170](SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LAYOUT-021](../layout-width/SwRS-MDOKFSTUDIO-LAYOUT-021.md): A width mode choice is saved for the workspace
  - [SwRS-MDOKFSTUDIO-PALETTE-010](../palette-slash/SwRS-MDOKFSTUDIO-PALETTE-010.md): An unknown palette mode is refused and stores nothing
  - [SwRS-MDOKFSTUDIO-THEME-013](../theme-zoom/SwRS-MDOKFSTUDIO-THEME-013.md): The host drops a theme-mode message with an unknown mode
  - [SwRS-MDOKFSTUDIO-TOOLBAR-013](../toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-013.md): The host accepts only a known view preference with a valid value
<!-- okf:links:end -->
