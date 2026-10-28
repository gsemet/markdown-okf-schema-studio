# Markdown OKF-Schema Studio

![Markdown OKF-Schema Studio logo](images/logo.png)

[![CI](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gsemet/markdown-okf-schema-studio/actions/workflows/ci.yml) [![Latest release](https://img.shields.io/github/v/release/gsemet/markdown-okf-schema-studio?display_name=tag&sort=semver)](https://github.com/gsemet/markdown-okf-schema-studio/releases) [![License](https://img.shields.io/github/license/gsemet/markdown-okf-schema-studio)](LICENSE)

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio) | [Screenshot report/gallery](https://gsemet.github.io/markdown-okf-schema-studio/gallery.html) | [Requirements](https://gsemet.github.io/markdown-okf-schema-studio/requirements.html)

Markdown OKF-Schema Studio is a visual Markdown editor for VS Code. You read a clean rendered
page and click any block to edit its source. It renders [CommonMark](https://commonmark.org/),
[GitHub Flavored Markdown](https://github.github.com/gfm/),
[Sphinx MyST](https://myst-parser.readthedocs.io/),
[OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) and
[OKF-Schema](https://github.com/gsemet/okf-schema).

> [!TIP]
> **Version 1.0.0 is out.** See what's new in the [release notes](https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0).

**Example of complex Markdown rendering**

[![A long Cream page in Auto width: figure, tables, a wide table breaking out of the column, a chart and a diagram](images/readme/release-showcase.png)](images/readme/release-showcase.png)

## Why Markdown OKF-Schema Studio?

> [!IMPORTANT]
> TL;DR: I love [MyST](https://mystmd.org/). It is underrated, it allows complex Markdown
> structures, and LLMs know it very well.
>
> I also use [OKF bundles](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
> a lot, and I added JSON Schema validation to them with
> [OKF-Schema](https://github.com/gsemet/okf-schema), so I needed an elegant way to view their
> front matter.
>
> With the rise of agentic coding, I also review Markdown documents all day long, and it strains
> the eyes. HTML artifacts (asking the agent to generate HTML) are not collaborative: you cannot
> annotate them.
> In one sentence: I need (and hopefully many others do too) a beautiful, rich and collaborative
> surface between me and my agents.
>
> And I wanted Mermaid, PlantUML, Vega-Lite, tables and rich admonitions.

> [!NOTE]
> The Markdown rendering and editing experience of Obsidian is nice, but I hate having to work
> through a "vault" and to install a plugin for everything.


### Markdown is the natural language of coding agents

LLMs love Markdown. It is an ideal format for collaborating on documents.
But plain Markdown lacks rich capabilities such as structured grids and columns,
so we usually end up asking the agent for an HTML specification instead.

And we lose collaboration instantly.

### Highest respect for the raw Markdown

Edits touch only the block you change, in one undo step.
This editor never rewraps or reformats the rest of the file,
so edits stay small and the diff stays clean.

### Edit MyST visually

Sphinx MyST is an awesome but underrated Markdown extension
that gives just the right amount of structure to Markdown documents:

- grids, columns
- admonitions
- figures
- `{list-table}`

Here is an example of edition on a MyST documentation,
that will be later published on ReadTheDocs for instance:

![Editing a MyST admonition while the card grid and figure stay rendered](images/readme/showcase-myst-edit.png)

`{versionadded}`, `{versionchanged}` and `{deprecated}` get their title ("Added in version 0.47"),
a standalone `{card}` shows its `:header:` and `:footer:`, and a `{tab-set}` becomes a tab bar with
one panel at a time: click a tab, or move with the arrow keys, Home and End. In edit mode each tab
item is a block of its own.

| Cream | Dark |
| --- | --- |
| ![Version notes, a card with header and footer, and a tab set on the cream page](images/readme/myst-cards-tabs-cream.png) | ![The same version notes, card and tab set on the dark page](images/readme/myst-cards-tabs-dark.png) |

### Edit schema-aware properties

Agents loves markdown with frontmatter but lack structure.
OKF-Schema is an external tool that adds a customizable schema
these frontmatter that become a properties table
with description, enum controls and typed editors.

`x-okf-link` is an optional extension from OKF-Schema that allows
to dynamically show metadata and line numbers of related links.

![The OKF properties table with type icons and field descriptions](images/readme/showcase-schema-cream.png)

### Read wide tables and text

In Auto width the text keeps a comfortable narrow column,
while a wide table or figure breaks out of it and is centred
(heavily inspired by [Medium](https://medium.com/) user experience)

![A narrow text column with a wide table and a wide figure breaking out of it](images/readme/margin-break-cream.png)

### See what changed since the last commit

Blocks changed since the last Git commit, unsaved edits included, are marked with a green bar in
the live preview, and so is each changed or added front matter field in the properties table. A
toolbar button toggles the marks.

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

### Decide in the page: choices in your plans

An agent writes a plan with two or three approaches as a list of `( )` and `(x)` items, the
recommended one preselected. Two or more such items in a row render as a radio group, and one click
on another option switches the choice in the Markdown: at most two lines change, in one undo step.
On GitHub and in a plain editor the `( )` and `(x)` text stays readable.

```markdown
Fix direction:

- (x) A click in the margin around the block opens its editor
- ( ) Alt+click on the link opens the editor
- ( ) Leave as is: edit link-only blocks in the source
```

| Cream | Dark |
| --- | --- |
| ![A plan with two radio groups, the recommended option of each selected, and a task list on the cream page](images/readme/radio-plan-cream.png) | ![The same plan on the dark page](images/readme/radio-plan-dark.png) |

### Mermaid and PlantUML, no Java

Mermaid and PlantUML diagrams are drawn by built-in engines. PlantUML needs no Java, no server and
no network, and it works in Restricted Mode.

![A Mermaid flowchart and a PlantUML sequence diagram rendered inline](images/readme/showcase-diagrams-cream.png)

### Charts, no executable

`vega-lite` and `vega` fences are drawn as charts in the preview, themed like the page, from inline
data or a CSV file next to the document. The runtime is bundled and loads only on a page that has a
chart; nothing runs outside VS Code and nothing is fetched. The new **Full** palette mode adds the
Vega-Lite chart and Vega chart commands (`/chart`, `/vega`).

| Cream | Dark |
| --- | --- |
| ![A Vega-Lite bar chart and a Vega line chart on the cream page](images/readme/charts-cream.png) | ![The same charts on the dark page](images/readme/charts-dark.png) |

### Themes

Cream, a warm low-glare paper palette, is the default; Dark, White and the current VS Code theme
are one button away.

| Dark | White | Cream |
| --- | --- | --- |
| ![Dark theme](images/readme/theme-dark.png) | ![White theme](images/readme/theme-white.png) | ![Cream theme](images/readme/theme-cream.png) |

### And more

- A Notion-style slash menu and an edition palette (Strict, GFM, MyST or Full buttons).
- Block selection, multi-block copy, cut, paste and move.
- Rich paste from Google Docs, Word or a web page, converted to Markdown.
- Dropping files from the Explorer writes links and images at the drop point.
- Pasting a URL makes a link (over selected text), an autolink or, for an image address, an image.
- A Sphinx check of the syntax you use against `myst_enable_extensions` in `conf.py`.

## Install

Install **Markdown OKF-Schema Studio** from the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio),
or search for it in the Extensions view and select **Install**.

## Usage with coding agent

The repository also ships an agent skill, `writing-for-markdown-okf-schema-studio`, that teaches
an AI agent which Markdown Studio renders well (cards, tabs, admonitions, charts, diagrams). The
repository root is a plugin, so every host below reads the same `skills/` folder. Install the plugin
with your host; copying the skill folder is only a last resort.

1. [Claude Code](https://code.claude.com/docs/en/plugin-marketplaces): add the repository as a
   marketplace, then install the plugin from it.

   ```text
   /plugin marketplace add gsemet/markdown-okf-schema-studio
   /plugin install markdown-okf-schema-studio@markdown-okf-schema-studio
   ```

   From a shell: `claude plugin marketplace add gsemet/markdown-okf-schema-studio`, then
   `claude plugin install markdown-okf-schema-studio@markdown-okf-schema-studio`.

2. GitHub Copilot, in one of three ways depending on the harness.
   - (a) Copilot CLI (terminal): add the marketplace, then install the plugin as
     `PLUGIN-NAME@MARKETPLACE-NAME`.

     ```bash
     copilot plugin marketplace add gsemet/markdown-okf-schema-studio
     copilot plugin install markdown-okf-schema-studio@markdown-okf-schema-studio
     ```

     A direct install also works: `copilot plugin install gsemet/markdown-okf-schema-studio`. The
     accepted sources are `plugin@marketplace`, `owner/repo`, `owner/repo:path` and a git URL (see
     `copilot plugin install --help` and
     [Finding and installing plugins](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing)).
   - (b) VS Code with the local Copilot harness, per the
     [VS Code agent plugins](https://code.visualstudio.com/docs/copilot/customization/agent-plugins)
     page: add `gsemet/markdown-okf-schema-studio` to the setting
     [`chat.plugins.marketplaces`](vscode://settings/chat.plugins.marketplaces), then open the
     Extensions view, search `@agentPlugins` and select **Install**. Alternatively, run the Command
     Palette command **Chat: Install Plugin From Source** with the repository URL.
   - (c) VS Code with the Copilot CLI or Copilot SDK harness: in the session, run
     `/plugin marketplace add gsemet/markdown-okf-schema-studio`, then
     `/plugin install markdown-okf-schema-studio@markdown-okf-schema-studio`. VS Code also
     discovers plugins installed by Copilot CLI (`~/.copilot/installed-plugins/`).

3. [OpenAI Codex](https://developers.openai.com/codex/plugins/build):
   `codex plugin marketplace add gsemet/markdown-okf-schema-studio`. The documentation gives no
   further CLI install command.

4. [Agent Plugins](https://agent-plugins.org/specification) (any compatible client): the root
   `plugin.json` follows the open Agent Plugins 1.0.0 format. The specification defines no install
   command, so use your client's own.

Last resort, for a host without plugin support: copy the folder
`skills/writing-for-markdown-okf-schema-studio/` into `.agents/skills/` (or `.github/skills/`,
`.claude/skills/`) of your project or home folder.

The plugin version always equals the extension version.

## Documentation

- [User guide](docs/user/README.md): the index of all pages below, including
  [install and open Studio](docs/user/open-studio.md) with screenshots.
- [Features and inline editing](docs/user/editing.md), [toolbar](docs/user/toolbar.md),
  [folding sections](docs/user/folding.md), [find and replace](docs/user/find.md) and
  [slash menu](docs/user/slash-menu.md)
- [Themes and motion](docs/user/themes-and-motion.md) and
  [wide tables](docs/user/wide-tables.md)
- [PlantUML](docs/user/plantuml.md), [charts](docs/user/charts.md) and [review comments](docs/user/review-comments.md)
- [OKF and linked-file annotations](docs/user/okf.md) and [Sphinx projects](docs/user/sphinx.md)
- [Settings](docs/user/settings.md) and [comparison](docs/user/comparison.md)
- [CONTRIBUTING.md](CONTRIBUTING.md): development setup, validation, packaging and release evidence.
