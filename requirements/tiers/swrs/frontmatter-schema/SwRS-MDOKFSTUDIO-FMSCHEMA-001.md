---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-001
uuid: 8840524e-667d-40f2-bcd8-9b56cef7e071
title: The frontmatter block is found by its fences and parsed as a YAML mapping
description: "When a document starts with a `---` line, the extension SHALL take the
  lines up to the first later `---` or `...` line that stands alone on its line, with
  LF or CRLF endings, as the frontmatter block and show it as a properties table when
  it parses to a YAML mapping, or as one error row \"Invalid frontmatter YAML: {parser
  message}\" with an error badge of 1 when it does not, and render the Markdown body
  below the table or the error row in both cases."
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
- StRS-MDOKFSTUDIO-FMSCHEMA-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/frontmatterParse.ts
- src/core/frontmatter/okfFrontmatter.ts
- src/core/render/mystRenderer.ts
tested_in_files:
- test/core/frontmatter/diagReq.frontmatter.requirements.test.ts
- test/core/frontmatter/frontmatterFence.test.ts
- test/core/frontmatter/frontmatterParseOnce.test.ts
- test/core/frontmatter/okfFrontmatter.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The frontmatter block is found by its fences and parsed as a YAML mapping

### Normative behavior

When a document starts with a `---` line, the extension SHALL take the lines up to the first later `---` or `...` line that stands alone on its line, with LF or CRLF endings, as the frontmatter block and show it as a properties table when it parses to a YAML mapping, or as one error row "Invalid frontmatter YAML: {parser message}" with an error badge of 1 when it does not, and render the Markdown body below the table or the error row in both cases.

### Scenario (nominal): Closing with three dashes or three dots

- GIVEN a document starting with `---`, a line `title: Hello` and a closing line `...` followed by a heading
- WHEN the preview is rendered
- THEN a properties table at the top lists the field title with the value Hello and the heading follows it

### Scenario (boundary): Where the closing fence is recognised

| Input | Outcome |
| --- | --- |
| A frontmatter line `note: wait...` followed by a closing `---` line | The table lists the field note with the value `wait...`; the block closes at the `---` line, not at the dots inside the value |
| A closing `---` or `...` line followed by trailing spaces or tabs | The line still closes the block |
| A document whose opening fence, fields and closing fence all end with CRLF | The table lists the same fields and values as the LF form of the document |
| A CRLF document closed by a `...` line | The block closes at the `...` line and the table lists the fields above it |
| A document with only the two fence lines | The block is valid and empty; it parses to null and gets the not-a-mapping error row (see the scenario on a block that is not a mapping) |

### Scenario (refusal): Opening fence without a closing fence

- GIVEN a document with `---`, the lines `title: Open` and `status: draft`, a heading and no closing fence line
- WHEN the preview is rendered
- THEN the document has no frontmatter and no properties table is shown
- WHEN a closing `---` line is inserted after the two fields and the preview refreshes
- THEN the table appears with the fields title and status

### Scenario (refusal): Invalid YAML

| Input | Outcome |
| --- | --- |
| A document whose frontmatter is the single line `k: [a` followed by a heading | The table holds one alert row starting with "Invalid frontmatter YAML:" and the badge reads 1 error |
| A broken frontmatter that also names a type with a schema | No schema is applied, no field row is listed and the single error row is shown |

### Scenario (refusal): A block that is not a mapping

| Input | Outcome |
| --- | --- |
| A frontmatter block holding the two list items `- a` and `- b` | The table holds the error row "Invalid frontmatter YAML: Frontmatter is not a mapping." and the badge reads 1 error |
| A document whose frontmatter is only the two fence lines | The same error row is shown, because an empty block parses to null |
| A block that parses to a scalar | The same error row is shown |

### Scenario (nominal): The body renders when the YAML is invalid

| Input | Outcome |
| --- | --- |
| A document whose frontmatter is the single line `k: [a` followed by a heading | The heading is rendered below the error row |
| The same document with `markdownOkfSchemaStudio.frontmatter.propertiesTable` false | No error row appears and the heading is rendered |

### Known issues

- Known issue: a leading byte-order mark in the document text itself is not stripped, so such a text has no frontmatter (it is stripped only when a linked target is read).
- Known issue: the parser message is the raw text of the YAML library, with line numbers relative to the frontmatter and caret markers.
- Known issue: a YAML alias that expands more than 100 times fails the parse and is reported as invalid YAML, not as a mapping problem.
- Known issue: an empty block is a valid fence but still gets the not-a-mapping error row.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-004: the propertiesTable setting that hides the table and the error row.

### Verification notes

- Method: `test/core/frontmatter/frontmatterFence.test.ts` (closing fence, value ending in dots, CRLF, no closing fence, empty block).
- Method: `test/core/frontmatter/diagReq.frontmatter.requirements.test.ts` (block that is not a mapping: list and empty block).
- Method: `test/core/frontmatter/okfFrontmatter.test.ts`, markers of the tests in `okfFrontmatter.test.ts` (extraction reports invalid YAML).
- Method: `test/visual/scenarioDefinitions2.ts` (invalid YAML: row text, badge of 1 and heading rendered below; table off). The row text and the badge of 1 are asserted by the visual scenario only.
- Criteria: The closing fence is recognised only alone on its line (trailing spaces and tabs allowed); a value ending in `...` or `---` never closes the block; the block length and the line ending are detected from the opening fence and a CRLF closing line is accepted in both forms; no closing fence gives present = false and no table.
- Criteria: The error row has role alert and spans every column; the summary is 1 error, 0 warnings, 0 infos; the frontmatter block is left out of the body whether or not it parses.
