/**
 * The measured tops of the soft-wrapped source lines of a paragraph (the line marker and the scroll
 * layout use them). Pure DOM measurement: the document and the window are passed in.
 */

// @implements_req SwRS-MDOKFSTUDIO-LIFE-119
/**
 * Document y where each soft-wrapped source line of a paragraph starts, for the lines after its
 * first. Paragraph text keeps the source line breaks as newline characters, so the line after each
 * newline starts at the first visible character that follows it. Undefined when `element` is no
 * paragraph, spans one line, or its lines cannot be measured.
 */
export function measureLineTops(
  document: Pick<Document, "createTreeWalker" | "createRange">,
  window: Pick<Window, "scrollY">,
  element: Element,
  line: number,
  endLine: number,
): number[] | undefined {
  if (endLine <= line || String(element.tagName || "").toUpperCase() !== "P"
    || typeof document.createTreeWalker !== "function"
    || typeof document.createRange !== "function") return undefined;
  const walker = document.createTreeWalker(element, 4);
  const range = document.createRange();
  const tops: number[] = [];
  let waiting = 0;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const text = String(node.data || "");
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index]!;
      if (character === "\n") {
        waiting += 1;
        continue;
      }
      if (waiting === 0 || character.trim() === "") continue;
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rectangle = range.getClientRects?.()[0] ?? range.getBoundingClientRect?.();
      if (!rectangle || !Number.isFinite(rectangle.top)) return undefined;
      for (; waiting > 0; waiting -= 1) tops.push(rectangle.top + window.scrollY);
    }
  }
  return tops.length === endLine - line ? tops : undefined;
}
