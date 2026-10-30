---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-072
uuid: 8f9b1df4-8074-4223-b9d1-e45598c454f4
title: "An anchor of the same page keeps the editor open"
description: "When the reader follows a link whose request starts with #, the extension
  SHALL post it at once and leave an open editor open."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## An anchor of the same page keeps the editor open

### Normative behavior

When the reader follows a link whose request starts with #, the extension SHALL post it at once and leave an open editor open.

### Scenario: Anchor

- GIVEN an open editor and a link to #target
- WHEN the link is followed
- THEN previewLink is posted with no editor save and the editor stays open

### Scenario: File link

- GIVEN the same editor and a link to another file
- WHEN the link is followed
- THEN the editor is saved first (see the file link requirement)

### Verification notes

- Method: Unit test CR 025: an anchor link inside the page keeps the open editor.
- Criteria: No save message for a request that starts with #.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-009](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-009.md): The reader goes Back and Next through followed links without losing typed text
<!-- okf:links:end -->
