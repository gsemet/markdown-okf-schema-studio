// @implements_req SwRS-MDOKFSTUDIO-CORE-034
// @implements_req SwRS-MDOKFSTUDIO-CORE-077
// @implements_req SwRS-MDOKFSTUDIO-LAYOUT-032
/**
 * Tables of the page: the box of a wide table, the cells, and the tints of the heading and the rows.
 *
 * Part of `CONTENT_BLOCK_CSS` (`./contentBlockStyles.ts`), at the place of the table rules in its
 * cascade.
 */
export const TABLE_CSS = `
/* A wide table scrolls inside its own box instead of widening the whole preview. */
#sphinx-myst-preview-content :where(table, .table-wrapper) {
  display: block;
  width: max-content;
  max-width: 100%;
  margin: 1.2em 0;
  border-collapse: collapse;
  overflow-x: auto;
}

/* A table that scrolls sideways keeps short identifiers whole and shades the overflow edges. */
#sphinx-myst-preview-content table[data-sphinx-table-overflow="true"] :where(th, td)[data-sphinx-short-cell="true"] {
  white-space: nowrap;
}

#sphinx-myst-preview-content table[data-sphinx-table-overflow="true"] {
  background:
    linear-gradient(to right, var(--studio-editor-background, Canvas) 30%, transparent) left center / 2rem 100% no-repeat local,
    linear-gradient(to left, var(--studio-editor-background, Canvas) 30%, transparent) right center / 2rem 100% no-repeat local,
    radial-gradient(farthest-side at 0 50%, color-mix(in srgb, var(--studio-editor-foreground, var(--studio-foreground, CanvasText)) 35%, transparent), transparent) left center / 1rem 100% no-repeat scroll,
    radial-gradient(farthest-side at 100% 50%, color-mix(in srgb, var(--studio-editor-foreground, var(--studio-foreground, CanvasText)) 35%, transparent), transparent) right center / 1rem 100% no-repeat scroll;
}

#sphinx-myst-preview-content :where(th, td) {
  padding: 0.4em 0.8em;
  border: 1px solid var(--sphinx-preview-border);
  text-align: start;
  vertical-align: top;
}

/* A column never narrows below 5em of text, so a table with many columns keeps whole words in its
   cells ("document", "parse") instead of breaking them letter by letter. A table that then no
   longer fits the column uses the wide-table behaviour (breakout in Auto, scroll otherwise). The
   frontmatter properties table sizes its own columns. In edit mode the larger cell minimum below
   (8em) wins. */
#sphinx-myst-preview-content table:not(.okf-properties) :where(th, td) {
  min-width: 5em;
}

/* A short identifier (one word, up to 24 characters) never splits inside a cell, wide table or not:
   the global overflow-wrap: anywhere would otherwise break "Coverage" or "OPS-1042" letter by letter
   when the columns are squeezed. The cell keeps the word whole, so the table grows and then breaks
   out in Auto or scrolls. */
#sphinx-myst-preview-content table :where(th, td)[data-sphinx-short-cell="true"] {
  white-space: nowrap;
}

#sphinx-myst-preview-content th {
  font-weight: 600;
}

/* The heading, the even rows and the hovered row are translucent tints of theme tokens: a VS Code
   theme is followed, and the overflow shading of a table that scrolls sideways shows through them.
   The tints sit on the row, under the cells, so the handles, the cell ring and the change bars stay
   above them. The frontmatter properties table keeps no background. */
#sphinx-myst-preview-content table:not(.okf-properties) th {
  background: color-mix(in srgb, var(--studio-focusBorder, Highlight) 24%, transparent);
}

#sphinx-myst-preview-content table:not(.okf-properties) tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--studio-editor-foreground, CanvasText) 3%, transparent);
}

#sphinx-myst-preview-content table:not(.okf-properties) tbody tr:hover {
  background: color-mix(in srgb, var(--studio-focusBorder, Highlight) 12%, transparent);
}

#sphinx-myst-preview-content :where(th, td)[align="left"] { text-align: left; }
#sphinx-myst-preview-content :where(th, td)[align="center"] { text-align: center; }
#sphinx-myst-preview-content :where(th, td)[align="right"] { text-align: right; }
#sphinx-myst-preview-content table[align="center"] { margin-inline: auto; }
#sphinx-myst-preview-content table[align="right"] {
  margin-inline-start: auto;
  margin-inline-end: 0;
}
`;
