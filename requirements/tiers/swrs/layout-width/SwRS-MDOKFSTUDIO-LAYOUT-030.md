---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-030
uuid: 4e373c90-274c-48d0-b35d-16b079ee00fa
title: A paragraph holding only an image is marked as a figure
description: When a top-level paragraph holds only one image and no text, the
  extension SHALL mark it with data-sphinx-preview-figure in every width mode.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-022; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-022
default_owner_email: gaetan@xeberon.net
---

## A paragraph holding only an image is marked as a figure

### Normative behavior

When a top-level paragraph holds only one image and no text, the extension SHALL mark it with data-sphinx-preview-figure in every width mode.

### Scenario: Image-only paragraph

- GIVEN a top-level paragraph whose only child is an image and whose text is empty
- WHEN the page is measured in Margin, then in Auto
- THEN the paragraph carries data-sphinx-preview-figure in both modes

### Scenario: Paragraph with text

- GIVEN a paragraph with an image and a sentence
- WHEN the page is measured
- THEN the paragraph is not marked, and a mark left on a paragraph that no longer qualifies is removed

### Scenario: Two images in a paragraph

- GIVEN a top-level paragraph holding two images and no text
- WHEN the page is measured
- THEN the paragraph is not marked as a figure

### Known issues

- Known issue: The negative case and the removal of a stale mark have no test.
- Known issue: The figure mark requires exactly one child element, while the Auto breakout treats any image of a text-free top-level paragraph as its wrapper, so a paragraph of two images can break out in Auto without being marked as a figure (and so without being centred).

### Verification notes

- Method: Unit test T10b a paragraph holding only an image is marked as a figure in every width mode; the text case is verified by inspection of widthMode.ts.
- Criteria: The attribute is present exactly on image-only top-level paragraphs.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-003](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
- Superseded by:
  - [SwRS-MDOKFSTUDIO-LAYOUT-022](SwRS-MDOKFSTUDIO-LAYOUT-022.md): Margin keeps blocks in the column and Full removes the limit
<!-- okf:links:end -->
