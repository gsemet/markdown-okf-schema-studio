---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-039
uuid: 7d9483a2-d877-4e96-9fb4-fbe1ff2b6e5a
title: Wrap CJK text in the pane
description: When a paragraph holds Japanese, Chinese or Korean text, the
  extension SHALL wrap it inside the pane at 900 px and 460 px.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-034; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-034
default_owner_email: gaetan@xeberon.net
---

## Wrap CJK text in the pane

### Normative behavior

When a paragraph holds Japanese, Chinese or Korean text, the extension SHALL wrap it inside the pane at 900 px and 460 px.

### Scenario: Nominal wrap CJK text in the pane

- GIVEN a Japanese paragraph at 900 px
- WHEN it is shown
- THEN it wraps inside the pane

### Scenario: Boundary or refusal of wrap CJK text in the pane

- GIVEN a Korean paragraph at 460 px
- WHEN it is shown
- THEN no horizontal scrolling appears

### Verification notes

- Method: Unit test "the content stylesheet lets paragraphs, including CJK text, wrap inside the pane" in test/core/render/renderReq.renderingCore.requirements.test.ts
- Criteria: CJK paragraphs stay within the pane width.
