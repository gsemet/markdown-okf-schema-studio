---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-156
uuid: 655a36e2-1384-45c5-84df-e3ccf8c2c459
title: A show-comments message of another render is ignored
description: When a previewShowComments message names another document, revision
  or request than the page's, the extension SHALL not change the show-comments
  state.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-012
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/hostHandlers.ts
tested_in_files:
- test/page/runtimePageControls.test.ts
---

## A show-comments message of another render is ignored

### Normative behavior

When a previewShowComments message names another document, revision or request than the page's, the extension SHALL not change the show-comments state.

### Scenario (nominal): Current message

- GIVEN a previewShowComments message that names the page's render
- WHEN it reaches the page
- THEN the data-okf-show-comments attribute follows its value

### Scenario (refusal): Stale message

- GIVEN a previewShowComments message that names another document, revision or request
- WHEN it reaches the page
- THEN the attribute is unchanged

### Verification notes

- Method: test/page/runtimePageControls.test.ts (unit test `T15: previewShowComments sets the show-comments attribute of the page, stale ids are ignored`: scenarios current message, stale message).
- Criteria: The attribute changes only for the current render.
