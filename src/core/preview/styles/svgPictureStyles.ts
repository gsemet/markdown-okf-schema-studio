import { SVG_THEME_VARIABLES } from "../../security/svgSanitizer";

const VARIABLES_CSS = Object.entries(SVG_THEME_VARIABLES)
  .map(([name, value]) => `  --${name}: ${value};`)
  .join("\n");

/**
 * SVG pictures (an `svg` fence or a raw `<svg>` block, see `render/svgPictures.ts`): the figure
 * defines the theme vocabulary a picture writes (`fill="var(--surface)"`), each name taken from the
 * `--studio-*` tokens, so a picture follows Cream, White, Dark and the VS Code theme. The picture
 * keeps its `viewBox` and declared width, capped at the column, and an Auto breakout measures it like
 * an image. Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`).
 */
// @implements_req SwRS-MDOKFSTUDIO-DIAG-126
export const SVG_PICTURE_CSS = `
#sphinx-myst-preview-content figure.myst-svg-figure {
${VARIABLES_CSS}
  margin: 1em 0;
  color: var(--studio-editor-foreground, inherit);
  text-align: center;
}

#sphinx-myst-preview-content figure.myst-svg-figure > svg {
  display: block;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
  overflow: hidden;
}
`;
