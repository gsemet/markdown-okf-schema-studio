---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-005
uuid: a8534621-9619-427c-844e-8ad5320d95b9
title: Without a schema the table lists the keys in source order, escaped
description: When the frontmatter has no string `type`, or no schema lookup is
  made for the document, the extension SHALL show a two-column table headed
  Names and Values that lists the keys in source order, without type icons or a
  Description column, with every name, value, tooltip and data attribute escaped
  as text and its section marked as source line 1, and SHALL keep each key on
  one line in a key column as wide as its longest key, up to 40% of the table.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
- StRS-MDOKFSTUDIO-FMSCHEMA-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/okfFrontmatter.ts
- src/core/frontmatter/propertiesTable.ts
- src/core/preview/styles/propertiesStyles.ts
tested_in_files:
- test/core/frontmatter/okfFrontmatter.test.ts
- test/core/frontmatter/propertiesTable.test.ts
- test/core/preview/previewStyles.test.ts
- test/integration/genericMarkdown.test.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Without a schema the table lists the keys in source order, escaped

### Normative behavior

When the frontmatter has no string `type`, or no schema lookup is made for the document, the extension SHALL show a two-column table headed Names and Values that lists the keys in source order, without type icons or a Description column, with every name, value, tooltip and data attribute escaped as text and its section marked as source line 1, and SHALL keep each key on one line in a key column as wide as its longest key, up to 40% of the table.

### Scenario (nominal): No type

- GIVEN a document whose frontmatter is `b: 1` then `a: two`
- WHEN the preview is rendered
- THEN a two-column table with the headers Names and Values lists b before a, with no type icon, no Description column and no badge

### Scenario (boundary): Other reasons for the generic table

| Input | Outcome |
| --- | --- |
| A document whose frontmatter is `type: 5` then `a: 1` | The same generic two-column table lists type then a and no schema lookup message appears |
| A document whose frontmatter is `type: ''` then `a: 1` | The generic table is shown and no schema lookup is made, so no info row appears |
| A schema exists for the type and the workspace is in Restricted Mode | The table is generic and no field is editable |
| A Markdown file opened outside every workspace folder with a typed frontmatter | The table is generic |

### Scenario (refusal): Markup in a name or a value

| Input | Outcome |
| --- | --- |
| A field whose value is a bold tag, an ampersand and double quotes written as a YAML string | The Value cell shows the characters literally (escaped as lt, amp and quot entities) and no bold element is created |
| A field whose name contains an angle bracket | The name appears as text in the Name cell and in the row attributes, never as an element |

### Scenario (nominal): The properties section maps to source line 1

- GIVEN a document with frontmatter and a source mapping for the preview
- WHEN the table is rendered
- THEN the section carries the source line attribute 1
- WHEN the editor cursor is on line 1 of the source and the preview syncs to the source line
- THEN the preview scrolls back to the top where the properties section sits

### Scenario (boundary): The key column fits its keys

| Input | Outcome |
| --- | --- |
| Keys such as name, description and metadata next to a long description | The key column is as wide as the longest key; no key breaks inside a word and the Value column wraps in the rest |
| A long description and a nested metadata block of code next to short keys (a skill file), or keys shorter than the Names label | The key column keeps the width of its longest key (never a few pixels), no key breaks inside a word, the Names label stays whole and the value cell wraps its text and keeps its code block inside the cell |
| A key wider than 40% of the table | The key ends with an ellipsis, the key column stays within 40% of the table, and the full key is the tooltip of the key (shown for keys of more than 24 characters) |

### Known issues

- Known issue: the generic header reads Names / Values while a schema table reads Name / Value.
- Known issue: a file outside every workspace folder in a trusted workspace is also told that schema validation requires a trusted workspace, which is misleading.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-019: the schema lookup, which decides when the table is generic and when an info or warning row is added to it.

### Verification notes

- Method: `test/core/frontmatter/propertiesTable.test.ts` (no type, plain yaml tables stay two-column, escaped values, source mapping with data-line 1).
- Method: `test/integration/genericMarkdown.test.ts` (generic table; no test asserts the info row in Restricted Mode).
- Method: `test/core/frontmatter/okfFrontmatter.test.ts`, markers of the tests in `okfFrontmatter.test.ts` (analysis with schema resolution off).
- Method: `test/visual/scenarioDefinitions2.ts` (sync to line 1, 460 px scroll check).
- Criteria: Columns are Names and Values; rows follow the YAML key order. A document with a string type may add an info or warning row to the generic table (see the schema lookup requirement).
- Criteria: Output contains &lt;, &gt;, &amp; and &quot; in place of the raw characters; data-line 1 is added only when a source mapping is given.
- Criteria: The generic table lists the fields without schema, error or enum information.
- Method: `test/core/preview/previewStyles.test.ts` (key column rules: no wrap, ellipsis, 40% cap), `test/core/frontmatter/propertiesTable.test.ts` (full key as tooltip of a long key) and the scenarios `frontmatter-schema/v24-frontmatter-long-keys-cream-900` and `v25-frontmatter-long-keys-dark-900` of `test/visual/scenarioDefinitions1.ts` (every key on one line, key column within 40%, longest key ellipsized with its tooltip), plus `v26-frontmatter-skill-metadata-cream-900` and `v27-frontmatter-short-keys-dark-900` (a long description and a code block in the value, short keys: key cells as wide as their text, the Names label on one line) and the header rule test in `previewStyles.test.ts`.
- Criteria: The key column never breaks a key inside a word, takes the width of the longest key up to 40% of the table (the section is the size container, `40cqw`), and the value column takes the rest.
