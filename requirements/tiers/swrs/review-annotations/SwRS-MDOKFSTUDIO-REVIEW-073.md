---
type: SwRS
id: SwRS-MDOKFSTUDIO-REVIEW-073
uuid: 74c49290-7494-44c9-a8b9-c7c2b9fa24df
title: Comment messages are accepted for any revision of the document
description: When a comment message names the shown document and render, the
  extension SHALL handle it whatever revision of the document it names.
project: markdown-okf-schema-studio
scope: review-annotations
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-REVIEW-003
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Comment messages are accepted for any revision of the document

### Normative behavior

When a comment message names the shown document and render, the extension SHALL handle it whatever revision of the document it names.

### Scenario: Old revision

- GIVEN a create message that names an older revision of the shown document
- WHEN the host receives it
- THEN the comment is written

### Scenario: Other document

- GIVEN a create message that names another document
- WHEN the host receives it
- THEN it is dropped and nothing is written

### Verification notes

- Method: The integration test test/integration/commentWrite.test.ts (assert "a create with an old documentVersion must still be written"). The dropped wrong document id is not asserted by a test.
- Criteria: The comments file gains the thread for the old revision and is unchanged for the other document.
