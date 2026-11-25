---
type: StRS
id: StRS-MDOKFSTUDIO-MYST-018
uuid: 677fd5dd-ea2f-44ef-ac81-8815decd7bc1
title: Definition lists and inline roles are typeset in the preview
description: When a document uses MyST definition lists or the inline roles for
  subscript, superscript, abbreviations, keys, documents and downloads, the
  Studio SHALL typeset them in the preview without a Sphinx build, and SHALL
  keep a numbered reference it cannot number as inert text.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
scenarios:
- id: S1
  title: Text constructs
user_need: As a writer, I want definition lists and inline roles typeset as
  readers will see them, without building, so that I can check my text in VS
  Code.
derived_by:
- SwRS-MDOKFSTUDIO-MYST-017
supersedes:
- StRS-MDOKFSTUDIO-MYST-001
default_owner_email: gaetan@xeberon.net
---

## Definition lists and inline roles are typeset in the preview

### Normative behavior

When a document uses MyST definition lists or the inline roles for subscript, superscript, abbreviations, keys, documents and downloads, the Studio SHALL typeset them in the preview without a Sphinx build, and SHALL keep a numbered reference it cannot number as inert text.

### Preserved stakeholder intent

Writers want definition lists, subscript, superscript, abbreviations and keys typeset in the preview, so that they can check the text without building.

### Rationale and constraints

- Definition lists, subscript, superscript, abbreviations and keys are typeset in the preview without a Sphinx build.
- Document and download roles are plain links to the written target.
- A numbered reference needs a build to get its number; it stays an inert placeholder.
- Taken from StRS-MDOKFSTUDIO-MYST-001 (definition lists and text roles), which this StRS and three others replace.

### Use case diagram

```mermaid
sequenceDiagram
    actor W as Writer
    participant P as Preview page
    W->>P: writes a definition list or an inline role
    alt a term followed by definition lines
        P-->>W: a definition list
    else a sub, sup, abbr or kbd role
        P-->>W: subscript, superscript, an abbreviation with its expansion as title, or a key
    else a doc or download role
        P-->>W: a plain link to the written target
    else a numref role
        P-->>W: an inert placeholder, never a numbered link
    end
```

### Main paths

#### Path S1: Text constructs

1. A document holds a definition list or an inline role
   - SwRS-MDOKFSTUDIO-MYST-017: the page renders a definition list, subscript, superscript, an abbreviation or a key
   - Option SwRS-MDOKFSTUDIO-MYST-017 (refusal): a numbered reference stays an inert placeholder
2. The text is typeset

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-MYST-017](../../swrs/myst/SwRS-MDOKFSTUDIO-MYST-017.md): Definition lists and inline roles are typeset
- Supersedes:
  - [StRS-MDOKFSTUDIO-MYST-001](StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
<!-- okf:links:end -->
