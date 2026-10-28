---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-034
uuid: 257662c7-ec3e-46eb-b159-757fb3e22a20
title: "Page colours go through one token map of VS Code variables"
description: "When the stylesheet is built, the extension SHALL declare each neutral
  --studio- token on the root and on body as the VS Code variable of the same name,
  so that the --vscode- prefix appears only inside that token map and every --studio-
  token the stylesheet or the Mermaid theme reads is in it."
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/themeTokens.ts
tested_in_files:
- test/core/preview/themeTokens.test.ts
default_owner_email: gaetan@xeberon.net
---

## Page colours go through one token map of VS Code variables

### Normative behavior

When the stylesheet is built, the extension SHALL declare each neutral --studio- token on the root and on body as the VS Code variable of the same name, so that the --vscode- prefix appears only inside that token map and every --studio- token the stylesheet or the Mermaid theme reads is in it.

### Scenario (nominal): Token map

- GIVEN the token name list
- WHEN the VS Code mapping block is read
- THEN it starts with `:root, body` and holds one declaration `--studio-{name}: var(--vscode-{name})` for each name of the token list (57 names at the time of writing, not asserted), with no duplicate name

### Scenario (boundary): Variable not set by the host

- GIVEN a host that does not set one of the mapped --vscode- variables
- WHEN a rule reads var(--studio-{name}, {fallback})
- THEN the token is unset, so the fallback written in the rule applies exactly as it did for the host variable

### Scenario (nominal): Stylesheet without the map

- GIVEN the accessibility and theme stylesheets
- WHEN the token map block is removed
- THEN no text --vscode- remains

### Scenario (nominal): Map first

- GIVEN the accessibility stylesheet
- WHEN its start is read
- THEN it starts with the token map

### Scenario (boundary): Every token read is in the map

- GIVEN the tokens read by the page, as in the table
- WHEN the names are checked against the token list
- THEN each name is in the list

| Input | Outcome |
| --- | --- |
| Every --studio-{name} used by the accessibility and theme stylesheets | Each name is in the token list |
| The four tokens read by the Mermaid theme (textCodeBlock-background, editor-foreground, textBlockQuote-background, editor-background) | Each name is in the token list |

### Related requirements

- SwRS-MDOKFSTUDIO-THEME-025: the forced modes set the --studio- tokens directly with literal hex values and never read the map.
- SwRS-MDOKFSTUDIO-THEME-016: Current mode, which reads the VS Code variables through this map.

### Verification notes

- Method: test/core/preview/themeTokens.test.ts, unit tests `every theme token maps to the VS Code variable of the same name, on the root and on body` (token map; the fallback behaviour follows from CSS and is not asserted), `the page stylesheet reads VS Code variables only through the token map` (stylesheet without the map, map first) and `every token the stylesheet or the Mermaid theme reads is in the token map` (both rows of the table; the list of Mermaid tokens is written in the test, not derived from src/page/modules/mermaidPreview.ts).
- Criteria: Each token has its declaration on the root and on body and the names are unique. No occurrence of --vscode- outside the map. The set of used names is a subset of the token list.
