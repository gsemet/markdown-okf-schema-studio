---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-136
uuid: cb4abd71-b4a6-4426-99b0-93d814488d34
title: Label writes one label line above the block
description: When the writer presses Label, the extension SHALL write the line
  `(label-name)=` above the first line of the text with label-name selected, and
  make no edit when the text already starts with a label line.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-021
depends_on: []
scenarios:
- id: S1
  title: New label
- id: S2
  title: Already labelled
- id: S3
  title: Leading blank lines
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## Label writes one label line above the block

### Normative behavior

When the writer presses Label, the extension SHALL write the line `(label-name)=` above the first line of the text with label-name selected, and make no edit when the text already starts with a label line.

### Scenario S1 (nominal): New label

- GIVEN the text Para and text
- WHEN Label is pressed
- THEN `(label-name)=` is the first line and label-name is selected

### Scenario S2 (refusal): Already labelled

- GIVEN a text that starts with (x)=
- WHEN Label is pressed
- THEN no edit is produced

### Scenario S3 (boundary): Leading blank lines

| Input | Outcome |
| --- | --- |
| Blank lines at the start of the text | They are skipped before the label is written |

### Related requirements

- The label anchor icon and the rename of a label are specified in the MyST requirements.

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit test "label inserts (name)= above the block with the name selected": scenarios New label, Already labelled and Leading blank lines)
- Criteria: Blank lines at the start of the text are skipped before the label is written.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-021](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-021.md): A writer inserts MyST constructs
<!-- okf:links:end -->
