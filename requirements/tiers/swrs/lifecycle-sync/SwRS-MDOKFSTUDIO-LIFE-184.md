---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-184
uuid: a8457955-9712-475d-98d2-86bb7c4ac4d7
title: The opening policy keeps a text editor or replaces it by Studio, by nine
  ordered rules
description: When a Markdown text tab opens, the opening policy SHALL keep it
  when it is not a text tab, not an eligible saved file .md, not new, present at
  start, opened by Studio, reopened as text, or a jump while a side preview
  follows the active editor, and otherwise SHALL replace it by Studio at the
  line when Open Markdown files in Studio is on or when Open search results in
  Studio is on and the opening carries a line, and by Studio with no line for a
  plain opening when Open Markdown files in Studio is on.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-023
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/navigation/openingPolicy.ts
tested_in_files:
- test/core/navigation/openingPolicy.test.ts
- test/integration/openAtLine.test.ts
default_owner_email: gaetan@xeberon.net
---

## The opening policy keeps a text editor or replaces it by Studio, by nine ordered rules

### Normative behavior

When a Markdown text tab opens, the opening policy SHALL keep it when it is not a text tab, not an eligible saved file .md, not new, present at start, opened by Studio, reopened as text, or a jump while a side preview follows the active editor, and otherwise SHALL replace it by Studio at the line when Open Markdown files in Studio is on or when Open search results in Studio is on and the opening carries a line, and by Studio with no line for a plain opening when Open Markdown files in Studio is on.

### Scenario (nominal): Nominal case

- GIVEN a new text tab of a saved .md file opening at line 12, Open search results in Studio on and no side preview that follows the active editor
- WHEN the policy decides
- THEN the answer is Studio at line 12

### Scenario (boundary): Boundary cases

| Input | Outcome |
| --- | --- |
| a diff, a custom or any other tab, under either setting | keep |
| an untitled, git: or non-Markdown document | keep |
| a tab present at start, or a jump into a tab already open | keep |
| a text editor Studio opened, or a plain opening reopened as text | keep |
| a jump right after a Studio tab of the file closed (VS Code closes a preview Studio tab first) | not a reopening as text: Studio at the line |
| a jump while a side preview follows the active editor | keep (a plain opening goes on) |
| Open Markdown files in Studio on | Studio at the line, or Studio for a plain opening |
| only Open search results in Studio on, a line | Studio at the line |
| a plain opening with only Open search results in Studio on | keep |

### Known limits

- A search result or Quick Open line aimed at a pinned or preview Studio tab of the file loses its line and marker (trial T4, VS Code 1.147.0); the tab stays where it is.
- Open With > Text Editor is replaced by Studio while Open Markdown files in Studio is on (trial T3d).

### Verification notes

- Method: test/core/navigation/openingPolicy.test.ts (one test per rule 1 to 9).
- Criteria: each rule holds in the order given, and the first rule that applies decides.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LIFE-023](../../strs/lifecycle-sync/StRS-MDOKFSTUDIO-LIFE-023.md): A reader opens a Markdown file at a searched line and sees that line marked in Studio
<!-- okf:links:end -->
