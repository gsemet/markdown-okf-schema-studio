---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-012
uuid: 4bb26dfb-0316-4c48-8f9c-ab6c4bdfa47f
title: "A read-only preview has no Edit button"
description: "When a preview is read-only (untrusted workspace, file outside the workspace
  or standalone file), the extension SHALL render its toolbar without the Edit button."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-001
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A read-only preview has no Edit button

### Normative behavior

When a preview is read-only (untrusted workspace, file outside the workspace or standalone file), the extension SHALL render its toolbar without the Edit button.

### Scenario: Untrusted workspace

- GIVEN a workspace that is not trusted
- WHEN a preview opens
- THEN the toolbar has no element data-sphinx-preview-edit-toggle

### Scenario: Standalone file

- GIVEN a Markdown file outside every workspace folder
- WHEN its preview opens
- THEN the toolbar has no Edit button either

### Verification notes

- Method: Integration suites test/integration/untrusted-suite.ts and test/integration/standalone-suite.ts assert that the Edit button is missing. Trust itself is specified in the trust and security scope.
- Criteria: renderPreviewToolbar is called with editing disabled and the page holds no data-sphinx-preview-edit-toggle element.
