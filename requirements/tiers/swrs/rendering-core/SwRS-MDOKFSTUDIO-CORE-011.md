---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-011
uuid: dc5147ae-f2ca-4ea3-b44b-2f9ac4eb94c3
title: Leave wikilink syntax untouched where it is not text
description: When `[[...]]` appears in code, an existing link, an image, math or
  raw HTML, or as an `![[...]]` embed, the extension SHALL NOT convert it to a
  wikilink.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-010; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-010
default_owner_email: gaetan@xeberon.net
---

## Leave wikilink syntax untouched where it is not text

### Normative behavior

When `[[...]]` appears in code, an existing link, an image, math or raw HTML, or as an `![[...]]` embed, the extension SHALL NOT convert it to a wikilink.

### Scenario: Nominal leave wikilink syntax untouched where it is not text

- GIVEN `[[Note]]` inside inline code
- WHEN it is rendered
- THEN the text stays literal code

### Scenario: Boundary or refusal of leave wikilink syntax untouched where it is not text

- GIVEN an `![[Note]]` embed
- WHEN it is rendered
- THEN it is not converted to a link

### Verification notes

- Method: Unit test "wikilinks render as lazy note targets without changing code or existing links" in test/core/render/mystFeatures.test.ts
- Criteria: Wikilinks are converted only in plain text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-010](SwRS-MDOKFSTUDIO-CORE-010.md): Wikilinks render as links where they are text
<!-- okf:links:end -->
