---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-147
uuid: 60a91ea6-8e62-4b22-a68f-05eddceff278
title: A chosen label is written as a ref role
description: When the writer chooses a label, the extension SHALL write {ref}
  with the label in backticks in place of the selection, using the one-line
  selection as the link text when there is one.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/inlineEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
default_owner_email: gaetan@xeberon.net
---

## A chosen label is written as a ref role

### Normative behavior

When the writer chooses a label, the extension SHALL write {ref} with the label in backticks in place of the selection, using the one-line selection as the link text when there is one.

### Scenario (nominal): No selection

- GIVEN the text see and the label intro chosen
- WHEN the action runs
- THEN the ref role for intro is inserted after the word see, with the caret after it

### Scenario (nominal): Selected text

- GIVEN the selection the intro and the label intro chosen
- WHEN the action runs
- THEN the ref role is written with the link text the intro and the target intro

### Scenario (refusal): Labels and selections that give no edit

| Input | Outcome |
| --- | --- |
| A label with a backtick or an angle bracket | No edit |
| An empty label | No edit |
| A label longer than 200 characters | No edit (the label is at most 200 characters) |
| A selection with a line break or a backtick | No edit |

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-140: the Reference list from which the label is chosen.

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit test "ref inserts {ref} with the chosen label and keeps a selection as the link text": scenarios No selection, Selected text and the refusal rows for a backtick or angle bracket in the label, no label and a selection with a line break; the 200 character limit and the selection with a backtick are untested)
- Criteria: A label with a backtick or an angle bracket, an empty label, or a selection with a line break or a backtick gives no edit; the label is at most 200 characters.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
<!-- okf:links:end -->
