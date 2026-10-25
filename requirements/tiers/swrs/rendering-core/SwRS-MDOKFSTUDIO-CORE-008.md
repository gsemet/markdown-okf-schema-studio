---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-008
uuid: 8c1fdb2b-3e5d-415e-9146-d9b1af764c4d
title: Images fit the column, sit on the line and survive a missing file
description: When a document shows an image, the extension SHALL size it to at
  most the content column width and keep its aspect ratio, place it on the text
  line when it is written inside a line of text, and keep its element and alt
  text in document order when its local file is missing.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
- StRS-MDOKFSTUDIO-CORE-003
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/commentStyles.ts
- src/core/preview/styles/contentBlockStyles.ts
- src/core/render/mystBlockTransforms.ts
- src/core/security/html-sanitizer.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/security/html-policy.test.ts
- test/visual/scenarioDefinitions2.ts
---

## Images fit the column, sit on the line and survive a missing file

### Normative behavior

When a document shows an image, the extension SHALL size it to at most the content column width and keep its aspect ratio, place it on the text line when it is written inside a line of text, and keep its element and alt text in document order when its local file is missing.

### Scenario (nominal): Fit images in the content column

- GIVEN an image wider than the content column
- WHEN it is rendered
- THEN its width equals the column width and its height scales

### Scenario (boundary): A narrow image keeps its natural size

- GIVEN an image narrower than the column
- WHEN it is rendered
- THEN it keeps its natural size

### Scenario (nominal): Place inline images on the text line

| Input | Outcome |
| --- | --- |
| an image written inside a sentence | it is rendered inline and centred on the text line |
| an image alone in its paragraph | it is a centred figure paragraph |

### Scenario (refusal): Keep an image whose file is missing

- GIVEN an image whose local file is absent
- WHEN it is rendered
- THEN the element and alt text stay in place in document order, the source is removed and the page shows no broken-image overflow

### Scenario (boundary): An existing file loads

- GIVEN the same image with a file that exists
- WHEN it is rendered
- THEN the image loads normally

### Verification notes

- Method: Unit test "images never overflow the preview column" in test/core/preview/previewStyles.test.ts (nominal fit, boundary narrow image)
- Method: Unit test "strips figure images that escape even the workspace root" in test/security/html-policy.test.ts (refusal missing file)
- Method: Visual scenario rendering-core/v19-missing-image-dark-900 in test/visual/scenarioDefinitions2.ts (refusal missing file, boundary existing file)
- Method: Visual scenario rendering-core/v23-inline-image-in-text-light-900 in test/visual/scenarioDefinitions2.ts (nominal inline placement)
- Criteria: The image style sets max width 100 percent and automatic height. The missing-file image keeps its alt text without a `src` attribute. Both placements load, also in edit mode.
