# Markdown OKF-Schema Studio

![Markdown OKF-Schema Studio logo](images/logo.png)

[![CI](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml) [![Latest release](https://img.shields.io/github/v/release/gsemet/markdown-okf-schema-studio?display_name=tag&sort=semver)](https://github.com/gsemet/markdown-okf-schema-studio/releases) [![License](https://img.shields.io/github/license/gsemet/markdown-okf-schema-studio)](LICENSE)

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio) | [Screenshot report/gallery](https://gsemet.github.io/markdown-okf-schema-studio/gallery.html) | [Reports index](https://gsemet.github.io/markdown-okf-schema-studio/reports/) | [Requirements](https://gsemet.github.io/markdown-okf-schema-studio/requirements.html)

Markdown OKF-Schema Studio is a visual Markdown editor for VS Code. You read a clean rendered
page and click any block to edit its source. It renders [CommonMark](https://commonmark.org/),
[GitHub Flavored Markdown](https://github.github.com/gfm/),
[Sphinx MyST](https://myst-parser.readthedocs.io/),
[OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) and
[OKF-Schema](https://github.com/gsemet/okf-schema).

![A Cream preview of a handbook: properties table, title, card grid, admonition and figure](images/readme/showcase-hero.png)

## Why Studio

### Edit MyST visually

Click a grid card, a nested admonition, a figure or a `{list-table}` and edit it in place.
Edits touch only the block you change, in one undo step; the rest of the file is never rewrapped.

![Editing a MyST admonition while the card grid and figure stay rendered](images/readme/showcase-myst-edit.png)

### Edit schema-aware properties

Frontmatter becomes a properties table with JSON Schema diagnostics, enum controls and typed
editors. `x-okf-link` annotations show metadata and line numbers of linked evidence.

![The OKF properties table with type icons and field descriptions](images/readme/showcase-schema-cream.png)

### Read wide tables and text

In Auto width the text keeps a comfortable narrow column, while a wide table or figure breaks out
of it and is centred.

![A narrow text column with a wide table and a wide figure breaking out of it](images/readme/margin-break-cream.png)

### See what changed since the last commit

Blocks changed since the last Git commit, unsaved edits included, are marked with a green bar in
the live preview. A toolbar button toggles the marks.

![Blocks changed since the last commit marked with a green bar](images/readme/showcase-diff-cream.png)

### Review with comment threads

Select a passage of the document and start a comment thread on it. The thread is anchored to that
passage, follows it when the text moves, and is stored in a `.comments.json` file next to the
document, so it is versioned with the Markdown in Git and needs no server. Readers can reply,
resolve and delete threads from the popover that opens on the highlighted text.

![An open comment thread on a passage, with a comment, a reply, and the Resolve, Delete and Reply controls](images/readme/showcase-comment-thread.png)

Comments are signed with the `markdownOkfSchemaStudio.comments.authorName` setting. Left empty, it
falls back to your Git `user.name`, then to your operating system user name, and you can override
it per user, workspace or folder. Comment threads are the groundwork for future interactive
multi-user capabilities, a direction we are exploring with no date attached.

### Mermaid and PlantUML, no Java

Mermaid and PlantUML diagrams are drawn by built-in engines. PlantUML needs no Java, no server and
no network, and it works in Restricted Mode.

![A Mermaid flowchart and a PlantUML sequence diagram rendered inline](images/readme/showcase-diagrams-cream.png)

### Themes

Cream, a warm low-glare paper palette, is the default; Dark, White and the current VS Code theme
are one button away.

| Dark | White | Cream |
| --- | --- | --- |
| ![Dark theme](images/readme/theme-dark.png) | ![White theme](images/readme/theme-white.png) | ![Cream theme](images/readme/theme-cream.png) |

### And more

- A Notion-style slash menu and an edition palette (Strict, GFM or MyST buttons).
- Block selection, multi-block copy, cut, paste and move.
- Rich paste from Google Docs, Word or a web page, converted to Markdown.
- A Sphinx check of the syntax you use against `myst_enable_extensions` in `conf.py`.

## How it compares

Checked on 2026-10-25 against the VS Code Markdown editor and preview, Markdown All in One,
Markdown Preview Enhanced, other WYSIWYG extensions and the MyST extension.

| Studio feature | Found elsewhere |
| --- | --- |
| Visual editing of MyST grids, admonitions, figures and list tables | No equivalent found |
| Schema-aware OKF frontmatter editing and `x-okf-link` evidence | No equivalent found |
| Human review threads in a JSON file next to the document | No equivalent found |
| Mermaid and PlantUML together, without Java | No equivalent found |

"No equivalent found" means the pages we read do not document one; that is not proof of absence.
Versions and sources are in [the comparison](docs/user/comparison.md).

## Install

Install **Markdown OKF-Schema Studio** from the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio),
or search for it in the Extensions view and select **Install**.

## Open Studio

Use **Open With...** on a Markdown tab and select **Markdown OKF-Schema Studio**. For a side-by-side
source and preview, select the book icon in the editor title bar.

## Documentation

- [User guide](docs/user/README.md): the index of all pages below, including
  [install and open Studio](docs/user/open-studio.md) with screenshots.
- [Features and inline editing](docs/user/editing.md), [toolbar](docs/user/toolbar.md) and
  [slash menu](docs/user/slash-menu.md)
- [Themes and motion](docs/user/themes-and-motion.md) and
  [wide tables](docs/user/wide-tables.md)
- [PlantUML](docs/user/plantuml.md) and [review comments](docs/user/review-comments.md)
- [OKF and linked-file annotations](docs/user/okf.md) and [Sphinx projects](docs/user/sphinx.md)
- [Settings](docs/user/settings.md) and [comparison](docs/user/comparison.md)
- [CONTRIBUTING.md](CONTRIBUTING.md): development setup, validation, packaging and release evidence.
