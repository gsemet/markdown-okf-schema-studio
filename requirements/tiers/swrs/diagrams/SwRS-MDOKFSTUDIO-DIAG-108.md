---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-108
uuid: a18bd05a-1ad7-4895-a4b2-c9097e800e9c
title: "JAR results reach a ready page in place"
description: "When incremental updates are on, the page is ready for the render stage,
  the status lines fit a patch and a content patch can be planned, the extension SHALL
  send the JAR results as a content patch without reloading the page, and otherwise
  SHALL set the full page HTML."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## JAR results reach a ready page in place

### Normative behavior

When incremental updates are on, the page is ready for the render stage, the status lines fit a patch and a content patch can be planned, the extension SHALL send the JAR results as a content patch without reloading the page, and otherwise SHALL set the full page HTML.

### Scenario: Ready page

- GIVEN incremental updates on, a page ready for the stage, short status lines and a plannable patch
- WHEN the JAR results arrive
- THEN the page receives a content patch and keeps its state

### Scenario: Diagnostics too long

- GIVEN a ready page with incremental updates on but status lines that do not fit a patch
- WHEN the JAR results arrive
- THEN the whole page HTML is set

### Known issues

- Known issue: The apply method has no session test; when the injected page equals the current one and there are no warnings, nothing is done.

### Verification notes

- Method: Unit test: injecting PlantUML diagrams into a page keeps its shell key, so the diagrams can be patched in.
- Criteria: Patch or full HTML according to readiness.
