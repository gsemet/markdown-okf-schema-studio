---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-235
uuid: b42d542e-6eae-4871-a651-ec87d41d38f7
title: A refusal is told apart from a plan
description: When an edit operation returns a result, isRefusal SHALL be true
  exactly for a result that carries a refused reason.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## A refusal is told apart from a plan

### Normative behavior

When an edit operation returns a result, isRefusal SHALL be true exactly for a result that carries a refused reason.

### Scenario: Refusal

- GIVEN a result { refused: reason }
- WHEN isRefusal is called
- THEN it returns true

### Scenario: Plan

- GIVEN a result { edit: ... }
- WHEN isRefusal is called
- THEN it returns false

### Verification notes

- Method: Unit test `a refusal is told apart from a plan` in test/core/edits/textEdit.test.ts.
- Criteria: The test is the presence of the refused key.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
<!-- okf:links:end -->
