/**
 * The one look of the published site: the cream palette of the extension, light only. Every page
 * (main pages, requirements viewer) and every social picture takes its colours, fonts and header
 * from here; a test compares each token with the cream block of the extension's page chrome.
 */

/** Site token name to the extension variable it takes its value from. */
export const SITE_TOKEN_SOURCES: Readonly<Record<string, string>> = {
  "--bg": "--studio-editor-background",
  "--paper": "--studio-editorWidget-background",
  "--ink": "--studio-foreground",
  "--soft": "--studio-descriptionForeground",
  "--line": "--studio-widget-border",
  "--faint": "--studio-input-border",
  "--link": "--studio-textLink-foreground",
  "--focus": "--studio-focusBorder",
  "--code-bg": "--studio-textCodeBlock-background",
  "--quote-bg": "--studio-textBlockQuote-background",
  "--p1": "--studio-textLink-foreground",
  "--p2": "--studio-charts-purple",
  "--nom": "--studio-charts-green",
  "--bnd": "--studio-charts-blue",
  "--ref": "--studio-errorForeground",
  "--alt": "--sphinx-preview-scrollbar-hover",
  "--kt": "--studio-button-foreground",
};

/** Values of the site tokens, copied from the extension's cream block (see `SITE_TOKEN_SOURCES`). */
export const SITE_TOKENS: Readonly<Record<string, string>> = {
  "--bg": "#f5f1e8",
  "--paper": "#fbf8f1",
  "--ink": "#2b2a27",
  "--soft": "#5e5850",
  "--line": "#d6cdbd",
  "--faint": "#cfc5b2",
  "--link": "#a14e32",
  "--focus": "#b05a3c",
  "--code-bg": "#ede6da",
  "--quote-bg": "#efe9dd",
  "--p1": "#a14e32",
  "--p2": "#6b4a8a",
  "--nom": "#34703f",
  "--bnd": "#2f6690",
  "--ref": "#b3261e",
  "--alt": "#a89d89",
  "--kt": "#ffffff",
};

const FONTS = `--serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;--sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace`;

/** The `:root` block alone: the colour tokens and the font stacks. Social cards use it. */
export const SITE_ROOT_CSS = `:root{color-scheme:light;${Object.entries(SITE_TOKENS).map(([name, value]) => `${name}:${value}`).join(";")};${FONTS}}`;

/**
 * The shared stylesheet: tokens, base rules and the site header. Serif for what is read, sans for
 * labels, mono for identifiers. The viewer's `viewer.css` and the main pages' own rules follow it.
 */
export const SITE_CSS = `${SITE_ROOT_CSS}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 var(--sans)}
a{color:var(--link)}
code,pre{font-family:var(--mono)}
pre{overflow-x:auto;padding:1rem;border:1px solid var(--line);border-radius:8px;background:var(--code-bg)}
code{padding:.12rem .28rem;border-radius:4px;background:var(--code-bg)}
pre code{padding:0;background:transparent}
blockquote{margin-left:0;padding:.6rem 1rem;border-left:4px solid var(--faint);background:var(--quote-bg)}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
/* site header: the same on every page */
.top{position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--line)}
.top .in{display:flex;align-items:center;gap:14px;max-width:1080px;margin:0 auto;padding:0 24px;min-height:60px}
.site-brand{display:flex;align-items:center;gap:.75rem;margin-right:auto;min-width:0;color:var(--ink);text-decoration:none}
.site-brand img{flex:0 0 44px;width:44px;height:44px}
.site-brand strong{font:600 15px var(--sans);overflow-wrap:anywhere}
.top .site{display:flex;flex-wrap:wrap;gap:12px;font:13px var(--sans)}
.top .site a{text-decoration:none;color:var(--soft)}
.top .site a:hover{color:var(--ink);text-decoration:underline}
@media (max-width:760px){
  .top .in{flex-wrap:wrap;padding-top:8px;padding-bottom:8px}
  .top .site{order:4;flex:1 1 100%}
}`;
