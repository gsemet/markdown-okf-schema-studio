# Sphinx Projects

When the Markdown file sits inside a Sphinx project (a `conf.py` in its folder or any folder up to
the workspace root; failing that, the single `conf.py` among `docs/`, `doc/`, `sphinx/`,
`source/` and `docs/source/` at the workspace root) that loads `myst_parser` or `myst_nb`, the
preview compares the syntax you use
with `myst_enable_extensions`. Syntax whose extension is missing (`colon_fence`, `dollarmath`,
`amsmath`, `deflist`, `fieldlist`, `tasklist`, `strikethrough`, `substitution`, `attrs_inline`,
`html_image`, `html_admonition`) gets one warning per extension, with the first line using it.
The warnings are listed in the Problems view and underlined in the editor. When the page renders,
a one-line banner at the top of the preview counts them ("2 MyST syntax warnings from conf.py"),
with an **Open Problems** button and a close button. A closed banner stays closed for that document
until VS Code restarts, and comes back when the set of warnings changes. It takes no room in the
page, so showing or closing it moves nothing. In Restricted Mode the Problems view does not list
them: the banner shows them in its tooltip instead.
The file is only read, never run: if a list is computed rather than written as plain strings, or
there is no `conf.py`, nothing is reported. The preview itself renders the same either way.
