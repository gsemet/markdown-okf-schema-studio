---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-001
uuid: 4a5407ea-d383-42da-b785-a7d78937fb65
title: The toolbar groups its controls, collapses and remembers view choices
description: When a reader opens a preview, the Studio SHALL show its controls
  in three clearly grouped rows that never overlap each other, let the reader
  collapse them to the first row, and keep the view choices for the workspace,
  in read-only previews too.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I find the preview controls in three clear rows, fold
  the toolbar down to its first row to free the top of the pane and unfold it
  again, and find my view choices (zoom, width mode, table of contents,
  incoming-change marks, comments and the collapsed toolbar) again when I reopen
  a preview of the same workspace, even in a read-only preview where I cannot
  edit.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TOOLBAR-001
- SwRS-MDOKFSTUDIO-TOOLBAR-007
- SwRS-MDOKFSTUDIO-TOOLBAR-013
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-TRUST-006
default_owner_email: gaetan@xeberon.net
---

## The toolbar groups its controls, collapses and remembers view choices

### Normative behavior

When a reader opens a preview, the Studio SHALL show its controls in three clearly grouped rows that never overlap each other, let the reader collapse them to the first row, and keep the view choices for the workspace, in read-only previews too.

### Preserved stakeholder intent

As a reader, I find the preview controls in three clear rows, fold the toolbar down to its first row to free the top of the pane and unfold it again, and find my view choices (zoom, width mode, table of contents, incoming-change marks, comments and the collapsed toolbar) again when I reopen a preview of the same workspace, even in a read-only preview where I cannot edit.

### Rationale and constraints

- Row 1 holds Refresh, Anchor, Edit and the collapse button; row 2 holds Back, Next, Zoom out and Zoom in; row 3 holds Theme, Width, Table of contents, Fold, Diff and Comments.
- A read-only preview (untrusted workspace, standalone file) shows the same rows, with the Edit button greyed and a tooltip that gives the reason.
- The rows stay inside the pane at narrow and wide widths, at the zoom limits, in the light, dark, white and cream themes, expanded or collapsed.
- Pressing the chevron of the toolbar hides or shows the navigation and view rows, and the choice is kept for the workspace.
- A workspace that has stored no choice opens with the toolbar collapsed.
- Hidden rows are skipped by the Tab key, so keyboard users reach only what is shown.
- The state of a restored panel wins over the workspace choice, which wins over the default.
- A view preference only changes how the preview looks, never the document, so a read-only preview accepts it.
- A value that is not valid for its preference is refused; a stored value that is not valid falls back to the default of that preference alone.
- The meaning of zoom and width is described in the theme-zoom and layout-width scopes.
- Known issue: the toolbar floats over the page, so text that scrolls under it is covered; only the first element of a document gets room under it (see the first-element gap of the layout-width scope).
- When the workspace storage cannot be written, the choice is kept for the session and the reader gets one short warning that it will not survive a restart.
