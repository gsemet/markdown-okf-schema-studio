---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-056
uuid: 75009b4b-ca9e-429c-8c74-82503132d1a6
title: "A history state of another render is ignored"
description: "When previewHistoryState names another document, document version or
  request than the page's render, the extension SHALL ignore it."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TOOLBAR-054; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
superseded_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-054
---

## A history state of another render is ignored

### Normative behavior

When previewHistoryState names another document, document version or request than the page's render, the extension SHALL ignore it.

### Scenario (refusal): Another render

| Input | Outcome |
| --- | --- |
| a state with an older or different revision (for example 99 for a page at 7) | the buttons keep their state |
| a state for another document | ignored in the same way |
| a state for another request | ignored in the same way |

### Scenario (nominal): Current render

- GIVEN a state with the page's identifiers
- WHEN the page receives it
- THEN the buttons follow it

### Verification notes

- Method: test/page/runtimePageControls.test.ts (the refusal with another revision: T11 a previewHistoryState of another document version is ignored; the current render is checked with the Back and Next test T11; the other document and request rows are by code only)
- Criteria: No button changes for a stale identifier.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-009](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-009.md): The reader goes Back and Next through followed links without losing typed text
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-059](../trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
- Superseded by:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-054](SwRS-MDOKFSTUDIO-TOOLBAR-054.md): Back and Next follow the host's history state
<!-- okf:links:end -->
