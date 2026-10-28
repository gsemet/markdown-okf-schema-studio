---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-005
uuid: ea44b732-d1b3-45e8-8a4d-ed32fc8a3909
title: Each rendered page carries the width rule
description: When the extension builds the HTML of a preview page, it SHALL
  include the width rule of the configured maximum content width in the page
  style.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-002; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-LAYOUT-002
default_owner_email: gaetan@xeberon.net
---

## Each rendered page carries the width rule

### Normative behavior

When the extension builds the HTML of a preview page, it SHALL include the width rule of the configured maximum content width in the page style.

### Scenario: Configured width in the page style

- GIVEN maxContentWidth set to 1200
- WHEN the page HTML is built
- THEN the page style ends with :root { --sphinx-preview-content-max-width: 1200px; }

### Scenario: Invalid configured width

- GIVEN maxContentWidth set to a negative number
- WHEN the page HTML is built
- THEN the page style carries 960px, the default

### Known issues

- Known issue: The full-page test PERF-11 matches only the number 720 in the inline style, not the whole text of the rule; the whole rule text is asserted on the builder alone.

### Verification notes

- Method: Unit test of the width rule builder, and the full-page test PERF-11 in previewRuntimeFile.test.ts (a page built with maxContentWidth 720 carries 720 in its inline style, which holds the width rule only); the call site passes preview.configuration.maxContentWidth.
- Criteria: The page style contains exactly one width rule and its value is the normalised setting.
