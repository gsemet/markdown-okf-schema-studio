/**
 * Dark palette of the published site. It redefines the variables of the light palette in
 * `pageDocument` and the few colours the page styles hard-code, so every page follows the
 * reader's colour scheme.
 */
export const DARK_THEME_CSS = `@media (prefers-color-scheme: dark) {
:root { color-scheme: dark; --ink: #e3ecef; --muted: #9db0b8; --line: #2f444d; --paper: #11191d; --panel: #18242a; --accent: #5cc1cc; --accent-strong: #8fdbe3; --warm: #e8b05d; --success: #7fd3a6; --danger: #f09a9a; }
pre { background: #0d1417; }
code { background: #1f2f36; }
blockquote { background: #261f12; }
.capture-open, .capture-image, .capture-actions li { background: #0d1417; }
.capture-status[data-status="passed"] { border-color: #2f6b4d; background: #12281d; }
.capture-status[data-status="failed"] { border-color: #7a3a3a; background: #2a1616; }
}`;
