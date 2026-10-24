---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-054
uuid: bc7f6ed4-127c-4abb-867a-7bd4d973cd81
title: List documents matching a toctree glob
description: When a `{toctree}` entry uses `*`, `**`, `?` or `[abc]`, the
  extension SHALL list the matching `.md`, `.markdown` and `.myst` documents
  below the folder in sorted order.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## List documents matching a toctree glob

### Normative behavior

When a `{toctree}` entry uses `*`, `**`, `?` or `[abc]`, the extension SHALL list the matching `.md`, `.markdown` and `.myst` documents below the folder in sorted order.

### Scenario: Nominal list documents matching a toctree glob

- GIVEN a folder with `b.md` and `a.md`
- WHEN a glob `*` is rendered
- THEN a.md is listed before b.md

### Scenario: Boundary or refusal of list documents matching a toctree glob

- GIVEN a non-Markdown file
- WHEN the glob is rendered
- THEN it is not listed

### Verification notes

- Method: test
- Criteria: Matches are Markdown documents, sorted.
