---
type: StRS
id: StRS-MDOKFSTUDIO-GFM-002
uuid: d654f329-2a60-4bd7-b7dd-9206a014e8b8
title: GitHub Flavored Markdown renders as on GitHub, safely
description: When a document uses bare http(s) or www URLs, GitHub alerts,
  strikethrough, footnotes, pipe tables or the small raw HTML subset of
  collapsible details, keyboard keys, HTML tables and coloured spans, the Studio
  SHALL show them as GitHub would, in both LF and CRLF files, and drop unsafe
  HTML, unsafe colours and unsafe link schemes.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-11-12T12:30:00+01:00'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-11-12T12:30:00+01:00'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see GitHub Flavored Markdown the way GitHub shows it,
  with working links and the raw HTML that GitHub documents rely on, and nothing
  unsafe is rendered.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-012
- SwRS-MDOKFSTUDIO-CORE-044
- SwRS-MDOKFSTUDIO-CORE-045
- SwRS-MDOKFSTUDIO-CORE-056
- SwRS-MDOKFSTUDIO-CORE-062
- SwRS-MDOKFSTUDIO-GFM-001
- SwRS-MDOKFSTUDIO-GFM-002
- SwRS-MDOKFSTUDIO-GFM-003
- SwRS-MDOKFSTUDIO-GFM-004
- SwRS-MDOKFSTUDIO-GFM-005
- SwRS-MDOKFSTUDIO-GFM-006
- SwRS-MDOKFSTUDIO-GFM-007
- SwRS-MDOKFSTUDIO-GFM-008
- SwRS-MDOKFSTUDIO-GFM-009
- SwRS-MDOKFSTUDIO-GFM-010
- SwRS-MDOKFSTUDIO-GFM-011
- SwRS-MDOKFSTUDIO-GFM-012
- SwRS-MDOKFSTUDIO-GFM-013
- SwRS-MDOKFSTUDIO-GFM-014
- SwRS-MDOKFSTUDIO-GFM-015
- SwRS-MDOKFSTUDIO-GFM-029
- SwRS-MDOKFSTUDIO-GFM-030
- SwRS-MDOKFSTUDIO-GFM-031
- SwRS-MDOKFSTUDIO-GFM-032
- SwRS-MDOKFSTUDIO-GFM-033
- SwRS-MDOKFSTUDIO-GFM-034
- SwRS-MDOKFSTUDIO-GFM-035
- SwRS-MDOKFSTUDIO-GFM-036
- SwRS-MDOKFSTUDIO-GFM-037
- SwRS-MDOKFSTUDIO-GFM-038
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-GFM-001
- StRS-MDOKFSTUDIO-GFM-004
---

## GitHub Flavored Markdown renders as on GitHub, safely

### Normative behavior

When a document uses bare http(s) or www URLs, GitHub alerts, strikethrough, footnotes, pipe tables or the small raw HTML subset of collapsible details, keyboard keys, HTML tables and coloured spans, the Studio SHALL show them as GitHub would, in both LF and CRLF files, and drop unsafe HTML, unsafe colours and unsafe link schemes.

### Preserved stakeholder intent

Writers expect a pasted address to be clickable as on GitHub, without code samples or existing links being altered. They expect alerts, strikethrough, footnotes and pipe tables to look in the preview as they do on GitHub, whatever the line endings of the file. They also expect the small raw HTML subset used in GitHub documents to display, and expect unsafe content never to reach the preview.

### Rationale and constraints

- Applies to documents using LF or CRLF line endings; alerts inside code fences stay literal.
- Only http(s) and www addresses become links; code, existing links and unsafe schemes stay plain text, trailing sentence punctuation stays outside the link, and editing a paragraph still shows the raw URL text.
- Scripts, styles, frames and other active content are removed; only hex and rgb colours are kept on coloured text.

### Main paths

#### Path 1: Paste a link and a table

1. Prose holds a bare URL
   - SwRS-MDOKFSTUDIO-GFM-001: the page renders it as a link that follows the Markdown link policy
   - Option SwRS-MDOKFSTUDIO-GFM-001 (refusal): text with another meaning or another scheme is left unlinked
2. The URL is a link, and the prose holds struck text, a footnote or a pipe table
   - SwRS-MDOKFSTUDIO-GFM-008: the page renders the struck text, the footnote and the table with its column alignment
   - Option SwRS-MDOKFSTUDIO-GFM-008 (boundary): a single tilde pair and tildes in code stay literal
3. The struck text, the footnote and the aligned table are drawn

#### Path 2: Alerts and raw HTML tables

1. A block quote starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION]
   - SwRS-MDOKFSTUDIO-GFM-009: the page renders it as an admonition of that type
   - Option SwRS-MDOKFSTUDIO-GFM-009 (refusal): an unknown alert type is not an admonition
2. The alert is drawn as an admonition, and the document holds a raw HTML table
   - SwRS-MDOKFSTUDIO-GFM-031: the page rebuilds the table from the allow-list of tags and attributes
   - Option SwRS-MDOKFSTUDIO-GFM-031 (refusal): unsafe style and active content are removed
3. The raw HTML table is drawn with its spans and safe colours

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CORE-012](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-012.md): An include is expanded in place and mapped to its directive
  - [SwRS-MDOKFSTUDIO-CORE-044](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-044.md): Drop unsupported raw HTML
  - [SwRS-MDOKFSTUDIO-CORE-045](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-045.md): Expand alerts in included files and context tags
  - [SwRS-MDOKFSTUDIO-CORE-056](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-056.md): Rebuild raw HTML tables from an allow-list
  - [SwRS-MDOKFSTUDIO-CORE-062](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-062.md): Render details and kbd blocks
  - [SwRS-MDOKFSTUDIO-GFM-001](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-001.md): Bare URLs become safe links
  - [SwRS-MDOKFSTUDIO-GFM-002](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-002.md): Trailing punctuation stays outside bare URLs
  - [SwRS-MDOKFSTUDIO-GFM-003](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-003.md): Text with a meaning is not autolinked
  - [SwRS-MDOKFSTUDIO-GFM-004](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-004.md): Only http, https and www hosts are autolinked
  - [SwRS-MDOKFSTUDIO-GFM-005](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-005.md): Autolinks follow the Markdown link policy
  - [SwRS-MDOKFSTUDIO-GFM-006](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-006.md): Editing an autolink shows the raw URL
  - [SwRS-MDOKFSTUDIO-GFM-007](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-007.md): Pathological URLs render in linear time
  - [SwRS-MDOKFSTUDIO-GFM-008](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-008.md): Strikethrough, footnotes and pipe tables render as on GitHub
  - [SwRS-MDOKFSTUDIO-GFM-009](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-009.md): GitHub alerts render as admonitions
  - [SwRS-MDOKFSTUDIO-GFM-010](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-010.md): Alert marker text becomes the title
  - [SwRS-MDOKFSTUDIO-GFM-011](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-011.md): Legacy bold markers render as admonitions
  - [SwRS-MDOKFSTUDIO-GFM-012](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-012.md): Alert markers inside fences stay literal
  - [SwRS-MDOKFSTUDIO-GFM-013](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-013.md): Alerts render the same in CRLF documents
  - [SwRS-MDOKFSTUDIO-GFM-014](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-014.md): Footnotes render reference and text
  - [SwRS-MDOKFSTUDIO-GFM-015](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-015.md): Pipe tables keep header and column alignment
  - [SwRS-MDOKFSTUDIO-GFM-029](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-029.md): A small raw HTML subset renders and the rest is dropped
  - [SwRS-MDOKFSTUDIO-GFM-030](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-030.md): Raw kbd renders as a key cap
  - [SwRS-MDOKFSTUDIO-GFM-031](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-031.md): Raw HTML tables are rebuilt from an allow-list
  - [SwRS-MDOKFSTUDIO-GFM-032](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-032.md): Raw table styles keep a sanitized subset
  - [SwRS-MDOKFSTUDIO-GFM-033](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-033.md): Unsupported raw HTML is dropped
  - [SwRS-MDOKFSTUDIO-GFM-034](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-034.md): Colour spans keep safe colours only
  - [SwRS-MDOKFSTUDIO-GFM-035](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-035.md): The page revalidates span colours before applying
  - [SwRS-MDOKFSTUDIO-GFM-036](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-036.md): Removed span styles record a diagnostic
  - [SwRS-MDOKFSTUDIO-GFM-037](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-037.md): Alerts end at the first unquoted line
  - [SwRS-MDOKFSTUDIO-GFM-038](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-038.md): Raw HTML tables remove active content
- Supersedes:
  - [StRS-MDOKFSTUDIO-GFM-001](StRS-MDOKFSTUDIO-GFM-001.md): Bare URLs become safe links
  - [StRS-MDOKFSTUDIO-GFM-004](StRS-MDOKFSTUDIO-GFM-004.md): Small raw HTML subset renders safely
<!-- okf:links:end -->
