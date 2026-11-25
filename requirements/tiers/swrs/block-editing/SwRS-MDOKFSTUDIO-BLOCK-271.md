---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-271
uuid: 6dd60298-e3f3-4d78-9c84-739d062fd800
title: The host gives the page the source text of the render it shows
description: When the page reports ready for the current render, the host SHALL
  post previewSourceText with the full text of that render's document, and the
  page SHALL use it only while its shown render has that identity, so that a
  content patch or a reload drops it until the next previewSourceText.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
scenarios:
- id: S1
  title: nominal
- id: S2
  title: boundary
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/session/features/viewState.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/page/runtimeRawCopy.test.ts
- test/session/previewSourceText.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host gives the page the source text of the render it shows

### Normative behavior

When the page reports ready for the current render, the host SHALL post previewSourceText with the full text of that render's document, and the page SHALL use it only while its shown render has that identity, so that a content patch or a reload drops it until the next previewSourceText.

### Scenario S1: nominal

- GIVEN a render is shown and the page reports ready
- WHEN the host receives that ready
- THEN the host posts previewSourceText with the whole document text and the render's identity

### Scenario S2: boundary

- GIVEN a content patch or another render replaces the shown one
- WHEN the page receives no new previewSourceText yet
- THEN the page holds no usable source text and a copy stays native

### Verification notes

- Method: unit tests of the protocol, the session and the page
- Criteria: the text is posted once per ready and is dropped on a patch

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
