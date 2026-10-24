/**
 * Vertical shift that keeps a bar in view while the block it belongs to scrolls: the bar rides
 * down from its natural place to just under the usable top of the viewport, but never past the
 * bottom of its block, so it leaves with the block. A shift never moves the block's text (the
 * bar is translated, not laid out).
 *
 * - `naturalTop`: where the bar sits with no shift, in viewport coordinates.
 * - `barHeight`: the bar's height.
 * - `usableTop`: the first viewport row not under the sticky band or the preview controls.
 * - `limitBottom`: the bottom of the block that bounds the bar.
 * - `gap`: the room kept between the usable top and the bar.
 */
export function stickyBarShift(
  naturalTop: number,
  barHeight: number,
  usableTop: number,
  limitBottom: number,
  gap = 4,
): number {
  if (![naturalTop, barHeight, usableTop, limitBottom, gap].every((value) => Number.isFinite(value))) return 0;
  const wanted = usableTop + gap - naturalTop;
  if (!(wanted > 0)) return 0;
  const room = limitBottom - barHeight - naturalTop;
  return Math.max(0, Math.min(wanted, room));
}
