---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-054
uuid: 7d878bb5-00de-455d-a4d8-6d5a53e0c2b3
title: The Code block list wraps lines in a fence of a highlighted language
description: When the writer presses Code block, the extension SHALL open a menu
  that lists text first and then each language name and alias that the preview
  highlights, once and in sorted order, and wrap the touched lines, or an empty
  fence at the caret, in a fence that names the chosen language, is one backtick
  longer than the longest backtick run in the code and at least three long, and
  names no language when none or an invalid name is given.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-PALETTE-036
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
- src/page/modules/editActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Code block list wraps lines in a fence of a highlighted language

### Normative behavior

When the writer presses Code block, the extension SHALL open a menu that lists text first and then each language name and alias that the preview highlights, once and in sorted order, and wrap the touched lines, or an empty fence at the caret, in a fence that names the chosen language, is one backtick longer than the longest backtick run in the code and at least three long, and names no language when none or an invalid name is given.

### Scenario (nominal): Real list

- GIVEN the page built with the languages of the highlighter
- WHEN the writer presses Code block
- THEN the entries are text followed by highlightLanguageNames in order, including python, py and yaml, and choosing python writes a python fence

### Scenario (boundary): Duplicates in the language list

- GIVEN a language list that contains text and a name twice
- WHEN the registry is built
- THEN text appears once at the start, each other name once, sorted

### Scenario (nominal): A chosen language wraps the lines or inserts an empty fence

- GIVEN the selection x = 1
- WHEN python is chosen
- THEN the text is a python fence around x = 1 with x = 1 selected

- GIVEN the caret in the paragraph para
- WHEN json is chosen
- THEN a blank line and an empty json fence follow para and the caret is inside the fence

In this table `[ ]` marks the selection and `|` marks the caret.

| Language | Input | Outcome |
| --- | --- | --- |
| python | `[x = 1]` | a python fence around the selected `x = 1` |
| text | `[a` newline `b]` | a text fence around the two lines |
| python | `ab[c` newline `d]ef` (selection starts and ends inside lines) | the fence wraps the whole lines `abc` and `def`, selected |
| json | `\|` (blank line) | the fence replaces the line, caret inside |
| json | `para\|` | `para`, blank line, an empty json fence, caret inside |
| json | two spaces then `\|` | the fence replaces the blank line, caret inside |
| text | `x` newline `[a]` newline `y` | the fence wraps the line a only |

### Scenario (boundary): The fence is longer than any backtick run

| Selection | Language | Outcome |
| --- | --- | --- |
| `` echo ```x``` `` | bash | the outer fence has four backticks |
| x | text | the fence has three backticks |

The fence width equals the maximum of three and the longest run plus one.

### Scenario (refusal): No language or an invalid language name

- GIVEN the selection x
- WHEN the action runs without an argument
- THEN the text is a fence without language around x

- GIVEN a name with a space
- WHEN the action runs with that name
- THEN the fence has no language either

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-031: the language menu is a palette popover that opens inside the frame, one at a time.
- SwRS-MDOKFSTUDIO-PALETTE-036: leaving the frame from a palette control saves once.

### Verification notes

- Method: test/page/runtimeEditPalette.test.ts (T21: the code language list is text plus the highlighter languages and aliases)
- Method: test/page/modules/editActions.test.ts (the code languages are the highlighter's registrations and aliases, plus text; data-driven rows named editActions codeFence for the wrap, empty fence and fence width scenarios; codeFence without a language writes a bare fence)
- Method: test/page/modules/editActions.test.ts (marker holder of editActions.test.ts for this requirement)
- Method: the invalid-name case of the refusal scenario is deduced from the code (the language pattern in insertCodeFence), not tested
- Criteria: The values equal text then the sorted set of grammar names and aliases that highlightLanguageNames returns, so every listed language is highlighted by the preview; on a blank line the fence replaces the line; a selection starting or ending inside a line extends to the whole lines; the fence width equals the maximum of three and the longest run plus one; the language is written only when it matches [\w+#.-]+ in full.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
  - [StRS-MDOKFSTUDIO-PALETTE-013](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-013.md): A writer picks labels, documents, citations and code languages from host lists, with feedback
- Depends on:
  - [SwRS-MDOKFSTUDIO-PALETTE-031](SwRS-MDOKFSTUDIO-PALETTE-031.md): Palette popovers open in the frame, one at a time, and Escape or typing closes them
  - [SwRS-MDOKFSTUDIO-PALETTE-036](SwRS-MDOKFSTUDIO-PALETTE-036.md): Leaving the frame from a palette control saves once and a press keeps the text box focus
<!-- okf:links:end -->
