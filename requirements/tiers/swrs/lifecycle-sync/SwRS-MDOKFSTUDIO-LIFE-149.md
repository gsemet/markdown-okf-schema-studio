---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-149
uuid: 42644ca2-4555-4d4c-b932-d21aa5be55a7
title: The Studio runs beside the built-in Markdown preview
description: While the Studio runs, the extension SHALL open its side preview
  beside an open built-in Markdown preview and leave that preview, its commands,
  the native text diff and every markdown.preview setting and style setting of
  the built-in Markdown preview as they were.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-001
depends_on: []
annotation_exemption: true
exemption_reason: "Absence of code: no write to the built-in Markdown preview settings
  exists. No implementation marker is possible."
derived_by: []
implemented_in_files:
- src/host-vscode/activation.ts
tested_in_files:
- test/integration/stockCoexistence.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Studio runs beside the built-in Markdown preview

### Normative behavior

While the Studio runs, the extension SHALL open its side preview beside an open built-in Markdown preview and leave that preview, its commands, the native text diff and every markdown.preview setting and style setting of the built-in Markdown preview as they were.

### Scenario (nominal): Both open

- GIVEN the built-in preview of preview.md open
- WHEN the reader runs Open Preview to Side
- THEN both previews are open and the built-in commands such as markdown.showPreviewToSide and markdown.preview.refresh still exist

### Scenario (nominal): Stock settings snapshot

- GIVEN a snapshot of the built-in preview settings
- WHEN the Studio side preview opens beside the built-in preview
- THEN the snapshot is equal

### Scenario (boundary): Studio settings

- GIVEN a change of a Studio setting
- WHEN it is saved
- THEN no markdown.* key is written

### Scenario (boundary): Native diff

- GIVEN a text diff of two Markdown files while the Studio is installed
- WHEN the reader opens it
- THEN the native text diff opens as usual (the test opens the diff before it runs a Studio command, so the extension is not yet active at that moment)

### Verification notes

- Method: test/integration/stockCoexistence.test.ts (both open, stock settings snapshot by snapshotStockSettings before and after, native diff). The Studio settings scenario is untested; it is checked by reading the code, where no write to a markdown.* key exists.
- Criteria: the two snapshots are equal, the stock custom editor tab count does not drop and the diff tab opens.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-001](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-001.md): A writer opens previews beside the editor or as tabs, beside the built-in preview
<!-- okf:links:end -->
