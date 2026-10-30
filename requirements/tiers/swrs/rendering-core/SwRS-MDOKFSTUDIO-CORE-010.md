---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-010
uuid: ae60e227-e117-4230-8302-2d63c436cacc
title: Wikilinks render as links where they are text
description: When a document holds `[[Note]]`, `[[Folder/Note#Heading|Label]]`
  or `[[#Section]]` in plain text, the extension SHALL render a link, with a
  `wiki:` URL for a note target and an in-page slug anchor for a heading-only
  target, and leave `[[...]]` unconverted where it appears in code, an existing
  link, an image, math, raw HTML or an `![[...]]` embed.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystInlineTransforms.ts
tested_in_files:
- test/core/render/mystFeatures.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-011
---

## Wikilinks render as links where they are text

### Normative behavior

When a document holds `[[Note]]`, `[[Folder/Note#Heading|Label]]` or `[[#Section]]` in plain text, the extension SHALL render a link, with a `wiki:` URL for a note target and an in-page slug anchor for a heading-only target, and leave `[[...]]` unconverted where it appears in code, an existing link, an image, math, raw HTML or an `![[...]]` embed.

### Scenario (nominal): Render wikilinks as links

- GIVEN a paragraph with `[[Note]]` and `[[#Section]]`
- WHEN it is rendered
- THEN the first is a link with a `wiki:` URL and the second an in-page `#section` anchor

### Scenario (boundary): A label is the link text

- GIVEN a wikilink with a `|Label`, as in `[[Folder/Note#Heading|Label]]`
- WHEN it is rendered
- THEN the link text is the label

### Scenario (refusal): Leave wikilink syntax untouched where it is not text

| Input | Outcome |
| --- | --- |
| `[[Note]]` inside inline code | the text stays literal code |
| `[[Note]]` inside an existing link, an image, math or raw HTML | it is not converted to a wikilink |
| an `![[Note]]` embed | it is not converted to a link |

### Verification notes

- Method: Unit test "wikilinks render as lazy note targets without changing code or existing links" in test/core/render/mystFeatures.test.ts (nominal, boundary label, refusal inline code and embed; the existing link, image, math and raw HTML cases are named by the test title only)
- Criteria: Each wikilink form yields the expected link target and text. Wikilinks are converted only in plain text.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Supersedes:
  - [SwRS-MDOKFSTUDIO-CORE-011](SwRS-MDOKFSTUDIO-CORE-011.md): Leave wikilink syntax untouched where it is not text
<!-- okf:links:end -->
