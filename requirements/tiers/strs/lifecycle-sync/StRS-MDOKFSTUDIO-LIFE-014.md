---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-014
uuid: e890a901-dcbc-4816-8bf4-c7c922ac9233
title: Previews come back after a reload, remember recent documents and leave
  nothing behind
description: When VS Code restores its window, a reader returns to a document
  that a preview showed before, or a reader closes a preview or removes a
  workspace folder, the Studio SHALL bring the previews back on their documents
  at the reading state they had, stopping the work of the previews concerned and
  leaving every file as it was.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I reload the window and my previews come back on the
  same documents, at the same place, with their open sections; I return to a
  document and find it at its own place, with its own Description choice; and I
  close a preview or remove a folder from the workspace and no work or warning
  of that preview lingers.
derived_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-014
- SwRS-MDOKFSTUDIO-LIFE-002
- SwRS-MDOKFSTUDIO-LIFE-038
- SwRS-MDOKFSTUDIO-LIFE-071
- SwRS-MDOKFSTUDIO-LIFE-125
- SwRS-MDOKFSTUDIO-LIFE-127
- SwRS-MDOKFSTUDIO-LIFE-136
- SwRS-MDOKFSTUDIO-LIFE-137
- SwRS-MDOKFSTUDIO-LIFE-143
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
default_owner_email: gaetan@xeberon.net
---

## Previews come back after a reload, remember recent documents and leave nothing behind

### Normative behavior

When VS Code restores its window, a reader returns to a document that a preview showed before, or a reader closes a preview or removes a workspace folder, the Studio SHALL bring the previews back on their documents at the reading state they had, stopping the work of the previews concerned and leaving every file as it was.

### Preserved stakeholder intent

As a reader, I reload the window and my previews come back on the same documents, at the same place, with their open sections; I return to a document and find it at its own place, with its own Description choice; and I close a preview or remove a folder from the workspace and no work or warning of that preview lingers.

### Rationale and constraints

- A panel whose saved identity or source is unusable explains why instead of showing a preview.
- Only the newest restored side preview keeps following the active editor.
- Deactivating the extension leaves the panels to VS Code, which restores them later.
- The remembered state is bounded so that it never grows without limit.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-014](../../swrs/frontmatter-schema/SwRS-MDOKFSTUDIO-FMSCHEMA-014.md): The Description column collapses and the choice is kept per document
  - [SwRS-MDOKFSTUDIO-LIFE-002](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-002.md): A background failure is logged to the extension output channel
  - [SwRS-MDOKFSTUDIO-LIFE-038](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-038.md): Each preview has its own state and only the newest follows
  - [SwRS-MDOKFSTUDIO-LIFE-071](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-071.md): A render that cannot patch loads a new page document
  - [SwRS-MDOKFSTUDIO-LIFE-125](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-125.md): The reading state of recent documents is saved within bounds
  - [SwRS-MDOKFSTUDIO-LIFE-127](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-127.md): A restored panel reopens its document or explains why it cannot
  - [SwRS-MDOKFSTUDIO-LIFE-136](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-136.md): A saved state keeps at most 100 open-section indexes between 0 and 9999
  - [SwRS-MDOKFSTUDIO-LIFE-137](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-137.md): A saved state keeps a focused block id of at most 200 characters, a selection of at most 4096 and a boolean Description state
  - [SwRS-MDOKFSTUDIO-LIFE-143](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-143.md): Closing a preview or folder leaves nothing behind
  - [SwRS-MDOKFSTUDIO-LIFE-169](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
<!-- okf:links:end -->
