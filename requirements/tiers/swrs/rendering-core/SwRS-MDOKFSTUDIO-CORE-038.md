---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-038
uuid: 8cf0970f-4bad-418e-b4cd-f00973949449
title: Render a very long document completely
description: When a document of about 6000 lines is rendered, the extension
  SHALL render every section and heading and keep the last paragraph reachable.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-001
default_owner_email: gaetan@xeberon.net
---

## Render a very long document completely

### Normative behavior

When a document of about 6000 lines is rendered, the extension SHALL render every section and heading and keep the last paragraph reachable.

### Scenario: Nominal render a very long document completely

- GIVEN a document of 335 sections and 336 headings
- WHEN it is rendered
- THEN all headings appear

### Scenario: Boundary or refusal of render a very long document completely

- GIVEN the end of that page
- WHEN it is scrolled to
- THEN the last paragraph is visible

### Verification notes

- Method: Visual scenario rendering-core/v20-huge-document-bottom-dark-900 in test/visual/scenarioDefinitions2.ts
- Criteria: All headings and the last paragraph are present.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-001](SwRS-MDOKFSTUDIO-CORE-001.md): The preview renders the unsaved buffer completely, in process
<!-- okf:links:end -->
