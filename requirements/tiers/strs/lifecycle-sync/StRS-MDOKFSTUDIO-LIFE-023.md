---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-023
uuid: d69de1f3-13c3-4ce8-ad19-125933b2f53f
title: A reader opens a Markdown file at a searched line and sees that line
  marked in Studio
description: When a reader opens a Markdown file at a line from a search, Quick
  Open, a problem or a link, the Studio SHALL show that file in a Studio tab at
  that line with the line marked, through settings of its own, while leaving
  diffs, text editors asked for on purpose and the side preview workflow as text
  editors.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I click a search result, a problem or a link to a
  Markdown file and land in Studio on that line, with an arrow showing me where
  it is; I keep my diffs as text, I can still ask for the raw text, and the
  editor association I set for Markdown keeps working through a Studio setting.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-174
- SwRS-MDOKFSTUDIO-LIFE-175
- SwRS-MDOKFSTUDIO-LIFE-176
- SwRS-MDOKFSTUDIO-LIFE-177
default_owner_email: gaetan@xeberon.net
---

## A reader opens a Markdown file at a searched line and sees that line marked in Studio

### Normative behavior

When a reader opens a Markdown file at a line from a search, Quick Open, a problem or a link, the Studio SHALL show that file in a Studio tab at that line with the line marked, through settings of its own, while leaving diffs, text editors asked for on purpose and the side preview workflow as text editors.

### Preserved stakeholder intent

As a reader, I click a search result, a problem or a link to a Markdown file and land in Studio on that line, with an arrow showing me where it is; I keep my diffs as text, I can still ask for the raw text, and the editor association I set for Markdown keeps working through a Studio setting.

### Rationale and constraints

- Round 1 of the change ships the pieces the reader meets first: the settings group Opening Files, the one-time move of a `*.md` editor association to a Studio setting, the one-time feature introduction, the on-demand "Open as Text" command, and the lazy start of the preview services. The marker, the opening policy and the watcher are specified when they ship.
- Studio never writes a built-in `markdown.preview.*` setting; its only settings write is the association migration.
- A Markdown file alone activates the extension (activation event `onLanguage:markdown`), so the opening watcher can run before any preview exists; the engine, the watchers and the diagnostics stay off until the first Studio preview.

### Use case diagram

```mermaid
flowchart LR
    R([Reader]) -->|sets Opening Files settings| S[Studio settings]
    R -->|Open as Text on a Studio tab| T[Text editor of the file]
    M[Old *.md editor association] -->|moved once, with a notice| S
    S -->|round 1: stored; the opening watcher reads them in a later round| W[Opening watcher]
```

### Main paths

#### Path 1: Keep the raw text one command away

1. A Markdown file shows in a Studio tab
   - SwRS-MDOKFSTUDIO-LIFE-177: the reader runs Open as Text and the text editor of the same file opens in the same group, at the line shown
   - Option SwRS-MDOKFSTUDIO-LIFE-177 (refusal): when the active tab is not a Studio tab, a message says so and nothing opens
2. The reader reads and edits the raw text

#### Path 2: Move to the Studio settings

1. The reader's user or workspace settings hold the `*.md` association to the Studio editor
   - SwRS-MDOKFSTUDIO-LIFE-175: the extension moves it to open.markdownFilesInStudio once per scope and shows one notice
   - Option SwRS-MDOKFSTUDIO-LIFE-175 (refusal): a write that fails keeps the association and tries again at the next start
2. The settings group Opening Files shows the two settings
   - SwRS-MDOKFSTUDIO-LIFE-174: the group lists the settings with their defaults
   - SwRS-MDOKFSTUDIO-LIFE-176: the feature introduction shows once and can be shown again
3. The reader has the Studio settings and the notices

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-174](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-174.md): The Opening Files settings choose when Studio takes the place of a text editor
  - [SwRS-MDOKFSTUDIO-LIFE-175](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-175.md): The editor association of Markdown files is migrated to the Studio setting once per scope
  - [SwRS-MDOKFSTUDIO-LIFE-176](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-176.md): Feature introductions show once and can be shown again
  - [SwRS-MDOKFSTUDIO-LIFE-177](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-177.md): Open as Text replaces a Studio tab by the text editor of the same file
<!-- okf:links:end -->
