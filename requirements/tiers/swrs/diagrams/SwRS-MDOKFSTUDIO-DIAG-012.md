---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-012
uuid: 20fdb6ce-a8ed-49b3-9971-9a5de48ea090
title: Mermaid draw passes run one at a time
description: When several Mermaid draw passes are requested, the page SHALL run
  them one after another, each pass waiting for the Mermaid module to load and
  for the previous pass to finish.
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

## Mermaid draw passes run one at a time

### Normative behavior

When several Mermaid draw passes are requested, the page SHALL run them one after another, each pass waiting for the Mermaid module to load and for the previous pass to finish.

### Scenario: Two requests

- GIVEN a content patch and a theme change requested while a pass is running
- WHEN the running pass finishes
- THEN the next pass starts only then, in the order requested

### Scenario: Module still loading

- GIVEN a pass requested before the Mermaid module has loaded
- WHEN the module finishes loading
- THEN the pass starts after the load and not before

### Known issues

- Known issue: Diagrams inside one pass are started together and document order only fixes their element ids.
- Known issue: Untested race protection that exists only in mermaidPreview.ts.

### Verification notes

- Method: No test: browser entry point; to be covered by a unit test of the queue.
- Criteria: Passes never overlap.
