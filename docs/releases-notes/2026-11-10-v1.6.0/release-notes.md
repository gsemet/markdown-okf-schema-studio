<h1 align="center">Markdown OKF-Schema Studio 1.6</h1>

<p align="center">
  <b>Draw a picture in the page, show a front matter value in the text, edit table cells without surprises.</b><br>
  <sub>6 changes since 1.5.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.6.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 🖼 Draw a picture in the page

A drawing written as an `svg` fence, or as a raw `<svg>` that fills its own block, is now drawn in
the page and follows the theme. Write the colours as `var(--surface)`, `var(--text)`,
`var(--accent)` and the like, and the same picture reads well in Cream, White and Dark.

````markdown
```svg
<svg viewBox="0 0 300 80" width="300">
  <rect x="4" y="4" width="80" height="60" rx="8" fill="var(--surface)" stroke="var(--accent)"/>
  <text x="44" y="40" text-anchor="middle" fill="var(--text)">Write</text>
</svg>
```
````

![A write, review, merge flow and a row of coloured discs, drawn from SVG in the Cream theme](svg-pictures.png)

Scripts, styles, links and other active content are removed. A picture keeps its size, capped at the
column, and it can break out of the column in Auto width. A click in edit mode opens its source. An
`<svg>` inside a sentence is still dropped.

A small diagram or an icon no longer needs an image file next to the document.

## 🏷 Show a front matter value in the text

Inline code written as `` `= this.field` `` (or `` `=this.field` ``) shows the value of that field of
the document's own front matter, as in Obsidian. Text and numbers appear as they are, lists are
joined with commas, objects become one line of YAML, and `this.a.b` reaches a nested field. The value
is plain text, and it updates when the front matter changes.

```markdown
---
title: Quarterly export plan
status: draft
---

# `= this.title`

The plan is `= this.status`.
```

![A plan whose text shows its status, tags and owner from the front matter, and a missing field with a warning underline](front-matter-values.png)

A field the front matter does not have leaves the code as written, with a warning underline and a
warning in the diagnostics.

A title or a status written once in the front matter is the one the whole page shows.

## 🛠 Smoother editing

- **A wide table keeps its width while you edit**: in Auto width, a wide table stays at its full width
  while you edit one of its cells, and moving from cell to cell does not change it, instead of
  shrinking to the text column and cutting the last column. A table that fits the text column stays
  in it, and a table edited as Markdown source keeps the column width.
- **A cell shows what you typed**: a cell you leave with <kbd>Tab</kbd> or an arrow key shows the
  text you just typed, instead of staying empty or showing its old text until the page renders again.

<details><summary><b>🐞 All fixes</b></summary>

- Words such as `snake_case_name` and sums such as `2 * 3 * 4` stay plain in a table cell you leave,
  instead of flashing as emphasis, and a `//host` link target is no longer kept.
- The table of contents stays just below the toolbar each time the toolbar opens or closes, instead of
  sliding under the open toolbar or dropping far below the closed one.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- No tooling change in this release.
- Known issue: a file pulled in with an include reads the front matter of the document that includes
  it, so `= this.field` in an included file shows the including document's field.

</details>
