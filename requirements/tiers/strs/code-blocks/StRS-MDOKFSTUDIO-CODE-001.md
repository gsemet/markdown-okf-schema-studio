---
type: StRS
id: StRS-MDOKFSTUDIO-CODE-001
uuid: 90675ebe-7c19-40bb-af92-107409d27763
title: Read highlighted code samples
description: When a writer previews a document with a fenced code block, the
  Studio SHALL show the code literally and, for a supported language, with
  syntax highlighting that follows the VS Code theme.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: Writers need code samples to read as they would in published
  documentation, in the language and colours of their editor.
derived_by:
- SwRS-MDOKFSTUDIO-CODE-001
- SwRS-MDOKFSTUDIO-CODE-002
- SwRS-MDOKFSTUDIO-CODE-003
- SwRS-MDOKFSTUDIO-CODE-004
- SwRS-MDOKFSTUDIO-CODE-005
- SwRS-MDOKFSTUDIO-CODE-006
- SwRS-MDOKFSTUDIO-CODE-007
- SwRS-MDOKFSTUDIO-CODE-012
- SwRS-MDOKFSTUDIO-CODE-013
- SwRS-MDOKFSTUDIO-CODE-016
- SwRS-MDOKFSTUDIO-CODE-030
- SwRS-MDOKFSTUDIO-CODE-031
- SwRS-MDOKFSTUDIO-CODE-037
- SwRS-MDOKFSTUDIO-CODE-038
---

## Read highlighted code samples

### Normative behavior

When a writer previews a document with a fenced code block, the Studio SHALL show the code literally and, for a supported language, with syntax highlighting that follows the VS Code theme.

### Preserved stakeholder intent

## User Need

Writers need code samples to read as they would in published documentation, in the language and colours of their editor.

### Rationale and constraints

- Unsupported languages stay plain monospace text; the shared language list is not documented in the README.
