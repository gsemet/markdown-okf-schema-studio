---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-056
uuid: 75009b4b-ca9e-429c-8c74-82503132d1a6
title: "A history state of another render is ignored"
description: "When previewHistoryState names another document, document version or
  request than the page's render, the extension SHALL ignore it."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
tested_in_files:
- test/page/runtimePageControls.test.ts
default_owner_email: gaetan@xeberon.net
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
