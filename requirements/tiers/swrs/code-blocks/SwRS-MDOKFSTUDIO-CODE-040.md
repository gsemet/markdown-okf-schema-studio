---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-040
uuid: 5e3aa324-babc-45f5-9c47-9fe6cbc859e0
title: Code blocks sit on a dark Dark+ background in every preview theme by a
  setting
description: When a code block is shown and the setting
  preview.codeBlocks.darkBackground is on, the extension SHALL draw it on the
  Dark+ dark background with the Dark+ token colours in every preview theme, and
  when the setting is off, SHALL keep the preview theme background and draw the
  tokens in the Light+ colours.
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
- src/page/pageSettings.ts
tested_in_files:
- test/core/preview/codeBlockStyles.test.ts
- test/page/pageSettings.test.ts
- test/security/package-contract.test.ts
- test/visual/codeBlockComfortScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Code blocks sit on a dark Dark+ background in every preview theme by a setting

### Normative behavior

When a code block is shown and the setting preview.codeBlocks.darkBackground is on, the extension SHALL draw it on the Dark+ dark background with the Dark+ token colours in every preview theme, and when the setting is off, SHALL keep the preview theme background and draw the tokens in the Light+ colours.

### Scenario (nominal): The dark background is on by default

- GIVEN a document with Python, YAML and shell blocks and the preview in the cream, the white or the dark theme
- WHEN the preview renders it with the setting on (the default)
- THEN each block has the Dark+ editor background (`#1e1e1e`) and default text colour (`#d4d4d4`) and its tokens use the Dark+ colours

### Scenario (boundary): The setting off keeps the theme background

| Input | Outcome |
| --- | --- |
| setting off, cream or white theme | the block keeps the code-block background of the theme; tokens use the Light+ colours |
| setting off, VS Code light theme in the current theme mode | tokens use the Light+ colours |
| setting off, dark theme | tokens use the Dark+ colours on the dark code-block background |
| inline code, any setting | unchanged |

### Scenario (nominal): Token text stays readable

- GIVEN every token colour the highlighter can write
- WHEN it is drawn on its background (Dark+ on `#1e1e1e`, Light+ on the cream, grey and white code backgrounds)
- THEN its contrast ratio is at least 4.5:1, a token colour of the Dark+ or Light+ theme below that is moved to the nearest tint that reaches it, and the line numbers on the dark background use `#9d9d9d`

### Scenario (refusal): Strict policy of the page

- GIVEN the page content security policy, which allows no WebAssembly, no `eval` and no inline style
- WHEN a block is highlighted
- THEN the highlighter runs on the JavaScript regular expression engine and writes colour classes, never a `style` attribute

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-001: highlights fenced code
- SwRS-MDOKFSTUDIO-CODE-007: styles the block box, font scale and the forced themes
- SwRS-MDOKFSTUDIO-CODE-039: numbers the lines of a block

### Verification notes

- Method: test/core/preview/codeBlockStyles.test.ts (background rules gated by the setting attribute, Light+ scopes, contrast of every palette colour, a colour rule for every class written)
- Method: test/core/render/codeBlockComfort.requirements.test.ts (no WebAssembly, no inline style, strict policy), test/page/pageSettings.test.ts (setting attribute) and test/security/package-contract.test.ts (setting schema)
- Method: visual capture of the code blocks in the cream, white and dark themes (reports of CR 131)
- Criteria: the rules use the Dark+ surface colours; every colour class has a rule; each contrast ratio is at least 4.5:1

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-001](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-001.md): A reader reads highlighted, numbered and diff code
<!-- okf:links:end -->
