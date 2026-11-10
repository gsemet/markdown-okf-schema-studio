# SVG pictures

Two forms draw an inline picture; both keep the `viewBox` and the declared `width`, capped at the
column (Auto width lets a wide one break out like an image). A click in edit mode opens the source
of the block.

````markdown
```svg
<svg viewBox="0 0 240 70" width="480" role="img" aria-label="Page, session and core">
  <rect x="4" y="4" width="70" height="62" rx="8" fill="var(--surface)" stroke="var(--border)"/>
  <text x="39" y="40" text-anchor="middle" fill="var(--text)" font-size="14">Page</text>
  <rect x="85" y="4" width="70" height="62" rx="8" fill="var(--surface)" stroke="var(--accent)"/>
  <text x="120" y="40" text-anchor="middle" fill="var(--accent)" font-size="14">Session</text>
  <rect x="166" y="4" width="70" height="62" rx="8" fill="var(--green)"/>
  <text x="201" y="40" text-anchor="middle" fill="var(--surface)" font-size="14">Core</text>
</svg>
```
````

The same picture as a raw block (an `<svg>` that starts a block after a blank line and ends its
last line; blank lines inside are fine):

````markdown
<svg viewBox="0 0 120 40" width="240" role="img" aria-label="Status">
  <circle cx="20" cy="20" r="14" fill="var(--red)"/>
  <circle cx="60" cy="20" r="14" fill="var(--orange)"/>
  <circle cx="100" cy="20" r="14" fill="var(--green)"/>
</svg>
````

## Colours

Write colours as variables so the picture follows Cream, White, Dark and the VS Code theme:

| Variable | Meaning |
| --- | --- |
| `--surface`, `--background`, `--bg` | background of a block (box, card) |
| `--border` | lines and outlines |
| `--text`, `--foreground`, `--fg` | text colour |
| `--muted` | secondary text, arrows |
| `--accent`, `--primary` | the link colour, for what to look at |
| `--red`, `--green`, `--blue`, `--orange` | named colours, readable in light and dark |

An unknown variable with no fallback (`var(--nope)`) is drawn in the text colour; a fallback
(`var(--nope, #888)`) is kept. Use the vocabulary, not hex: a fixed colour is wrong in one theme.
Put a text on `--green`, `--red` or `--accent` in `var(--surface)`, as the example does.

## What is removed

The preview rebuilds the picture from an allow-list and warns about what it dropped. Gone:
`<script>`, `<style>`, `<foreignObject>`, `<a>` and every link to another page, `<image>`,
animation, event handlers (`onclick`), and `class`. A `style` attribute keeps only presentation
properties (`fill`, `stroke`, `font-size`...). `id`s are renamed per picture, with `url(#id)` and
`href="#id"`, so two pictures never clash. An `aria-label` is kept as written.

A value may use only plain words and numbers, `rgb()`, `hsl()`, `var()`, `url(#id)`, the transforms
(`translate()`, `scale()`, `rotate()`, `matrix()`, `skewX()`, `skewY()`) and `calc()`. Any other
function drops the value: `color-mix()`, `oklch()`, `clamp()`, a font name in parentheses. A
`url()` or `href` must point at an `id` of the same picture: a `<use>` or `<textPath>` whose target
is elsewhere (another picture, the page, a file) is removed.

An `<svg>` is drawn only when it fills its own block. Inside a sentence, an HTML comment, a `$$`
math block, a code block or a cell of an HTML table, it is not drawn.

## A file is still better when

- the SVG comes from a tool (a diagram editor, an export) with fonts, filters or gradients of its
  own: save it next to the document and show it with `{figure}` or `![alt](file.svg)`;
- the picture needs a caption, a numbered label or a width in `%`: use `{figure}` (see SKILL.md);
- the same picture is used in several documents.

````markdown
```{figure} diagrams/layers.svg
:width: 80%
:alt: Three layers: page, session, core

The extension is three layers; each imports only the one below.
```
````
