"""Sphinx configuration used by the standalone Studio contract build."""

from __future__ import annotations

import os

project = "Markdown OKF-Schema Studio"
author = "Markdown OKF-Schema Studio contributors"
language = "en"

extensions = [
    "myst_parser",
    "preview_source_mapping",
]

myst_enable_extensions = [
    "attrs_inline",
    "colon_fence",
    "deflist",
    "dollarmath",
    "fieldlist",
    "html_admonition",
    "html_image",
    "replacements",
    "smartquotes",
    "strikethrough",
    "substitution",
    "tasklist",
]
myst_heading_anchors = 3
myst_url_schemes = ["http", "https", "ftp", "mailto", "vscode"]

source_suffix = {".md": "markdown"}
master_doc = "index"
templates_path = ["_templates"]
html_static_path = ["_static"]
html_favicon = "favicon.svg"
html_theme = "alabaster"
html_title = project

sphinx_preview_mode = os.environ.get("SPHINX_PREVIEW_MODE") == "1"

# Studio's fixture builds intentionally allow unresolved local includes so the extension can
# surface them as diagnostics instead of turning a preview into a failed render.
suppress_warnings = ["myst.xref_missing"]
