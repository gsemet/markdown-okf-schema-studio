---
type: StRS
id: StRS-MDOKFSTUDIO-TRUST-001
uuid: ac15f392-751d-459b-bc19-b98f630f2348
title: A document outside a trusted folder opens read-only and keeps the viewing
  actions
description: When a reader previews a document in an untrusted workspace or a
  file outside every workspace folder, the Studio SHALL show the rendered
  document read-only, without any control that edits it, refuse with a reason
  any change that is asked for and write nothing, while zooming, changing the
  theme, following links and copying code work as in a writable preview.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I open a document in Restricted Mode, or a file from
  outside my workspace, and see it rendered without any control that could edit
  it; I am told why a change is refused and no file of mine is touched; and I
  still zoom, switch theme, follow links and copy code.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-026
- SwRS-MDOKFSTUDIO-TRUST-001
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-006
---

## A document outside a trusted folder opens read-only and keeps the viewing actions

### Normative behavior

When a reader previews a document in an untrusted workspace or a file outside every workspace folder, the Studio SHALL show the rendered document read-only, without any control that edits it, refuse with a reason any change that is asked for and write nothing, while zooming, changing the theme, following links and copying code work as in a writable preview.

### Preserved stakeholder intent

As a reader, I open a document in Restricted Mode, or a file from outside my workspace, and see it rendered without any control that could edit it; I am told why a change is refused and no file of mine is touched; and I still zoom, switch theme, follow links and copy code.

### Rationale and constraints

- Restricted Mode and a file outside every workspace folder share one read-only preview.
- The toolbar, the properties table and the blocks offer no editing in it; no edition palette is shown and the palette mode is kept as it is.
- The review threads are shown without any control to change them, and nothing is written.
- A preview that is open when the user trusts the workspace is covered by SwRS-MDOKFSTUDIO-TRUST-001.
- This record holds the rule that applies to every kind of change. The wording of each refusal is specified with the feature that owns the action (block editing, table editing, frontmatter editing, labels, checkboxes, images, comments).
- An action that changes no file is never refused because the preview is read-only; the theme mode and the zoom only change how the preview looks, never the document, so no trust is needed.
- The viewing actions themselves are specified in the theme and zoom, toolbar and navigation, and code block scopes.
