---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-071
uuid: e257bcac-8b37-4d12-bc4c-40d0d22f373b
title: A link to another file saves an open editor first
description: 'When the reader follows a link whose request does not start with # while
  an editor is open, the extension SHALL post the final save and then the link request.'
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: deprecated
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
---

## A link to another file saves an open editor first

### Normative behavior

When the reader follows a link whose request does not start with # while an editor is open, the extension SHALL post the final save and then the link request.

### Scenario: File link

- GIVEN an editor with typed text and a link to another file
- WHEN the link is followed
- THEN the final save is posted first and previewLink after it

### Scenario: Without a handler

- GIVEN a page with no flush function
- WHEN the link is followed
- THEN previewLink is posted at once

### Verification notes

- Method: Unit test CR 025: following a link right after typing posts the final save before the link; the no-handler case is the default branch and untested.
- Criteria: The save is posted before the link.
