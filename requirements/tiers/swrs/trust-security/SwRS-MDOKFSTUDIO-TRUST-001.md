---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-001
uuid: f1c9745f-e89f-41fd-9837-0b7304d53752
title: A document is editable whatever the trust; only its reads are restricted
description: When a preview is created for a document that lies in no workspace
  folder, or while the workspace is untrusted, the extension SHALL keep every
  editing affordance on, as in a trusted workspace, and narrow only what the
  preview reads.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
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
- src/core/configuration/settingsRegistry.ts
- src/core/edits/readOnlyReasons.ts
- src/core/frontmatter/propertiesTable.ts
- src/page/features/blockSourceEditor.ts
- src/page/features/editMode.ts
- src/page/features/pageInput.ts
- src/page/modules/commentThreads.ts
- src/page/runtime.ts
- src/session/features/viewState.ts
- src/session/hostEvents.ts
- src/session/previewManager.ts
- src/session/sessionDocuments.ts
- src/session/sessionFactory.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/host/fmtableReq.requirements.test.ts
- test/host/lifeReq.requirements.test.ts
- test/integration/commentWrite.test.ts
- test/integration/standalone-suite.ts
- test/integration/untrusted-suite.ts
- test/page/modules/commentThreads.test.ts
- test/security/trustReq.requirements.test.ts
- test/session/blockReq.requirements.test.ts
- test/session/dropFiles.requirements.test.ts
- test/session/readOnlyFirstLoad.test.ts
- test/session/readOnlyImagesSession.test.ts
- test/session/renderReq.labelRename.requirements.test.ts
- test/session/reviewReqThreads.requirements.test.ts
- test/visual/capture_layout_checks.py
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## A document is editable whatever the trust; only its reads are restricted

### Normative behavior

When a preview is created for a document that lies in no workspace folder, or while the workspace is untrusted, the extension SHALL keep every affordance that edits, comments or changes the document, exactly as in a trusted workspace (the Edit button, the edition palette, the Comment button and thread controls, the editable properties table and the block, cell and field editors), and SHALL narrow only what the preview reads (includes, resources, schema files; see SwRS-MDOKFSTUDIO-TRUST-002 and SwRS-MDOKFSTUDIO-TRUST-007). Trust never makes a document read-only. A feature that needs trust stays disabled and gives its reason where it is used.

### Scenario (nominal): Restricted reads at creation

- GIVEN a Markdown document and a window
- WHEN the reader opens the preview with the Open Preview to Side command or with Open With
- THEN the preview has full reads when the document lies inside a folder of a trusted workspace, and restricted reads otherwise; in both cases it is editable

| Input | Outcome |
| --- | --- |
| Trusted workspace, document inside one of its folders | Full reads, editable |
| Window in Restricted Mode (untrusted workspace) | Restricted reads, editable; the command preview and the Open With editor report restrictedReads true |
| Markdown file that lies in no workspace folder of a trusted window (standalone file) | Restricted reads, editable |
| A file that VS Code holds read-only (files.readonlyInclude, or made read-only in the session) | The preview offers the same controls; every write path (label rename, thread reply and delete, find and replace, block save, move, cut, paste, drop, checkbox and radio toggle, metadata save) checks that VS Code wrote the edit, and answers "This file is read-only in VS Code." when it accepted the edit and left the text unchanged; a pasted image whose block save fails that way is deleted again |

### Scenario (nominal): Every editing affordance is present

- GIVEN a preview with restricted reads of a document with at least five frontmatter fields, a table and a paragraph
- WHEN the reader looks at the page and acts on it
- THEN each affordance below is present and works as in a trusted workspace

| Affordance | In a preview with restricted reads |
| --- | --- |
| Edit button | Enabled: the toolbar holds the same five rows with 15 buttons, the Edit button has no aria-disabled attribute and its title and tooltip say "Edit mode"; a click toggles the edit mode |
| Edit mode at start | Off, or on when the saved state of the same document holds edit mode true |
| Edition palette | Built, and the palette mode message previewPaletteModeChanged is posted and stored for the workspace |
| Comment button | Installed (the runtime context carries commentsEnabled true); Cmd+Alt+M or Ctrl+Alt+M opens the comment box |
| Thread popover | The reply box and the Resolve and Delete buttons exist |
| Properties table | The name and value cells carry data-okf-edit-cell and the rows say data-okf-editable true |
| Edit target under the pointer | With edit mode on, a paragraph under the pointer is outlined as the block a click would edit (see SwRS-MDOKFSTUDIO-BLOCK-017) |
| Click on a paragraph, a table cell, a frontmatter value | The block, cell or field editor opens (see SwRS-MDOKFSTUDIO-TABLE-001 and SwRS-MDOKFSTUDIO-FMEDIT-001) |
| Checkboxes and radio options | Enabled; a click is written to the source |

### Scenario (boundary): What stays off because it needs trust

- GIVEN a preview with restricted reads
- WHEN the reader uses a feature of the table
- THEN the feature is off, and the reason is shown where it is used or in the existing diagnostics; there is no banner

| Feature that needs trust | In a preview with restricted reads |
| --- | --- |
| PlantUML with Java (the jar pipeline) | No process starts; the diagram shows "PlantUML preview is disabled in an untrusted workspace." (see SwRS-MDOKFSTUDIO-DIAG-024) |
| Includes, images and resources | Read from the folder of the document only, never below a dot-directory, images only outside it (see SwRS-MDOKFSTUDIO-TRUST-002) |
| Schema lookup of the properties table | Not resolved; the generic table shows an info row (see SwRS-MDOKFSTUDIO-FMSCHEMA-019) |
| Citation list of the palette | Refused with "Listing citations searches the workspace for .bib files, which needs a trusted workspace folder that holds this file." (see SwRS-MDOKFSTUDIO-TRUST-005) |
| Linked scripts of the document | Not allowed (the sanitizer removes them in every mode) |
| MyST extension warnings in the Problems view, and the incoming-change marks | Published only for a trusted workspace (see SwRS-MDOKFSTUDIO-MYST-078); the incoming-change marks are posted for a trusted, tracked file only |
| Workspace values of the restricted settings | Ignored (see the manifest scenario) |

### Scenario (boundary): Trust granted or a folder added while a preview is open

| Input | Outcome |
| --- | --- |
| A preview created in an untrusted workspace, then the reader trusts the workspace | The preview moves to a session with full reads without being reopened: it renders once and keeps its reading state; its resource roots and navigation roots become the workspace folders |
| A preview created in a trusted workspace, then trust is granted again | It keeps its session |
| A preview of a file in no workspace folder of a trusted window, then a folder that holds the file is added (in the Agents window, the folder of the agent session becomes active) | The preview moves to a session of that folder with full reads on the same panel, renders once and keeps its reading state; the active preview stays the active one |
| The same, for a preview of a file that the added folder does not hold | It keeps restricted reads, on its own session |
| Any of the above while the preview has an open block, cell or field editor | The page is asked to save and close its editor first (the previewFlushEdit request, as before a document switch), then the session is replaced: the typed text is kept |

A preview whose folder is removed gets restricted reads on the same panel: see SwRS-MDOKFSTUDIO-LIFE-143.

### Scenario (boundary): The manifest declares limited support for untrusted workspaces

- GIVEN the package.json of the extension, which has a main entry point
- WHEN VS Code decides whether the extension runs in a window in Restricted Mode
- THEN the extension runs, because the manifest declares the limited support, and its description says that editing stays on and reads are narrowed

| Input | Outcome |
| --- | --- |
| capabilities.untrustedWorkspaces.supported in package.json | "limited", with a description that says the reader can still edit, and does not call the preview read-only |
| capabilities.untrustedWorkspaces.restrictedConfigurations | The PlantUML engine settings plantuml.useJar and plantuml.jarPath, and the frontmatter path settings frontmatter.bundleRoot, frontmatter.projectRoot and frontmatter.allowOutsideWorkspaceLinks: a value from the workspace is ignored in Restricted Mode. The list is generated from the settings registry by just generate-settings |
| A manifest without the declaration, or with another value | The check fails (VS Code then disables a packaged extension in Restricted Mode) |

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-005: the host handles the write requests of every preview
- SwRS-MDOKFSTUDIO-LIFE-170: a new page starts each view choice from the saved, stored or default value
- SwRS-MDOKFSTUDIO-LIFE-026: the side preview follows the active Markdown editor
- SwRS-MDOKFSTUDIO-BLOCK-017: the hover outline shows what a click would edit
- SwRS-MDOKFSTUDIO-FMEDIT-001: the field editor opens in edit mode only
- SwRS-MDOKFSTUDIO-TABLE-001: the cell editor of a preview

### Verification notes

- Method: Unit tests in test/host/lifeReq.requirements.test.ts ("a document outside the workspace folder gets a new session on the same panel": restrictedReads true and an enabled Edit button for a standalone file; "granting trust turns an open Restricted Mode preview into one with full reads": restrictedReads true then false, same panel, workspace roots, one render, and an enabled Edit button in Restricted Mode; "adding a workspace folder gives the previews of its files full reads on the same panel": the folder-added rows; "granting trust flushes the open page editor before the preview is replaced": the previewFlushEdit request is posted once, while the old session is alive, when a page editor is open).
- Method: Unit test "the first load of a page with restricted reads has edit cells in the properties table and an enabled Edit button" in test/session/readOnlyFirstLoad.test.ts (properties table and Edit button rows of the page built by the host).
- Method: Unit test of the toolbar markup in test/core/preview/previewStyles.test.ts (15 buttons, no aria-disabled) and `T38: toggling edit mode posts previewEditModeChanged` in test/page/runtimePageControls.test.ts (a click toggles the edit mode).
- Method: Unit tests of the host handlers in test/session/blockReq.requirements.test.ts, test/session/checkboxRefusal.test.ts, test/session/reviewReqComments.requirements.test.ts and test/host/fmtableReq.requirements.test.ts show that a preview with restricted reads, an untrusted workspace and a standalone file included, is not refused for trust (see SwRS-MDOKFSTUDIO-TRUST-005).
- Method: Integration suites test/integration/untrusted-suite.ts (the command preview and the Open With editor of an untrusted workspace report restrictedReads true, carry an enabled Edit button, store the palette mode, move a block, copy and paste blocks, write a comment and a pasted image; the real-window scenario trust-security/r01-untrusted-read-only shows the side preview with the enabled Edit button and the edit mode on) and test/integration/standalone-suite.ts (a file outside the workspace reports restrictedReads true, a document of the workspace false, and a frontmatter save is applied). They run in the real-window jobs only: they were compiled but not run on the author's machine.
- Method: Visual scenarios trust-security/v01-restricted-page-dark-900 and trust-security/v02-restricted-page-light-460 in test/visual/scenarioDefinitions2.ts (RESTRICTED_PAGE_ASSERTIONS: the Edit button is enabled, the frontmatter cells are editable) and trust-security/v03-restricted-opens-block-editor-light-900 (RESTRICTED_EDITS_ASSERTIONS: edit mode on and the block editor opens after a click on a paragraph). They build the page in test/visual/renderFixtures.ts with the restrictedReads option.
- Method: Unit test "the manifest declares limited support for untrusted workspaces" in test/security/trustReq.requirements.test.ts, which asserts the declaration, its description (editing stays on, no "read-only") and the five restricted settings in package.json (and that the list is the registry's). A packaged VSIX is not run in a Restricted Mode window.
- Method: Unit tests of the write paths with a document that VS Code holds read-only: test/session/blockReq.requirements.test.ts (block save, move, cut, paste and the pasted image removed), test/session/dropFiles.requirements.test.ts, test/session/reviewReqThreads.requirements.test.ts, test/session/renderReq.labelRename.requirements.test.ts and test/host/fmtableReq.requirements.test.ts (metadata save); each answers the READ_ONLY_FILE reason, with restricted reads too.
- Criteria: The restrictedReads flag of the preview is true exactly when the document has no workspace folder or the workspace is untrusted; it narrows reads only (resource policy, includes, schema resolution, link roots, external scripts) and gates no write; the page of such a preview has an enabled Edit button, a palette, a Comment button, thread controls and editable cells; after onTrustGranted an open preview of a workspace file is a new session on the same panel (restrictedReads false, the workspace folders as roots) and the active preview stays the active one; package.json declares capabilities.untrustedWorkspaces.supported as limited.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-001](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-001.md): A document opens editable whatever the trust, with narrow reads outside a trusted folder
  - [StRS-MDOKFSTUDIO-BLOCK-001](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-001.md): A writer switches edit mode and finds it as left
  - [StRS-MDOKFSTUDIO-PALETTE-002](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-002.md): A writer chooses which palette buttons are offered
  - [StRS-MDOKFSTUDIO-REVIEW-001](../../strs/review-annotations/StRS-MDOKFSTUDIO-REVIEW-001.md): A reviewer reads review threads on the text, and unplaceable ones are kept
  - [StRS-MDOKFSTUDIO-TOOLBAR-001](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-001.md): The toolbar groups its controls, collapses and remembers view choices
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-005](SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the write requests of every preview, whatever the trust
  - [SwRS-MDOKFSTUDIO-LIFE-170](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-LIFE-026](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-026.md): The side preview follows the active Markdown editor
  - [SwRS-MDOKFSTUDIO-BLOCK-017](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-017.md): The hover outline shows what a click would edit
  - [SwRS-MDOKFSTUDIO-FMEDIT-001](../frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-001.md): A click on a field in edit mode opens its editor in place
  - [SwRS-MDOKFSTUDIO-TABLE-001](../table-editing/SwRS-MDOKFSTUDIO-TABLE-001.md): A click on a pipe table cell opens a cell editor in place
<!-- okf:links:end -->
