/**
 * Applies the width a MyST figure or image asked for (`:width:`). The renderer keeps it as
 * `data-okf-width` because inline styles are blocked by the CSP; the page sets it through the
 * CSSOM. A figure that floats left or right takes the width itself (its image then fills it), so a
 * percentage stays relative to the column. Self-contained: it is injected into the page script
 * with `.toString()`, so it must not use anything defined outside its own body.
 */
export function applyFigureSizes(document: Document): void {
  const pattern = /^\d+(?:\.\d+)?(?:px|%|em|rem)?$/u;
  document.querySelectorAll<HTMLElement>("#sphinx-myst-preview-content img[data-okf-width]").forEach((image) => {
    const requested = (image.getAttribute("data-okf-width") ?? "").trim();
    if (!pattern.test(requested)) return;
    const width = /^\d+(?:\.\d+)?$/u.test(requested) ? requested + "px" : requested;
    const figure = image.parentElement;
    const floating = figure?.tagName === "FIGURE"
      && (figure.classList.contains("align-left") || figure.classList.contains("align-right"));
    if (floating && figure) {
      figure.style.setProperty("width", width);
    } else {
      image.style.setProperty("width", width);
    }
  });
}
