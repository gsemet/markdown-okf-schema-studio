---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-094
uuid: d0992eb9-5e1b-4a83-887c-91b71124de4a
title: A label starting with underscore, dot or hyphen cannot be renamed
description: When the writer clicks the anchor icon of a label whose name starts
  with an underscore, a dot or a hyphen in edit mode, the extension SHALL open
  no rename field.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-038; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-038
---

## A label starting with underscore, dot or hyphen cannot be renamed

### Normative behavior

When the writer clicks the anchor icon of a label whose name starts with an underscore, a dot or a hyphen in edit mode, the extension SHALL open no rename field.

### Scenario: Label starting with a symbol in edit mode

- GIVEN edit mode and the label `(_draft)=` before a paragraph, which shows an anchor icon
- WHEN the writer clicks the anchor icon
- THEN no rename field, popover or message appears and the click opens no block editor

### Scenario: Label starting with a letter or digit

- GIVEN edit mode and the label `(draft_1)=`
- WHEN the writer clicks its anchor icon
- THEN the rename field opens with the name selected

### Verification notes

- Method: Superseded; see SwRS-MDOKFSTUDIO-MYST-038 for the test that now covers labels starting with a symbol.
- Criteria: Superseded; the behaviour is specified by SwRS-MDOKFSTUDIO-MYST-038.
