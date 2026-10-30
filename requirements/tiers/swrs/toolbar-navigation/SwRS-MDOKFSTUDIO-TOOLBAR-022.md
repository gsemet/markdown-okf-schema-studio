---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-022
uuid: c7bbbae2-3fea-4ba0-980b-8638a980dab6
title: "The sticky heading depth setting decides how many levels stay pinned"
description: "When the page reads markdownOkfSchemaStudio.preview.stickyHeadingDepth,
  the extension SHALL round it, keep it between 1 and 6, use 3 when it is not a number,
  show at most that many band lines, and load the full page again with the new depth,
  rather than patch the content in place, when the setting changes while a preview
  is open."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-004
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/preview/contentPatch.ts
- src/page/features/stickyHeadings.ts
- src/page/pageSettings.ts
tested_in_files:
- test/core/configuration/previewConfiguration.test.ts
- test/core/preview/contentPatch.test.ts
- test/page/pageSettings.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The sticky heading depth setting decides how many levels stay pinned

### Normative behavior

When the page reads markdownOkfSchemaStudio.preview.stickyHeadingDepth, the extension SHALL round it, keep it between 1 and 6, use 3 when it is not a number, show at most that many band lines, and load the full page again with the new depth, rather than patch the content in place, when the setting changes while a preview is open.

### Scenario (boundary): Out of range and not a number
| Value | Depth |
| --- | --- |
| 0 | 1 |
| 4.6 | 5 |
| 12 | 6 |
| NaN or a string | 3, the default of the setting |

### Scenario (nominal): Page uses the configured depth
| Depth | Heading | Band |
| --- | --- | --- |
| 1 | a heading with two parents | only the current heading |
| 6 | a heading with five parents | six lines |

### Scenario (nominal): Setting changed
- GIVEN an open preview and a new stickyHeadingDepth
- WHEN the next render is sent
- THEN the context key differs, so no content patch is planned and the whole page is assigned with the new depth

### Scenario (boundary): Setting unchanged
- GIVEN an open preview and an unrelated edit
- WHEN the next render is sent
- THEN the context key is equal and the content may be patched

### Verification notes
- Method: test/core/configuration/previewConfiguration.test.ts (Out of range and not a number: normalizes sticky heading depth to one through six levels); the setting is listed by the package contract test.
- Method: test/page/pageSettings.test.ts (Out of range and not a number: the sticky heading depth is rounded and clamped to 1..6, else 3).
- Method: test/page/runtimeScroll.test.ts (Page uses the configured depth: uses the configured sticky heading depth) and visual scenarios toolbar-navigation/v01 to v03 in test/visual/scenarioDefinitions2.ts.
- Method: test/core/preview/contentPatch.test.ts (Setting changed and Setting unchanged: stickyHeadingDepth is a startup setting, so it is part of runtimeContextKey, which the render compares before it plans a content patch; unit test T34, the runtime context key covers the startup settings, asserts that the key changes with stickyHeadingDepth; the full-page assignment itself is untested).
- Criteria: Rounded integer in 1..6, else 3; package.json declares default 3, minimum 1, maximum 6; line count <= depth; a different runtimeContextKey implies a full page assignment.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-004](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-004.md): The reader always sees the section being read
<!-- okf:links:end -->
