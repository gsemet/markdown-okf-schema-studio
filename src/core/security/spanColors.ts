/**
 * Strict colour grammar for `<span style="color: …; background-color: …">`. Inline styles are
 * blocked by the CSP, so the sanitizer keeps an allowed value as `data-okf-color` /
 * `data-okf-background` and the page sets it through the CSSOM. Accepted: `#rgb`, `#rgba`,
 * `#rrggbb`, `#rrggbbaa`, and comma-separated `rgb()` / `rgba()` (channels 0-255 or 0-100%, alpha
 * 0-1 or 0-100%). Nothing else: no comments, `!important`, `var()`, `url()`, named colours.
 */
export function isSafeOkfColor(value: string): boolean {
  const text = value.trim();
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(text)) return true;
  const match = /^(rgba?)\(([^()]*)\)$/iu.exec(text);
  if (!match) return false;
  const parts = (match[2] ?? "").split(",").map((part) => part.trim());
  const withAlpha = (match[1] ?? "").toLowerCase() === "rgba";
  if (parts.length !== (withAlpha ? 4 : 3)) return false;
  const number = "(?:\\d{1,3}(?:\\.\\d{1,3})?|\\.\\d{1,3})";
  const channel = new RegExp("^(" + number + ")(%?)$", "u");
  for (let index = 0; index < 3; index += 1) {
    const found = channel.exec(parts[index] ?? "");
    if (!found) return false;
    if (Number(found[1]) > (found[2] ? 100 : 255)) return false;
  }
  if (withAlpha) {
    const found = channel.exec(parts[3] ?? "");
    if (!found) return false;
    if (Number(found[1]) > (found[2] ? 100 : 1)) return false;
  }
  return true;
}
