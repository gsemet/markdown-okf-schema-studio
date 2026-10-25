---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-012
uuid: 431660f8-44f1-4d20-bf75-2b5bf9b18eeb
title: An include is expanded in place and mapped to its directive
description: When a trusted document holds an `{include}` directive for a
  Markdown file inside its folder or the workspace root, the extension SHALL
  render that file's content in place of the directive, map every included block
  to the lines of the directive and leave an unsupported include form as an
  unresolved placeholder.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
- StRS-MDOKFSTUDIO-CORE-003
- StRS-MDOKFSTUDIO-MYST-001
- StRS-MDOKFSTUDIO-GFM-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystContextTags.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/core/render/includeBudget.test.ts
- test/core/render/includeMapping.test.ts
- test/core/render/renderReq.renderingCore.requirements.test.ts
---

## An include is expanded in place and mapped to its directive

### Normative behavior

When a trusted document holds an `{include}` directive for a Markdown file inside its folder or the workspace root, the extension SHALL render that file's content in place of the directive, map every included block to the lines of the directive and leave an unsupported include form as an unresolved placeholder.

### Scenario (nominal): Expand an include in place

- GIVEN a directive including `part.md` that starts with frontmatter
- WHEN it is rendered
- THEN the content of `part.md` appears at the directive position without its frontmatter

### Scenario (boundary): The class option expands and a missing file stays a placeholder

- GIVEN an include with the `:class:` option, and another naming a missing file
- WHEN it is rendered
- THEN the first still expands and the second stays in place as a placeholder

### Scenario (refusal): Keep unsupported include forms as placeholders

| Input | Outcome |
| --- | --- |
| an `{include}` with the `:literal:` option | the directive shows as a placeholder, not expanded |
| an `{include}` with an option other than `:class:` and `:label:` | the directive stays an unresolved placeholder |
| an `{include}` with an empty argument | see Known issues |
| an `{include}` with only `:class:` | the file is expanded |
| a plain include or an include with `:label:` | the file is expanded |

### Scenario (nominal): Map included blocks to the include directive

- GIVEN an include on line 7 of the host document
- WHEN it is rendered
- THEN every block of the included file carries line 7 and the included mark

### Scenario (boundary): Nested includes carry the outer directive line

- GIVEN an included file that includes another file
- WHEN it is rendered
- THEN blocks of the inner file carry the outer directive line and the included mark

### Scenario (nominal): Read a repeated include once per render

- GIVEN a file included three times, by directives on different lines
- WHEN it is rendered
- THEN the file is read once and each copy maps to its own directive line

### Scenario (nominal): Expand alerts in included files and context tags

| Input | Outcome |
| --- | --- |
| an included file with a `> [!NOTE]` alert | the alert renders as a note panel |
| an alert in a grouped context tag | the alert renders as a note panel |

### Known issues

- Known issue: an `{include}` with an empty argument does not leave a placeholder; the writer fails on the missing argument text and the whole render is refused with an error. The `:literal:` and other-option forms do leave the placeholder.

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-013: depth, budget, size and allowed roots that bound an include

### Verification notes

- Method: Unit test "a 60-chapter book with 5 snippets each renders fully within the budget" in test/core/render/includeBudget.test.ts (nominal expand, boundary class option)
- Method: Unit test "an include repeated many times is read once per render" in test/core/render/includeBudget.test.ts (nominal repeated include)
- Method: Unit test "included blocks map to the directive lines only" in test/core/render/includeMapping.test.ts (nominal map, boundary nested)
- Method: Unit test "an include with :literal:, an empty argument or an other option stays a placeholder; :class: expands" in test/core/render/renderReq.renderingCore.requirements.test.ts (refusal unsupported forms)
- Method: Unit test "a GitHub alert in an included file or in a grouped context tag renders as a note panel" in test/core/render/renderReq.renderingCore.requirements.test.ts (nominal alerts)
- Criteria: The included Markdown is rendered at the directive position with its frontmatter stripped. Only plain, `:class:` and `:label:` includes expand. Included blocks carry the host directive line and the included attribute at any depth. A single read per render and distinct lines per use. Alerts render in these two contexts as at top level.
