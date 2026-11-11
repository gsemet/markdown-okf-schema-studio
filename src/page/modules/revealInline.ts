/** The space kept between a revealed range and the edge of the scroll box it was brought into. */
const INLINE_REVEAL_MARGIN = 16;

const isScrollable = (value: string | undefined): boolean => value === "auto" || value === "scroll";

/**
 * Brings `range` into view horizontally inside every box between `target` and `root` that scrolls
 * sideways (a wide table or its wrapper, a code block), innermost first. A range already inside the
 * box (less a margin on each side) moves nothing; a range wider than the box is aligned on its
 * start. Only the boxes' `scrollLeft` is written: the page itself never scrolls sideways for this.
 * @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-010
 */
export function revealRangeInline(
  range: Pick<Range, "getBoundingClientRect">,
  target: Element,
  root: Element | null,
  window: Pick<Window, "getComputedStyle">,
): void {
  for (let box: Element | null = target; box && box !== root; box = box.parentElement) {
    if (!isScrollable(window.getComputedStyle?.(box)?.overflowX)) continue;
    const boxWidth = box.clientWidth;
    const maxScroll = box.scrollWidth - boxWidth;
    if (!(boxWidth > 0) || !(maxScroll > 0)) continue;
    const rect = range.getBoundingClientRect();
    const left = rect.left ?? 0;
    const right = rect.right ?? left + (rect.width ?? 0);
    if (left === 0 && right === 0) continue;
    const boxLeft = (box.getBoundingClientRect().left ?? 0) + (box.clientLeft || 0);
    const boxRight = boxLeft + boxWidth;
    if (left >= boxLeft + INLINE_REVEAL_MARGIN && right <= boxRight - INLINE_REVEAL_MARGIN) continue;
    const startAligned = right - left > boxWidth - 2 * INLINE_REVEAL_MARGIN || left < boxLeft + INLINE_REVEAL_MARGIN;
    const delta = startAligned
      ? left - (boxLeft + INLINE_REVEAL_MARGIN)
      : right - (boxRight - INLINE_REVEAL_MARGIN);
    const current = box.scrollLeft || 0;
    const next = Math.max(0, Math.min(maxScroll, current + delta));
    if (next !== current) box.scrollLeft = next;
  }
}
