// @implements_req SwRS-MDOKFSTUDIO-GFM-034
/**
 * The one colour grammar of the sanitizer, shared by colour spans (`<span style="color: ...">`),
 * raw HTML table styles and the page re-validation. Inline styles are blocked by the CSP, so the
 * sanitizer keeps an allowed span value as `data-okf-color` / `data-okf-background` and the page
 * sets it through the CSSOM. Accepted, case-insensitively and nothing else: a named colour of the
 * closed list below (plus `transparent`) or one of the keywords `currentcolor`, `inherit`, `initial`, `unset`, `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, and the
 * functions `rgb()` / `rgba()` (channels 0-255 or 0-100%, alpha 0-1 or 0-100%) and
 * `hsl()` / `hsla()`, each in the comma form or the space form with an optional `/ alpha` (hue 0-360 with an optional `deg`, saturation and lightness 0-100%, alpha as
 * for rgba). No comments, `!important`, `var()`, `url()`, `expression()`, escapes, `;`, braces,
 * quotes or any other function or keyword: a value outside this grammar is refused whole.
 */
export const SAFE_COLOR_NAMES: ReadonlySet<string> = new Set([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black",
  "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse",
  "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan",
  "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta",
  "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
  "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink",
  "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen",
  "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow",
  "grey", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender",
  "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
  "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon",
  "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue",
  "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine",
  "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue",
  "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream",
  "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange",
  "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred",
  "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple",
  "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell",
  "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen",
  "steelblue", "tan", "teal", "thistle", "tomato", "transparent", "turquoise", "violet", "wheat",
  "white", "whitesmoke", "yellow", "yellowgreen",
]);

const NUMBER = "(?:\\d{1,3}(?:\\.\\d{1,3})?|\\.\\d{1,3})";
const NUMBER_WITH_UNIT = new RegExp("^(" + NUMBER + ")(%?)$", "u");
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu;
const FUNCTION_COLOR = /^(rgba?|hsla?)\(([^()]*)\)$/iu;
const SPACE_FORM = /^([^\s/]+)[ \t]+([^\s/]+)[ \t]+([^\s/]+)(?:[ \t]*\/[ \t]*([^\s/]+))?$/u;
const HUE = new RegExp("^(" + NUMBER + ")(?:deg)?$", "iu");

/** The keywords accepted besides the colour names. */
export const SAFE_COLOR_KEYWORDS: ReadonlySet<string> = new Set(["currentcolor", "inherit", "initial", "unset"]);

/** A regular-expression alternation of the closed name and keyword lists (for composite values). */
export const SAFE_COLOR_NAME_PATTERN: string = [...SAFE_COLOR_NAMES, ...SAFE_COLOR_KEYWORDS].join("|");

function isWithin(part: string | undefined, percentMax: number, plainMax: number | undefined): boolean {
  const found = NUMBER_WITH_UNIT.exec(part ?? "");
  if (!found) return false;
  if (found[2]) return Number(found[1]) <= percentMax;
  return plainMax !== undefined && Number(found[1]) <= plainMax;
}

export function isSafeOkfColor(value: string): boolean {
  const text = value.trim();
  const lower = text.toLowerCase();
  if (HEX_COLOR.test(text) || SAFE_COLOR_NAMES.has(lower) || SAFE_COLOR_KEYWORDS.has(lower)) return true;
  const match = FUNCTION_COLOR.exec(text);
  if (!match) return false;
  const name = (match[1] ?? "").toLowerCase();
  const inner = (match[2] ?? "").trim();
  let channels: Array<string | undefined>;
  let alpha: string | undefined;
  if (inner.includes(",")) {
    // Comma form: `rgba` and `hsla` take exactly four parts, `rgb` and `hsl` exactly three.
    const parts = inner.split(",").map((part) => part.trim());
    if (parts.length !== (name.endsWith("a") ? 4 : 3)) return false;
    channels = parts.slice(0, 3);
    alpha = parts[3];
  } else {
    // Space form: three parts and an optional `/ alpha`, whatever the function name.
    const found = SPACE_FORM.exec(inner);
    if (!found) return false;
    channels = [found[1], found[2], found[3]];
    alpha = found[4];
  }
  if (name.startsWith("rgb")) {
    for (const channel of channels) if (!isWithin(channel, 100, 255)) return false;
  } else {
    const hue = HUE.exec(channels[0] ?? "");
    if (!hue || Number(hue[1]) > 360) return false;
    if (!isWithin(channels[1], 100, undefined) || !isWithin(channels[2], 100, undefined)) return false;
  }
  return alpha === undefined || isWithin(alpha, 100, 1);
}
