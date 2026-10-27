---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-069
uuid: bbe01c8a-5fba-4d2f-8ada-9d7f4b6c5ada
title: A render of the loaded document updates the page in place
description: When a render finishes and the loaded page can take its content,
  the extension SHALL send only the new content of the page as a content patch,
  which the page applies in place and reports ready, instead of a new page
  document.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-005
- StRS-MDOKFSTUDIO-LIFE-007
- StRS-MDOKFSTUDIO-LIFE-010
- StRS-MDOKFSTUDIO-LIFE-021
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/contentPatch.ts
- src/page/features/contentPatch.ts
- src/page/features/insertPoints.ts
- src/page/features/scrollCore.ts
- src/page/modules/contentMorph.ts
- src/session/features/rendering.ts
tested_in_files:
- test/core/configuration/previewConfiguration.test.ts
- test/core/preview/contentPatch.test.ts
- test/page/modules/contentMorph.test.ts
- test/page/runtimeContentPatch.test.ts
---

## A render of the loaded document updates the page in place

### Normative behavior

When a render finishes and the loaded page can take its content, the extension SHALL send only the new content of the page as a content patch, which the page applies in place and reports ready, instead of a new page document.

### Scenario (nominal): Typing

- GIVEN a ready page of preview.md, incremental updates on, and no condition of the requirement that loads a new page document (SwRS-MDOKFSTUDIO-LIFE-071) met
- WHEN the writer types and a render finishes
- THEN the host posts previewContentPatch with the inner HTML of the content container and does not assign a new page document (unit test test/page/runtimeContentPatch.test.ts "T34: a content patch replaces the content, moves the identifiers and posts previewReady")

### Scenario (boundary): The incrementalUpdates setting

| Input | Outcome |
| --- | --- |
| No stored value for markdownOkfSchemaStudio.preview.incrementalUpdates, preview settings read | incrementalUpdates is true |
| The setting set to false in the settings editor, a render finishes | The page document is assigned again with the new HTML, without a window reload |

### Scenario (refusal): One of the exceptions

- GIVEN the new render has another shell, for example math appears
- WHEN the render finishes
- THEN the whole page is assigned instead (see SwRS-MDOKFSTUDIO-LIFE-071)

### Scenario (nominal): Patches in a chain

| Input | Outcome |
| --- | --- |
| Two patches addressed to consecutive identifiers, received before the page acknowledged the previous one | Both apply in order and the page ends on the identifiers of the second |
| A patch with stale fields in the middle of a chain | The later patches are ignored and nothing is acknowledged (a rejected patch stops the chain) |

### Scenario (nominal): Ready report after a patch

- GIVEN a patch moving the page from request 1 to request 2
- WHEN the page applies it
- THEN it posts previewReady for request 2 with its reading state; if a block editor was open when the patch arrived, the report says no block editor is open (blockEditOpen false)

### Scenario (nominal): What the page does when it applies a patch

| Input | Outcome |
| --- | --- |
| A page with the first and third details elements open | The first and third details elements of the new content are open |
| No details element open | No initial state is kept and the sections of the new content start closed |
| A patch that carries an initial anchor line or a pin | The page scrolls so the line sits at the reading line, like a loaded page |
| A patch without anchor and pin | The scroll position is kept |
| A visible pending notice | The notice is gone |
| No notice shown | Nothing is created |
| A link tooltip open on the old content | The tooltip is closed |
| No tooltip | Nothing changes |

### Scenario (nominal): Unchanged blocks stay in place

- GIVEN ten blocks and a patch that changes the fifth
- WHEN the page replaces the content
- THEN nine nodes are the same elements as before, with their focus, selection, loaded images and diagrams, and only the fifth comes from the patch (unit test test/page/modules/contentMorph.test.ts "PERF-05: unchanged blocks are kept in place, changed and new ones come from the patch")

### Scenario (boundary): Repeated blocks and links

- GIVEN three identical paragraphs, a paragraph with a link, and a node the page added itself
- WHEN the page replaces the content
- THEN equal blocks pair in document order and each kept node is used once, a block with a link has the same key as on the first load, and page-added or text nodes are never kept

### Scenario (boundary): The loaded page is not parsed again

- GIVEN a patch that moved the page to a new render, and the next render of the same document
- WHEN the host plans the next patch against the recorded page (the new render of the last plan, with the nonce of the loaded page)
- THEN only the new render is parsed; the shell of the loaded page comes from the plan that produced it

### Scenario (nominal): A line inserted above keeps the blocks below

- GIVEN a document of 200 blocks and a patch that adds one paragraph at the top, so that every block below it moves down by two source lines
- WHEN the page replaces the content
- THEN the 200 existing blocks are the same elements as before, the paragraph is the only new element, and each kept block carries the new `data-line`, `data-sphinx-source-line`, `data-sphinx-source-end-line` and `data-sphinx-preview-block` values (unit test test/page/modules/contentMorph.test.ts "P-07: a line inserted above keeps every block below it and moves its line attributes in place")

### Scenario (boundary): What the key of a block holds

| Input | Outcome |
| --- | --- |
| Two blocks whose HTML differs only in `data-line`, `data-sphinx-source-line`, `data-sphinx-source-end-line` or `data-sphinx-preview-block` | Equal keys; the kept node gets the new values written onto it and its descendants |
| A patch that moves no block | No attribute of a kept node is written |
| The key of a block | A hash of its HTML (two 32-bit hashes and the length), not the HTML itself |
| An insertion bar of edit mode after a kept block | The bar stays after the block; the bar after a replaced or removed block is dropped |
| Edit mode refreshed after a patch | A bar whose block and neighbouring blocks are unchanged is kept and only its line number moves; the others are created or removed |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-071: the conditions that load a new page document instead of a patch

### Verification notes

- Method: test/core/preview/contentPatch.test.ts (Typing, One of the exceptions): "T34: two renders of one document type have equal shell keys despite other text, nonces and identifiers".
- Method: test/core/preview/contentPatch.test.ts (The loaded page is not parsed again): "P-03: a plan parses the new page only, because the loaded page was analyzed as the previous new page".
- Method: test/page/runtimeContentPatch.test.ts (Typing, Patches in a chain, Ready report after a patch, What the page does when it applies a patch): "T34: a content patch replaces the content, moves the identifiers and posts previewReady", "T34: patches sent before the page acknowledged the previous one apply in order", "T34: when a patch of a chain is rejected, the later ones are ignored and nothing is acknowledged", "STAB-02: a patch that closes an open block editor reports blockEditOpen false", "T34: open disclosures of the old content are open again in the new content", "T34: a patch with an anchor or a pin positions the page like a loaded page", "T34: a patch keeps the scroll position when the host sends no anchor", "T34: the patch removes the pending overlay and the link tooltip".
- Method: test/core/configuration/previewConfiguration.test.ts (The incrementalUpdates setting, default row): "incremental updates can be turned off and default to on"; the off path is never exercised end to end (untested).
- Method: test/page/modules/contentMorph.test.ts (Unchanged blocks stay in place, Repeated blocks and links): "PERF-05: unchanged blocks are kept in place, changed and new ones come from the patch", "PERF-05: equal blocks pair in document order and each kept node is used once", "PERF-05: the first page and a patch give a block with a link the same key", "PERF-05: nodes without a recorded key (text, nodes the page added) are never kept", "PERF-05: a link title the host wrote itself stays part of the key".
- Method: test/page/modules/contentMorph.test.ts (A line inserted above keeps the blocks below, What the key of a block holds): "P-07: the key leaves out the source-position attributes and a hash replaces the HTML", "P-07: a line inserted above keeps every block below it and moves its line attributes in place", "P-07: the insertion bars of kept blocks stay with them and bars of dropped blocks go".
- Method: test/page/runtimeContentPatch.test.ts (What the key of a block holds, edit mode row): "P-07: edit mode keeps the insertion point of a block that did not change and moves its line".
- Criteria: Equal shell keys and context keys give a patch and the page document is not reassigned; readPreviewConfiguration returns true for no value and false for false, and updatePreview patches only when the value is true; the page identifiers equal those of the last applied patch; the posted message carries the new documentId, revision and requestId; context.initialState.openDisclosures lists the open indexes before restoreState; window.scrollY after the patch equals the anchor target or the previous value; no element with data-sphinx-preview-pending-overlay and no link tooltip element remains; kept nodes are identical objects in the document.
