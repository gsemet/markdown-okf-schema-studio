# Preview Themes

The theme button on the third toolbar row cycles through the current VS Code theme, dark,
white, and cream. Cream is a warm, low-glare paper palette with clay-coloured links and the theme
a new workspace starts with. The choice is remembered per workspace. These three captures use the
same document, viewport, and scroll state.

| Dark | White | Cream |
| --- | --- | --- |
| [![Handbook title and admonitions in the dark preview theme](../../images/readme/theme-dark.png)](../../images/readme/theme-dark.png) | [![Handbook title and admonitions in the white preview theme](../../images/readme/theme-white.png)](../../images/readme/theme-white.png) | [![Handbook title and admonitions in the cream preview theme](../../images/readme/theme-cream.png)](../../images/readme/theme-cream.png) |

## Motion

The preview keeps its animations short (about 120 to 200 ms; the update glow fades over about half
a second) and never lets them move the text:

- Block, table cell and frontmatter editors, the edition palette, the table bar, the `/` menu and
  the palette menus fade in when you open them; a block fades back in when its editor closes.
- The theme button fades the colours from one theme to the next.
- After a change made outside the preview (another tool or an agent writing the file, a file
  changed on disk) or an undo or redo, the blocks that changed glow once with a light wash of the
  focus colour. Edits you make in the preview itself do not glow, and neither does typing in the
  active text editor nor a change spread over many places (a checkout, a reload of the file).

Nothing animates when the page loads, when it is refreshed in place or when it follows the
editor's scrolling. With your system's "reduce motion" accessibility setting on
(`prefers-reduced-motion: reduce`), every animation is off and changes appear at once.
