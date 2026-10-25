---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-001
uuid: f1c9745f-e89f-41fd-9837-0b7304d53752
title: A read-only preview offers no editing affordance
description: When a preview is read-only (created for a document that lies in no
  workspace folder, or while the workspace is untrusted), the extension SHALL
  show it with every affordance that edits, comments or changes the document
  absent, and otherwise writable.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-001
- StRS-MDOKFSTUDIO-BLOCK-001
- StRS-MDOKFSTUDIO-PALETTE-002
- StRS-MDOKFSTUDIO-REVIEW-001
- StRS-MDOKFSTUDIO-TOOLBAR-001
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-LIFE-026
- SwRS-MDOKFSTUDIO-BLOCK-017
- SwRS-MDOKFSTUDIO-FMEDIT-001
- SwRS-MDOKFSTUDIO-TABLE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/propertiesTable.ts
- src/core/preview/previewToolbar.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/editMode.ts
- src/page/features/pageInput.ts
- src/page/modules/commentThreads.ts
- src/page/runtime.ts
- src/session/features/viewState.ts
- src/session/hostEvents.ts
- src/session/previewManager.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/commentWrite.test.ts
- test/integration/standalone-suite.ts
- test/integration/untrusted-suite.ts
- test/page/modules/commentThreads.test.ts
- test/page/runtimeEditPalette.test.ts
- test/page/runtimePageControls.test.ts
- test/security/trustReq.requirements.test.ts
- test/visual/capture_layout_checks.py
- test/visual/scenarioDefinitions2.ts
---

## A read-only preview offers no editing affordance

### Normative behavior

When a preview is read-only (created for a document that lies in no workspace folder, or while the workspace is untrusted), the extension SHALL show it with every affordance that edits, comments or changes the document absent, and otherwise writable.

### Scenario (nominal): Writable or read-only at creation

- GIVEN a Markdown document and a window
- WHEN the reader opens the preview with the Open Preview to Side command or with Open With
- THEN the preview is writable when the document lies inside a folder of a trusted workspace, and read-only (showing the rendered document) otherwise

| Input | Outcome |
| --- | --- |
| Trusted workspace, document inside one of its folders | Writable |
| Window in Restricted Mode (untrusted workspace) | Read-only; the command preview and the Open With editor report readOnly true |
| Markdown file that lies in no workspace folder of a trusted window (standalone file) | Read-only |

### Scenario (nominal): One row per affordance

- GIVEN a read-only preview of a document with at least five frontmatter fields, a table and a paragraph
- WHEN the reader looks at the page and acts on it
- THEN each editing affordance of the table is absent, and none of the actions below happens

| Affordance | In a read-only preview |
| --- | --- |
| Edit button | Not rendered: the toolbar keeps the same three rows with 12 buttons (row 1 holds Refresh, Anchor and the collapse button; rows 2 and 3 are unchanged), and no element carries data-sphinx-preview-edit-toggle |
| Edit mode at start | Off (state.editMode is false whenever the toggle button is absent), even when the context has initialEditMode true |
| Edition palette | None built: no element with data-sphinx-edit-palette exists |
| Palette mode message | previewPaletteModeChanged is never posted |
| Comment button | Not installed: selecting text shows no Comment button, and Cmd+Alt+M or Ctrl+Alt+M does nothing (the runtime context carries commentsEnabled false and the compose module is not created); same for a preview of a standalone file |
| Comment box | Not installed (same condition as the Comment button) |
| Thread popover | Lists the comments and the Resolved note, with no reply box, no Resolve button and no Delete button (the controls exist only when the reply, resolve and remove hooks are given) |
| Properties table | Every field row says data-okf-editable false and no cell carries data-okf-edit-cell |
| Edit target under the pointer | The block under the pointer has no edit-target mark (no data-sphinx-preview-edit-hover), no outline and a normal text cursor |
| Click on a paragraph | No block editor opens |
| Click on a table cell | No cell editor, no cell bar and no table action opens |
| Click on a frontmatter value | No frontmatter editor opens |

### Scenario (nominal): The same page in a writable preview

- GIVEN a preview created in a trusted workspace, with the same document
- WHEN the page is rendered and the reader acts on it
- THEN the affordances of the previous scenario are present

| Affordance | In a writable preview |
| --- | --- |
| Edit button | Present: the toolbar holds 13 buttons |
| Edit mode at start | On when the context has initialEditMode true (a page that has the Edit button) |
| Properties table | The name and value cells carry data-okf-edit-cell and the rows say data-okf-editable true |
| Edit target under the pointer | With edit mode on, a paragraph under the pointer is outlined as the block a click would edit (see SwRS-MDOKFSTUDIO-BLOCK-017) |
| Popover of a review thread | The reply box and the Resolve and Delete buttons exist |
| Click in a table | The cell editor opens (see SwRS-MDOKFSTUDIO-TABLE-001) |
| Click on a frontmatter value | The field editor opens in edit mode (see SwRS-MDOKFSTUDIO-FMEDIT-001) |

### Scenario (refusal): A palette mode message from a read-only preview

- GIVEN a previewPaletteModeChanged message that reaches the host from a read-only preview
- WHEN the host handles it
- THEN the stored mode is not changed

The refusal of write requests is that of SwRS-MDOKFSTUDIO-TRUST-005.

### Scenario (boundary): Trust granted while a preview is open

| Input | Outcome |
| --- | --- |
| A preview created read-only in an untrusted workspace, then the reader trusts the workspace | The preview still refuses edits until it switches to a document that creates a new session or is reopened |
| A preview created in a trusted workspace, then trust is granted again | It stays writable |

### Scenario (boundary): The manifest declares limited support for untrusted workspaces

- GIVEN the package.json of the extension, which has a main entry point
- WHEN VS Code decides whether the extension runs in a window in Restricted Mode
- THEN the extension runs, because the manifest declares the limited support, and its read-only preview is the one described above

| Input | Outcome |
| --- | --- |
| capabilities.untrustedWorkspaces.supported in package.json | "limited", with a description that says the preview is read-only |
| capabilities.untrustedWorkspaces.restrictedConfigurations | The PlantUML engine settings plantuml.useJar and plantuml.jarPath: a value from the workspace is ignored in Restricted Mode |
| A manifest without the declaration, or with another value | The check fails (VS Code then disables a packaged extension in Restricted Mode) |

### Known issues

- Known issue: session.readOnly is fixed when the session is created and nothing resets it on a trust grant, so a preview opened in Restricted Mode stays read-only after the reader trusts the workspace until a document switch creates a new session or the panel is reopened.
- Known issue: the first load of a read-only page is built in src/session/webview.ts without the read-only flag, so its properties table carries edit cells and rows that say data-okf-editable true; the host replaces the table with a non-editable one after the frontmatter links are resolved, shortly after the render. No editor can open in between, because every frontmatter editor needs edit mode, which a page without an Edit button never switches on. Deduced from the code, not run.

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-005: the host refuses every write request of a read-only preview with a reason
- SwRS-MDOKFSTUDIO-LIFE-170: a new page starts each view choice from the saved, stored or default value
- SwRS-MDOKFSTUDIO-LIFE-026: the side preview follows the active Markdown editor
- SwRS-MDOKFSTUDIO-BLOCK-017: the hover outline of a writable preview
- SwRS-MDOKFSTUDIO-FMEDIT-001: the field editor opens in edit mode only
- SwRS-MDOKFSTUDIO-TABLE-001: the cell editor of a writable preview

### Verification notes

- Method: Integration suites test/integration/untrusted-suite.ts (the command preview and the Open With editor of an untrusted workspace report readOnly true; the real-window scenario trust-security/r01-untrusted-read-only shows the side preview rendered with no Edit button) and test/integration/standalone-suite.ts (a file outside the workspace reports readOnly true, a document of the workspace false), which check the first scenario. The decision is taken in createSession of src/session/previewManager.ts.
- Method: Unit test `T38: a read-only preview never starts in edit mode` in test/page/runtimePageControls.test.ts (Edit mode at start, both the read-only and the writable case).
- Method: Unit test of the toolbar markup in test/core/preview/previewStyles.test.ts (12 buttons without the Edit button, 13 with it) and the visual toolbar check test/visual/capture_layout_checks.py, which fails when a read-only toolbar still has an Edit button.
- Method: Unit test `T23: a read-only preview has no palette and never posts the message` in test/page/runtimeEditPalette.test.ts (palette and palette mode message rows); the host side refusal of the previewPaletteModeChanged scenario is deduced from the code (the handler checks preview.readOnly), not tested.
- Method: The integration test test/integration/commentWrite.test.ts (a read-only preview page carries commentsEnabled false); the unit tests of the compose module install it only when comments are enabled. The absence of the button in a real page is deduced from the code (commentCompose is created only when commentsEnabled), not run.
- Method: Unit tests `T43: no reply box without a reply hook (read-only previews)` and `T44: without resolve and delete hooks (read-only) the popover has neither button` in test/page/modules/commentThreads.test.ts (thread popover rows).
- Method: Visual scenarios trust-security/v01-read-only-page-dark-900 and trust-security/v02-read-only-page-light-460 in test/visual/scenarioDefinitions2.ts (READ_ONLY_ASSERTIONS: no edit cell, every row not editable), and trust-security/v03-read-only-no-hover-outline-light-900 (READ_ONLY_NO_HOVER_ASSERTIONS: no edit-target mark, no outline, cursor not a pointer; no block editor after the paragraph click). These scenarios build the page in test/visual/renderFixtures.ts with the read-only flag, not through the host page build, so no test covers the properties table Known issue. The table cell click and the frontmatter click rows are untested; they are deduced from the code: the click handlers of src/page/features/pageInput.ts open editors only when edit mode is on, which a page without an Edit button never is.
- Method: Unit test "granting trust does not make an open read-only preview writable (Known issue)" in test/host/lifeReq.requirements.test.ts, checked by reading onTrustGranted, which only schedules the incoming-change marks, and createSession and switchDocument where the read-only state is set (trust granted scenario).
- Method: Unit test "the manifest declares limited support for untrusted workspaces" in test/security/trustReq.requirements.test.ts, which asserts the declaration, its description and the restricted settings in package.json, the inputs VS Code reads to decide (extensionManifestPropertiesService, VS Code 1.143.1 bundle: an extension with a main entry point and no declaration is disabled in Restricted Mode). The Restricted Mode integration suite test/integration/untrusted-suite.ts loads the extension from the development path, which is not disabled either way, so it asserts the declaration through the installed extension manifest instead; a packaged VSIX is not run in a Restricted Mode window.
- Criteria: The readOnly flag of the preview is true exactly when the document has no workspace folder or the workspace is untrusted; a read-only page has no Edit button, no palette, no Comment button, no reply, Resolve or Delete control, no edit cell, no edit-target mark and no editor element after the clicks; session.readOnly is unchanged by onTrustGranted; package.json declares capabilities.untrustedWorkspaces.supported as limited.
