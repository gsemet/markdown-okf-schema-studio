/**
 * Measures the labels of a Mermaid diagram as its SVG image draws them, from inside the preview
 * page (the real VS Code window has no other document to open the image in).
 *
 * An SVG image uses none of the page: no style sheet, no inherited font or size, no web font. The
 * page's Content Security Policy also blocks the style sheet and the `style` attributes of SVG
 * markup put in the page. So the SVG is copied into a shadow root whose host resets every
 * inherited property (`all: initial`, like the image root), the SVG's own style sheet is given
 * back as a constructed style sheet and its `style` attributes through the CSSOM (both allowed by
 * the policy). The page has no `@font-face` font, so the fonts are the image's: system fonts.
 *
 * The headless test `test/page/mermaidLabelFit.test.ts` checks that this measure agrees with the
 * SVG opened as a document of its own. Passed to `evaluate`: self-contained, no import.
 */
export interface ImageLabelFit {
  readonly label: string;
  /** The text's line boxes: width, right and bottom edges. */
  readonly text: { readonly width: number; readonly right: number; readonly bottom: number };
  /** The label's foreignObject box. */
  readonly box: { readonly width: number; readonly right: number; readonly bottom: number };
  /** The node shape's width; undefined for an edge label. */
  readonly shapeWidth: number | undefined;
}

export function measureMermaidImageLabels(src: string): ImageLabelFit[] {
  const markup = decodeURIComponent(src.slice(src.indexOf(",") + 1));
  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  const styles = Array.from(parsed.querySelectorAll("style"));
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(styles.map((style) => style.textContent ?? "").join("\n"));
  for (const style of styles) style.remove();

  const holder = document.createElement("div");
  holder.style.setProperty("all", "initial");
  holder.style.setProperty("position", "absolute");
  holder.style.setProperty("left", "0");
  holder.style.setProperty("top", "0");
  holder.style.setProperty("visibility", "hidden");
  document.body.append(holder);
  try {
    const shadow = holder.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [sheet];
    const svg = document.importNode(parsed.documentElement, true);
    shadow.append(svg);
    for (const element of [svg, ...Array.from(svg.querySelectorAll("[style]"))]) {
      const inline = element.getAttribute("style");
      if (inline) (element as HTMLElement | SVGElement).style.cssText = inline;
    }

    const groups = Array.from(svg.querySelectorAll("g.node, g.edgeLabel"));
    return groups.flatMap((group): ImageLabelFit[] => {
      const box = group.querySelector("foreignObject");
      const label = box?.textContent?.trim() ?? "";
      if (!box || !label) return [];
      // The text alone: the line boxes of its text nodes, not the element boxes around it (a
      // block or table-cell box takes the width of the box, whatever the text).
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      const lines: DOMRect[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        lines.push(...Array.from(range.getClientRects()).filter((line) => line.width > 0));
      }
      const right = Math.max(...lines.map((line) => line.right));
      const boxRect = box.getBoundingClientRect();
      const shape = group.matches("g.node") ? group.querySelector<SVGGraphicsElement>("rect, polygon, path, circle") : null;
      return [{
        label,
        text: {
          width: right - Math.min(...lines.map((line) => line.left)),
          right,
          bottom: Math.max(...lines.map((line) => line.bottom)),
        },
        box: { width: boxRect.width, right: boxRect.right, bottom: boxRect.bottom },
        shapeWidth: shape ? shape.getBoundingClientRect().width : undefined,
      }];
    });
  } finally {
    holder.remove();
  }
}

/** The labels whose text goes past their box (half a pixel of rounding allowed). */
export function cutLabels(fits: readonly ImageLabelFit[]): ImageLabelFit[] {
  return fits.filter((fit) => fit.text.right > fit.box.right + 0.5 || fit.text.bottom > fit.box.bottom + 0.5
    || (fit.shapeWidth !== undefined && fit.text.width > fit.shapeWidth + 0.5));
}
