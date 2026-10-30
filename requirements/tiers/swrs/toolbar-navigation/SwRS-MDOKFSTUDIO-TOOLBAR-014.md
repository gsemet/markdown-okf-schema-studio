---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-014
uuid: bf155d49-423d-4516-8ce1-10a23d4a93cb
title: Replace is unavailable in a read-only preview
description: While the preview is read-only or a block editor is open, the find
  bar SHALL keep finding and SHALL refuse every replacement with the reason,
  without editing the document.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: draft
status: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/findBar.ts
tested_in_files:
- test/integration/findInPreview.test.ts
- test/page/modules/findBar.test.ts
- test/session/reviewReqThreads.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## Replace is unavailable in a read-only preview

### Normative behavior

While the preview is read-only or a block editor is open, the find bar SHALL keep finding and SHALL refuse every replacement with the reason, without editing the document.

### Scenario (failure): Read-only preview or open editor
- GIVEN a preview without a trusted workspace folder, or with a block editor open
- WHEN the reader opens the replace row or presses Replace or Replace all
- THEN the replace controls are marked aria-disabled with the reason as title, the note shows the reason, the host is not asked and the document is unchanged; finding keeps working

### Scenario (failure): The host refuses
- GIVEN a request that reaches the host in a read-only preview, with a Markdown edit open or from an older render
- WHEN the host handles it
- THEN it answers with the reason and does not read or change the document

### Verification notes

- Method: test/page/modules/findBar.test.ts (the replace toggle is disabled with the reason, the row stays closed, finding works, the host is not asked).
- Method: test/session/reviewReqThreads.requirements.test.ts (a read-only preview and an open edit are refused before the document is read) and test/session/trustReq.requirements.test.ts (an older render is answered with the out-of-date reason).
- Criteria: no edit is applied and the answer carries the reason.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-003](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-003.md): The reader finds and replaces text in the preview
<!-- okf:links:end -->
