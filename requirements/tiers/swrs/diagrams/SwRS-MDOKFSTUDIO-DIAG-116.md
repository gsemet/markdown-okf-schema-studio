---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-116
uuid: 683d2821-a71a-4bd3-8cf3-c78ca6debfe2
title: A late Mermaid error for a replaced key is not shown
description: When Mermaid fails a drawing after the node was planned for another
  key, the page SHALL NOT show an error for the replaced key.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-009; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-009
default_owner_email: gaetan@xeberon.net
---

## A late Mermaid error for a replaced key is not shown

### Normative behavior

When Mermaid fails a drawing after the node was planned for another key, the page SHALL NOT show an error for the replaced key.

### Scenario: Late error

- GIVEN a drawing that fails after its key was replaced
- WHEN the failure arrives
- THEN no error message is shown for the replaced key

### Scenario: Current key

- GIVEN a drawing that fails for the node's current key
- WHEN the failure arrives
- THEN the error message is shown and the state is error

### Known issues

- Known issue: Untested; the guard lives in mermaidPreview.ts.

### Verification notes

- Method: No test: browser entry point.
- Criteria: Only the current key's result reaches the node.
