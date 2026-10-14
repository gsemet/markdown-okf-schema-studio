"""Minimal Sphinx project for preview source mapping tests."""

from __future__ import annotations

import os

extensions = ["myst_parser", "preview_source_mapping"]
master_doc = "index"
project = "preview mapping fixture"
html_theme = "basic"
myst_enable_extensions = ["colon_fence", "dollarmath"]
sphinx_preview_mode = os.environ.get("SPHINX_PREVIEW_MODE") == "1"


def _draft_banner(app, docname: str, source: list[str]) -> None:
    """Mirror the production draft banner to exercise line-origin preservation."""
    if docname != "index":
        return
    banner = "```{warning}\nGenerated preview banner.\n```\n\n"
    source[0] = banner + source[0]
    if not sphinx_preview_mode:
        return
    offsets = getattr(app.env, "_preview_source_line_offsets", {})
    offsets[docname] = banner.count("\n")
    app.env._preview_source_line_offsets = offsets


def setup(app):
    """Register the fixture's generated banner."""
    app.connect("source-read", _draft_banner)
