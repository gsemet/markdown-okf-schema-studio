---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-009
uuid: 0d7b12f3-1d2b-4e4f-945f-b6f8dbe322ed
title: Keep an image whose file is missing
description: When an image points to a local file that does not exist, the
  extension SHALL keep the image element and its alt text in document order and
  remove its source.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-008; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-008
default_owner_email: gaetan@xeberon.net
---

## Keep an image whose file is missing

### Normative behavior

When an image points to a local file that does not exist, the extension SHALL keep the image element and its alt text in document order and remove its source.

### Scenario: Nominal keep an image whose file is missing

- GIVEN an image whose local file is absent
- WHEN it is rendered
- THEN the element and alt text stay in place and the page shows no broken-image overflow

### Scenario: Boundary or refusal of keep an image whose file is missing

- GIVEN the same image with a file that exists
- WHEN it is rendered
- THEN the image loads normally

### Verification notes

- Method: Unit test "strips figure images that escape even the workspace root" in test/security/html-policy.test.ts; Visual scenario rendering-core/v19-missing-image-dark-900 in test/visual/scenarioDefinitions2.ts
- Criteria: The missing-file image keeps its alt text without a `src` attribute.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-003](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-003.md): A reader sees what cannot be rendered and keeps a usable preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-008](SwRS-MDOKFSTUDIO-CORE-008.md): Images fit the column, sit on the line and survive a missing file
<!-- okf:links:end -->
