---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-272
uuid: 25666803-c507-499e-85f7-3afd5999f328
title: The Code-block button edits a MyST code-block directive in a form
description: When the writer presses the Code-block (MyST) button in MyST mode,
  the extension SHALL open a form for the language, line numbers, emphasized
  lines, caption and name of the code-block directive at the caret, or of a new
  one, and Apply SHALL write that directive in one undo step, leaving every
  other option and the code unchanged.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/features/editorChrome.ts
- src/page/modules/codeBlockDirective.ts
- src/page/modules/codeBlockPanel.ts
tested_in_files:
- test/page/modules/codeBlockDirective.test.ts
- test/page/runtimeCodeBlockPanel.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Code-block button edits a MyST code-block directive in a form

### Normative behavior

When the writer presses the Code-block (MyST) button in MyST mode, the extension SHALL open a form for the language, line numbers, emphasized lines, caption and name of the code-block directive at the caret, or of a new one, and Apply SHALL write that directive in one undo step, leaving every other option and the code unchanged.

### Scenario (nominal): Edit an existing directive

- GIVEN the caret inside a `{code-block}` directive that has a language, a caption and other options (the MyST palette lists the Code-block (MyST) button after Key)
- WHEN the button is pressed, Line numbers, Emphasized lines and Name are changed, and Apply is pressed
- THEN the form first shows the language, the line numbers (Off when absent), the emphasized lines, the caption and the name read from the directive; the directive is then rewritten with `:linenos:`, `:emphasize-lines:` and `:name:` added after the existing options and a blank line before the code, as one undo step, and the other options and the code are unchanged

### Scenario (nominal): Insert a new directive

- GIVEN the caret outside any `{code-block}` directive
- WHEN the button is pressed, a language and Line numbers are chosen, and Insert is pressed
- THEN an empty form was shown, and a directive with that language and `:linenos:` is written after a blank line (in place of a blank caret line, or around the selected lines as its code), with the caret on the first line of the code, as one undo step

### Scenario (boundary): What is read and written

| Input | Outcome |
| --- | --- |
| a directive whose values are not changed | Apply writes nothing; the text is byte for byte the same |
| an option whose value is not changed, or an option the form does not know (`:dedent:`) | its original line is kept |
| a value emptied (caption, name, emphasized lines) or Line numbers set to Off | the option line is removed |
| a fence of backticks, tildes or colons, indented or not, or an unclosed directive | read and written back with the same fence and indent |
| code holding a fence line of the same character | the fence of a new directive is longer than any run in the code |
| a directive written inside the code of another directive | not looked at: the outer directive is the one edited |

### Scenario (refusal): Invalid values and YAML options

| Input | Outcome |
| --- | --- |
| a language with a space, or emphasized lines that are not numbers and ranges such as `1,3-5` | a message under the field, the form stays open and nothing is written |
| a caption or name with a line break | a message under the field, nothing is written |
| a directive whose options are a `---` YAML block | no form; the status line sends the writer to the text box |
| Escape or Cancel | the form closes and nothing is written |

### Verification notes

- Method: test/page/modules/codeBlockDirective.test.ts (a code-block directive is read into its form values; an untouched directive is written back byte for byte, in every fence style; changing a value rewrites only its line; a new option goes after the existing ones; a YAML option block is refused; the directive at the caret is the outermost one; a new directive has an empty body line or wraps the touched lines; insertion; validation of the form values)
- Method: test/page/runtimeCodeBlockPanel.test.ts (the button with the caret in a directive opens the form filled; Apply rewrites in one edit; Apply without a change writes nothing; an invalid value keeps the form open and Escape closes it; the button outside a directive opens an empty form and Apply inserts)
- Method: test/page/modules/editActions.test.ts and test/page/modules/editPalette.test.ts (the registry lists the Code-block (MyST) button after Key in the MyST palette only)
- Criteria: The code and the options the form does not own are never rewritten.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
