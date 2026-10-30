---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-039
uuid: aec194c7-4660-4df1-a161-b71c787d1eef
title: Code blocks of two lines or more are numbered by a setting, never in the
  copied text
description: When a code block of two lines or more is shown and the setting
  preview.codeBlocks.lineNumbers is on, the extension SHALL number its lines
  with generated content that neither the copy button nor a selection picks up,
  and SHALL number a MyST code block with the linenos or lineno-start option
  whatever the setting says.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/preview/styles/codeBlockStyles.ts
- src/core/render/highlight.ts
- src/page/pageSettings.ts
tested_in_files:
- test/core/preview/codeBlockStyles.test.ts
- test/core/render/codeBlockComfort.requirements.test.ts
- test/page/modules/codeCopy.test.ts
- test/page/pageSettings.test.ts
- test/security/package-contract.test.ts
- test/visual/codeBlockComfortScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Code blocks of two lines or more are numbered by a setting, never in the copied text

### Normative behavior

When a code block of two lines or more is shown and the setting preview.codeBlocks.lineNumbers is on, the extension SHALL number its lines with generated content that neither the copy button nor a selection picks up, and SHALL number a MyST code block with the linenos or lineno-start option whatever the setting says.

### Scenario (nominal): A block of two lines or more is numbered

- GIVEN a fenced `python` block of three lines and a block of two lines in a language that is not bundled
- WHEN the preview renders them with the setting on (the default)
- THEN each line is its own line element numbered from 1 by generated content, and the line numbers are not part of the text of the block

### Scenario (boundary): A single line is never numbered

| Input | Outcome |
| --- | --- |
| a one-line fenced block | no line element and no number |
| a block of two or more lines, setting off | no number is shown, the lines keep their text |
| a block of two or more lines with no language label | numbered like the others |

### Scenario (nominal): The numbers are never copied

- GIVEN a numbered block with an empty line in the middle
- WHEN the reader presses the copy button or selects the block with the mouse
- THEN the copied text equals the source text, empty line included, and holds no line number

### Scenario (nominal): The MyST options win over the setting

- GIVEN a `{code-block}` with `:linenos:`, `:lineno-start: 10` and `:emphasize-lines: 11`
- WHEN the preview renders it with the setting off
- THEN its lines are numbered from 10 whatever the setting says and the second line is emphasized

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-005: wraps numbered, emphasized and diff blocks into lines
- SwRS-MDOKFSTUDIO-CODE-019: copies the raw code of a block
- SwRS-MDOKFSTUDIO-CODE-040: draws code blocks on the dark background

### Verification notes

- Method: test/core/render/codeBlockComfort.requirements.test.ts (wrapping and automatic marker by block size and language, text of a wrapped block, MyST options in the markup)
- Method: test/core/preview/codeBlockStyles.test.ts (numbers as generated, unselectable content, gated by the setting attribute, MyST option rules not gated)
- Method: test/page/modules/codeCopy.test.ts (copied text of automatically numbered blocks), test/page/pageSettings.test.ts (setting attribute) and test/security/package-contract.test.ts (setting schema)
- Criteria: the markup carries one line element per line; the number is a CSS pseudo-element; the copied and the DOM text equal the source text

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
<!-- okf:links:end -->
