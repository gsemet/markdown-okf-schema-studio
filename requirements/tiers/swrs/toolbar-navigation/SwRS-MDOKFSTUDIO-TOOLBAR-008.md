---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-008
uuid: 59f5ec50-fa88-432d-954a-3501f7068823
title: Blocks in a folded section cannot be edited
description: While a section is folded, the extension SHALL leave the blocks of
  that section out of the block selection and out of the editable blocks, so
  that no block inside it can be selected or edited until the section is
  unfolded.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: draft
status: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/mappedBlocks.ts
tested_in_files:
- test/page/mappedBlocks.test.ts
default_owner_email: gaetan@xeberon.net
---

## Blocks in a folded section cannot be edited

### Normative behavior

While a section is folded, the extension SHALL leave the blocks of that section out of the block selection and out of the editable blocks, so that no block inside it can be selected or edited until the section is unfolded.

### Scenario (nominal): A folded block cannot be selected or edited
- GIVEN a folded section with two paragraphs
- WHEN the page lists the blocks the keyboard selection and the editors can reach
- THEN the two paragraphs are not listed and no block is found at their line, so no selection or editor can open on them; after the section is unfolded they are listed again

### Scenario (boundary): The block stays mapped
- GIVEN the same folded section
- WHEN the editor and the preview scroll together
- THEN the folded blocks stay in the top-level mapped blocks used for the scroll mapping, so the source lines still line up

### Verification notes

### Verification notes

- Method: test/page/mappedBlocks.test.ts (selectableBlocks and bodyBlockAtLine leave out a block marked data-okf-folded; topLevelMappedBlocks keeps it).
- Criteria: no block with data-okf-folded is returned by selectableBlocks or bodyBlockAtLine.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-002](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-002.md): The reader folds and unfolds the sections of the document
<!-- okf:links:end -->
