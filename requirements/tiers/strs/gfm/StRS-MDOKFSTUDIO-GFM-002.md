---
type: StRS
id: StRS-MDOKFSTUDIO-GFM-002
uuid: d654f329-2a60-4bd7-b7dd-9206a014e8b8
title: GitHub Flavored Markdown renders as on GitHub
description: When a document uses GitHub alerts, strikethrough, footnotes or
  pipe tables, the Studio SHALL show them as GitHub would, in both LF and CRLF
  files.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see GitHub Flavored Markdown the way GitHub shows it.
derived_by:
- SwRS-MDOKFSTUDIO-CORE-045
- SwRS-MDOKFSTUDIO-GFM-008
- SwRS-MDOKFSTUDIO-GFM-009
- SwRS-MDOKFSTUDIO-GFM-010
- SwRS-MDOKFSTUDIO-GFM-011
- SwRS-MDOKFSTUDIO-GFM-012
- SwRS-MDOKFSTUDIO-GFM-013
- SwRS-MDOKFSTUDIO-GFM-014
- SwRS-MDOKFSTUDIO-GFM-015
- SwRS-MDOKFSTUDIO-GFM-037
---

## GitHub Flavored Markdown renders as on GitHub

### Normative behavior

When a document uses GitHub alerts, strikethrough, footnotes or pipe tables, the Studio SHALL show them as GitHub would, in both LF and CRLF files.

### Preserved stakeholder intent

Writers expect alerts, strikethrough, footnotes and pipe tables to look in the preview as they do on GitHub, whatever the line endings of the file.

As a writer, I see GitHub Flavored Markdown the way GitHub shows it.

### Rationale and constraints

- Applies to documents using LF or CRLF line endings; alerts inside code fences stay literal.
