---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-048
uuid: ca91aff4-5022-4dde-a273-4a0903c9cb11
title: Glow blocks changed outside the preview
description: When blocks are updated by a change made outside the preview, the
  extension SHALL make them glow once for about 600 ms, a code block on its
  `<pre>`.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LIFE-094; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LIFE-094
default_owner_email: gaetan@xeberon.net
---

## Glow blocks changed outside the preview

### Normative behavior

When blocks are updated by a change made outside the preview, the extension SHALL make them glow once for about 600 ms, a code block on its `<pre>`.

### Scenario: Nominal glow blocks changed outside the preview

- GIVEN an outside edit changing two blocks
- WHEN the page updates
- THEN both blocks glow once for about 600 ms

### Scenario: Boundary or refusal of glow blocks changed outside the preview

- GIVEN a changed code block
- WHEN the page updates
- THEN the glow shows on its `<pre>`

### Verification notes

- Method: Unit test "CR 046: an update glows on the innermost blocks whose lines meet a range, and only there" in test/page/modules/motion.test.ts
- Criteria: The glow attribute is set then removed after about 600 ms.
