---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-009
uuid: 5e63ff09-6841-4031-8ddb-cda015f5369b
title: GitHub alerts render as admonitions
description: When a block quote starts with [!NOTE], [!TIP], [!IMPORTANT],
  [!WARNING] or [!CAUTION] in any case, the extension SHALL render it as an
  admonition of that type with the default title and the quoted lines as
  Markdown body, using the text after the marker as the title and ending the
  admonition at the first unquoted line.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/mystGithubAlerts.ts
tested_in_files:
- test/core/render/crlfAlerts.test.ts
- test/core/render/mystFeatures.test.ts
- test/core/render/mystPaletteRendering.test.ts
---

## GitHub alerts render as admonitions

### Normative behavior

When a block quote starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION] in any case, the extension SHALL render it as an admonition of that type with the default title and the quoted lines as Markdown body, using the text after the marker as the title and ending the admonition at the first unquoted line.

### Scenario (nominal): Each alert type renders

- GIVEN a block quote starting with > [!warning] and a body line (and likewise [!NOTE], [!TIP], [!IMPORTANT] and [!CAUTION] in any case)
- WHEN the preview is rendered
- THEN an admonition titled Warning contains the body as Markdown

### Scenario (refusal): Unknown alert type

- GIVEN a block quote starting with > [!FOO]
- WHEN the preview is rendered
- THEN it stays a plain block quote

### Scenario (nominal): Title from the marker line

| Input | Outcome |
| --- | --- |
| `> [!WARNING] Read this` | the admonition title is Read this |
| `> [!WARNING]` alone | the title is the default Warning |

### Scenario (nominal): Legacy bold markers

- GIVEN a block quote whose first line is '> **Note**' (or **Important**, **Warning**, in any case) followed by text
- WHEN the preview is rendered
- THEN a simple admonition of the marker's type (Note, Important or Warning) contains the text

### Scenario (refusal): Bold marker with extra text

- GIVEN a block quote line '> **Note** and more'
- WHEN the preview is rendered
- THEN it stays a plain block quote

### Scenario (boundary): Fences keep alert markers literal

| Input | Outcome |
| --- | --- |
| '> [!NOTE]' within a fenced code block | the marker stays literal code and no admonition is produced |
| a fenced block followed by a real alert | the fence content is literal and the alert after it is an admonition |

### Scenario (boundary): The admonition ends at the first unquoted line

| Input | Outcome |
| --- | --- |
| an alert followed directly by an unquoted paragraph | the paragraph is outside the admonition |
| an alert followed by a blank line and a paragraph | the paragraph is outside the admonition and later source line numbers are unchanged |

### Scenario (boundary): CRLF documents

| Input | Outcome |
| --- | --- |
| an alert written with CRLF line endings | an admonition is produced |
| a CRLF document mixing a fence and an alert | the HTML equals the LF rendering |

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (alert types, unknown type, title, legacy bold markers: unit tests on the render pipeline output).
- Method: test/core/render/mystPaletteRendering.test.ts (alert types, end at the first unquoted line: unit tests on the render pipeline output).
- Method: test/core/render/crlfAlerts.test.ts (fence scenario and CRLF scenario: unit tests on the render pipeline output).
- Criteria: One admonition per known type and none for unknown types; the title equals the marker trailing text, else the default; simple admonitions only for lone bold markers; no admonition inside a fence while alerts outside are unaffected; the admonition body contains only quoted lines; CRLF and LF outputs are identical.
