---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-051
uuid: a02be82c-5d6a-4680-9b34-4b8d5b96b066
title: Include requests are handled for the current document
description: "When the host receives a previewPlantUmlInclude message whose document
  id is that of the preview's current document, it SHALL handle it even if the page
  is one render behind, and drops it for any other document or a closed preview."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-065; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## Include requests are handled for the current document

### Normative behavior

When the host receives a previewPlantUmlInclude message whose document id is that of the preview's current document, it SHALL handle it even if the page is one render behind, and drops it for any other document or a closed preview.

### Scenario: Page one render behind

- GIVEN a message addressed to the current document from a page one render behind
- WHEN the host routes it
- THEN the include is answered

### Scenario: Other document

- GIVEN a message with another document id
- WHEN the host routes it
- THEN it is dropped without an answer

### Known issues

- Known issue: The request is not an edit: it is allowed in read-only previews and in Restricted Mode.

### Verification notes

- Method: Unit test `an include request is handled for the current document even one render behind, and dropped otherwise` in `test/session/diagReq.plantuml.requirements.test.ts`.
- Criteria: Only the document id is compared.
