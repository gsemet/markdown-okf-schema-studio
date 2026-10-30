---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-015
uuid: 87aa1d19-0851-4d6e-9cab-2c8195c2104f
title: The Start writing button is pushed only when it sits under the toolbar
description: When the Start writing button itself shares horizontal space with
  the floating toolbar and the toolbar reaches below the 40 px gap, the
  extension SHALL push the button down just far enough to clear the toolbar.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-011; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-011
default_owner_email: gaetan@xeberon.net
---

## The Start writing button is pushed only when it sits under the toolbar

### Normative behavior

When the Start writing button itself shares horizontal space with the floating toolbar and the toolbar reaches below the 40 px gap, the extension SHALL push the button down just far enough to clear the toolbar.

### Scenario: Button under the toolbar

- GIVEN a 460 px column, a toolbar from 200 to 450 px reaching down to 84 px and a Start writing button from 16 to 316 px
- WHEN the clearance is measured
- THEN the clearance is 52 px

### Scenario: Button beside the toolbar

- GIVEN a 900 px column, a toolbar from 600 px and a Start writing button from 16 to 121 px
- WHEN the clearance is measured
- THEN the clearance is 0 px

### Verification notes

- Method: Unit test P3 the Start writing button is pushed only when the button itself is under the toolbar; visual checks v39 to v41, v54, v59 and v62.
- Criteria: Clearance is greater than 0 only when the rectangles of the button and the toolbar share horizontal space.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-004](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-004.md): The first element starts clear of the top and of the floating toolbar
- Superseded by:
  - [SwRS-MDOKFSTUDIO-LAYOUT-011](SwRS-MDOKFSTUDIO-LAYOUT-011.md): A control under the floating toolbar is moved or narrowed out of its way
<!-- okf:links:end -->
