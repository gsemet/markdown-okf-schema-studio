/**
 * The `{figure}` directive: the render pass, the sanitizer rule of the width it writes, the
 * stylesheet of figures and aligned images, and the palette action that inserts or edits one. Pure
 * module: no host API, no DOM, no Node built-ins.
 */

import { mergeProperties, type MystNode, sourcePositionProperties } from "../render/mystNode";
import type { MystDirectiveDescriptor } from "./directive";

/** A width the preview applies to a figure or an image (`data-okf-width`): a number and a unit. */
export const OKF_WIDTH = /^\d+(?:\.\d+)?(?:px|%|em|rem)?$/u;

/** The figure container beneath the directive gets the directive's source lines (one block). */
function renderFigure(node: MystNode, line: number | undefined): void {
  const figure = node.children?.find((child) =>
    child.type === "container" && child.kind === "figure");
  if (figure && line !== undefined) {
    mergeProperties(figure, sourcePositionProperties(node, line));
  }
}

/** The figure plug-in. */
export const FIGURE_DIRECTIVE: MystDirectiveDescriptor = {
  id: "figure",
  names: ["figure"],
  render: renderFigure,
  attributes: {
    "data-okf-width": {
      valid: (value) => OKF_WIDTH.test(value.trim()),
      diagnostic: { code: "blocked-okf-width", message: "Removed an unsupported figure width." },
    },
  },
  paletteActions: ["figure"],
  style: `#sphinx-myst-preview-content figure {
  margin: 1.4em 0;
  text-align: center;
}

/* Figure and image alignment (MyST :align:) and size (:width:, applied by the page script from
   data-okf-width). A figure floats beside the text; a lone image is centred or floats too. A
   floating figure gets the width itself and its image fills it, so percentages stay relative to the
   column. */
#sphinx-myst-preview-content img.align-center {
  display: block;
  margin-inline: auto;
}

#sphinx-myst-preview-content :is(img, figure).align-left {
  float: left;
  max-width: 100%;
  margin: 0.3em 1.4em 0.8em 0;
}

#sphinx-myst-preview-content :is(img, figure).align-right {
  float: right;
  max-width: 100%;
  margin: 0.3em 0 0.8em 1.4em;
}

#sphinx-myst-preview-content figure > img.align-left,
#sphinx-myst-preview-content figure > img.align-right {
  float: none;
  margin: 0;
}

#sphinx-myst-preview-content figure:is(.align-left, .align-right) > img[data-okf-width] {
  width: 100%;
}
`,
};
