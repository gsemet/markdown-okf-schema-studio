---
name: writing-for-markdown-okf-schema-studio
description: Write or generate a Markdown document (implementation plan, report, design note,
  README, spec, runbook) that renders well in Markdown OKF Schema Studio, the VS Code Markdown
  preview. Use when asked to write, draft or generate a .md file for Markdown OKF Schema Studio, to
  make a document look good in it, or to choose diagrams, charts, cards, tabs or admonitions for it.
---

# Writing Markdown for Markdown OKF Schema Studio

Markdown OKF Schema Studio is a VS Code extension that renders Markdown as a styled page (themes
Cream, White, Dark) and lets the reader click a block to edit it. You already know CommonMark, GFM,
MyST, Mermaid, PlantUML, SVG and Vega-Lite. This skill says only what the extension renders, what
it does not, and how to choose. Every example here is rendered by its own pipeline in a test.

- **OKF**, the Open Knowledge Format: a folder with sub-folders of Markdown files that carry YAML
  front matter.
- **OKF-Schema**: a separate tool that provides JSON Schemas for OKF bundles
  (https://github.com/gsemet/okf-schema) and validates the front matter of the Markdown files. Full
  validation needs it installed: `uv tool install okf-schema` (commands `okf-schema`, `okfkb`,
  `okfreq`). The extension only helps to visualise the schema (field descriptions, enum values) and
  does not replace the validator.
- OKF-Schema and Markdown OKF Schema Studio have the same author.

## Install the extension

The skill only writes the documents; the reader needs the extension to see them. If it is missing,
tell the user to install it from the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio),
with `code --install-extension GaetanSemet.markdown-okf-schema-studio`, or by searching for
"Markdown OKF-Schema Studio" in the Extensions view.

## What renders

| Family | Syntax rendered |
| --- | --- |
| GFM | headings, tables with `:--` `--:` alignment, task lists `- [ ]`, footnotes `[^1]`, alerts `> [!NOTE]` (also TIP, IMPORTANT, WARNING, CAUTION), autolinks, `~~strike~~` |
| Code | fenced code with a language (highlighted), `{code-block}` with `:caption:`, `:linenos:`, `:emphasize-lines:`, `:name:` |
| Math | `$x^2$`, `$$ ... $$`, `{math}` |
| Admonitions | `:::{note}` `tip` `warning` `important` `danger` ... with an optional title; fold with `:class: dropdown`; `{versionadded}` `{versionchanged}` `{deprecated}` |
| Layout | `{card}` (`:header:` `:footer:`), `{grid}` + `{grid-item-card}` (header `^^^` body `+++` footer), `{tab-set}` + `{tab-item}`, `{figure}`, `{list-table}` |
| Inline | `{kbd}`, `{ref}` to a `(name)=` label above a heading, definition lists (`Term` then `: text`) |
| Diagrams | `mermaid` fence, `plantuml` fence (built in, no Java), `{uml} file.puml` |
| Charts | `vega-lite` and `vega` fences, JSON or YAML, inline `values` or a relative CSV, TSV, JSON file |
| Images | `![alt](path)` and `{figure}` for local PNG, JPEG, SVG files (inline SVG: see below) |
| Navigation | `[TOC]` or `[[_TOC_]]` alone on a line, or `{contents}` (`:depth: 2`, `:local:`) |
| README HTML | `<div align>`, `<p align>`, `<img width>`, `<picture>`, `<details>`, `<kbd>`, `<sub>`, `<sup>` |
| Choices | two or more list items in a row that start with `( )` or `(x)`: a radio group; the reader's click moves the `x` in the file |
| Metadata | YAML front matter shows as a properties table (OKF, validated by OKF-Schema) |
| Review | `<!-- TODO: text -->` and `<!-- THREAD ... -->` comments show as chips |

The palette mode (Strict, GFM, MyST, Full) only chooses the buttons of the reader's editing
palette. Every syntax above renders in every mode: write MyST freely, never downgrade to GFM.

## Taste: choose, do not stack

- One visual per idea, only where it beats a sentence. A plan of six sections wants two to four
  visuals, not twelve. Open with a short summary, then structure, then detail.
- Concepts, architecture, layers, before and after: a **hand-drawn SVG**. It is the most
  effective way to show an idea; write it in an `svg` fence (below).
- Flows, states, dependencies, timelines: **Mermaid**. Interactions between actors, class or
  component diagrams: **PlantUML**.
- Numbers (estimates, benchmarks, counts): **Vega-Lite**. A **table** when the reader compares
  exact values over three columns or more.
- Alternatives to decide between: **tabs** or a comparison table; when the reader must pick one,
  a **radio group** with your recommendation preselected `(x)`. Parallel items (phases, options,
  risks): **cards** in a grid. One highlighted fact: a single **card**.
- **Admonitions** and alerts sparingly: one per section at most, for what the reader must not
  miss (warning, decision, assumption). Never wrap ordinary paragraphs.
- `[TOC]` after the title only when the document has more than about six headings.
- One H1, descriptive headings, short paragraphs, lists nested at most two levels, lines wrapped
  at 100 columns.
- Front matter: when the project has an OKF schema, copy the fields of its sibling documents;
  otherwise `title`, `description`, `status`, `date`.

## SVG pictures

A drawing that is not a flow, a sequence or a chart: write the `<svg>` in an `svg` fence, or as a
raw `<svg>` alone in its block (after a blank line, ending its last line). It is drawn inline in
the theme: write colours as `var(--surface)`, `var(--text)`, `var(--accent)`, never hex. An `<svg>`
inside a sentence is dropped. Variables, what is removed and when a file is better:
[references/svg.md](references/svg.md).

````markdown
```svg
<svg viewBox="0 0 160 60" width="320">
  <rect x="4" y="4" width="152" height="52" rx="8" fill="var(--surface)" stroke="var(--border)"/>
  <text x="80" y="36" text-anchor="middle" fill="var(--text)" font-size="14">Core</text>
</svg>
```
````

## Cards, tabs, charts

````markdown
::::{grid} 1 1 3 3
:::{grid-item-card} Phase 1
Week 1
^^^
Parser and schema.
+++
Owner: core team
:::
:::{grid-item-card} Phase 2
Week 2
^^^
Renderer and tests.
:::
::::

:::{card} Decision
:header: Accepted 2026-10-28
:footer: Revisit after the pilot
We ship behind a flag.
:::

::::{tab-set}
:::{tab-item} Option A
Cheap, slow.
:::
:::{tab-item} Option B
Costly, fast.
:::
::::

```mermaid
flowchart LR
  Source --> Parse --> Render --> Preview
```

```vega-lite
data:
  values:
    - {phase: Parser, days: 3}
    - {phase: Renderer, days: 5}
mark: bar
encoding:
  x: {field: phase, type: nominal}
  y: {field: days, type: quantitative}
```
````

More copy-ready examples (a plan with choices, alerts, admonitions, version notes, TOC, math,
list table, PlantUML, front matter, review comments, README HTML): [references/examples.md](references/examples.md).

## Limits

- Dropped: `<svg>` inside a sentence, `<script>`, `<style>`, `<iframe>`, forms, event handlers.
- No remote resources: no `https://` images, chart data, fonts or PlantUML `!include` URLs.
  Download the file next to the document; `data:` URIs work.
- Built-in PlantUML: no URL includes, no standard library (`!include <C4/...>`).
- Not rendered: `[[toc]]` (use `[TOC]`), emoji shortcodes such as `:smile:`, bare
  `{dropdown}` (use `:class: dropdown`). An unknown directive shows as a warning box: write
  only the names above.
- Restricted Mode (untrusted workspace) renders everything above; included files and chart data
  stay inside the document's folder.

<!-- @implements_req SwRS-MDOKFSTUDIO-CORE-073 -->
<!-- @implements_req SwRS-MDOKFSTUDIO-CORE-074 -->
