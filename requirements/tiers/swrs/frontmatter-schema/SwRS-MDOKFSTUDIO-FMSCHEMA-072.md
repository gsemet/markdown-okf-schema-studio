---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-072
uuid: eda2acf2-7448-4e41-aa8a-bad27cde31e7
title: A link tooltip closes on leaving, Escape, scroll, resize and outside
  click
description: When a link tooltip is open and the pointer and focus leave the
  link, or Escape is pressed, or the page scrolls or resizes, or a click lands
  elsewhere, the extension SHALL close the tooltip.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-067; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-067
default_owner_email: gaetan@xeberon.net
---

## A link tooltip closes on leaving, Escape, scroll, resize and outside click

### Normative behavior

When a link tooltip is open and the pointer and focus leave the link, or Escape is pressed, or the page scrolls or resizes, or a click lands elsewhere, the extension SHALL close the tooltip.

### Scenario: Escape

- GIVEN an open link tooltip
- WHEN the writer presses Escape
- THEN the tooltip is removed and the link has its title back

### Scenario: Scroll

- GIVEN an open link tooltip
- WHEN the page scrolls
- THEN the tooltip is removed

### Verification notes

- Method: Page unit tests.
- Criteria: While open, the link's title is removed and aria-describedby points to the tooltip; closing restores both.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-067](SwRS-MDOKFSTUDIO-FMSCHEMA-067.md): A link tooltip shows the fields and an excerpt of the linked file
<!-- okf:links:end -->
