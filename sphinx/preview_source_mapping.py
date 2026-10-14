"""Add source positions to HTML only when the Sphinx preview is enabled."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from docutils import nodes
from sphinx.writers.html5 import HTML5Translator

_PREVIEW_MODE_ENV = "SPHINX_PREVIEW_MODE"
_ACTIVE_FILE_ENV = "SPHINX_PREVIEW_ACTIVE_FILE"
_ACTIVE_SOURCE_ENV = "SPHINX_PREVIEW_ACTIVE_SOURCE"
_DOCUMENT_ID_ENV = "SPHINX_PREVIEW_DOCUMENT_ID"
_ORIGINS_ENV = "SPHINX_PREVIEW_SOURCE_ORIGINS"
_MAPPING_ATTRIBUTE = "_preview_source_mapping"

_MAPPABLE_TAGS = {
    "admonition",
    "attention",
    "block_quote",
    "bullet_list",
    "caution",
    "compound",
    "container",
    "danger",
    "definition_list",
    "definition_list_item",
    "enumerated_list",
    "error",
    "figure",
    "field_list",
    "hint",
    "important",
    "line_block",
    "list_item",
    "literal_block",
    "note",
    "paragraph",
    "seealso",
    "table",
    "title",
    "topic",
    "versionmodified",
    "warning",
}


def _preview_enabled(app: Any) -> bool:
    """Return whether this build explicitly requested preview metadata."""
    return bool(getattr(app.config, "sphinx_preview_mode", False)) or (
        os.environ.get(_PREVIEW_MODE_ENV) == "1"
    )


def _setting(app: Any, config_name: str, environment_name: str) -> str:
    """Read a preview setting from Sphinx config, then the process environment."""
    configured = getattr(app.config, config_name, "")
    return str(configured or os.environ.get(environment_name, ""))


def _path_key(value: str) -> str:
    """Return a stable absolute path key for staged and original files."""
    return str(Path(value).expanduser().resolve())


def _load_origins(app: Any) -> dict[str, str]:
    """Load the staged-to-original source map supplied by the preview builder."""
    raw = _setting(app, "sphinx_preview_source_origins", _ORIGINS_ENV)
    if not raw:
        return {}
    try:
        values = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(values, dict):
        return {}
    return {
        _path_key(str(staged)): str(original)
        for staged, original in values.items()
        if isinstance(staged, str) and isinstance(original, str)
    }


def _is_mappable(node: nodes.Node) -> bool:
    """Select visible block nodes while excluding inline and document wrappers."""
    if isinstance(node, (nodes.document, nodes.Inline)):
        return False
    return getattr(node, "tagname", "") in _MAPPABLE_TAGS


def _mapping_for_node(
    node: nodes.Node,
    origins: dict[str, str],
    offset: int,
    active_file: str,
    active_source: str,
    document_id: str,
) -> dict[str, str] | None:
    """Build metadata only when the node has a trustworthy source origin."""
    source = getattr(node, "source", None)
    line = getattr(node, "line", None)
    if not isinstance(source, str) or not isinstance(line, int) or line < 1:
        return None

    source_key = _path_key(source)
    origin = origins.get(source_key)
    if origin is None and source_key == _path_key(active_source):
        origin = active_file
    if origin is None:
        return None

    original_line = line - offset if source_key == _path_key(active_source) else line
    if original_line < 1:
        return None

    return {
        "source_file": str(Path(origin).expanduser().resolve()),
        "source_line": str(original_line),
        "document_id": document_id,
    }


class PreviewHTML5Translator(HTML5Translator):
    """HTML translator that emits the mapping carried by visible block nodes."""

    def starttag(
        self,
        node: nodes.Node,
        tagname: str,
        suffix: str = "\n",
        empty: bool = False,
        **attributes: Any,
    ) -> str:
        mapping = node.get(_MAPPING_ATTRIBUTE)
        if isinstance(mapping, dict):
            attributes.update(
                {
                    "data-sphinx-preview-block": mapping["block_id"],
                    "data-sphinx-preview-document": mapping["document_id"],
                    "data-sphinx-source-file": mapping["source_file"],
                    "data-sphinx-source-line": mapping["source_line"],
                }
            )
        return super().starttag(node, tagname, suffix, empty, **attributes)


def _annotate_doctree(app: Any, doctree: nodes.document, docname: str) -> None:
    """Attach ordered source metadata to the active HTML document's block nodes."""
    if not _preview_enabled(app) or app.builder.name != "html":
        return

    active_file = _setting(app, "sphinx_preview_active_file", _ACTIVE_FILE_ENV)
    active_source = _setting(app, "sphinx_preview_active_source", _ACTIVE_SOURCE_ENV)
    document_id = _setting(app, "sphinx_preview_document_id", _DOCUMENT_ID_ENV)
    if not active_file or not document_id:
        return
    if not active_source:
        active_source = active_file

    offsets = getattr(app.env, "_preview_source_line_offsets", {})
    offset = int(offsets.get(docname, 0))
    origins = _load_origins(app)
    block_number = 0
    for node in doctree.findall():
        if not _is_mappable(node):
            continue
        mapping = _mapping_for_node(
            node,
            origins,
            offset,
            active_file,
            active_source,
            document_id,
        )
        if mapping is None:
            continue
        block_number += 1
        mapping["block_id"] = f"source-block-{block_number}"
        node[_MAPPING_ATTRIBUTE] = mapping


def _configure_translator(app: Any) -> None:
    """Install the preview translator once Sphinx has created its builder."""
    if _preview_enabled(app) and app.builder.name == "html":
        app.set_translator("html", PreviewHTML5Translator, override=True)


def setup(app: Any) -> dict[str, Any]:
    """Register the preview translator without changing ordinary Sphinx builds."""
    app.add_config_value("sphinx_preview_mode", False, "env")
    app.add_config_value("sphinx_preview_active_file", "", "env")
    app.add_config_value("sphinx_preview_active_source", "", "env")
    app.add_config_value("sphinx_preview_document_id", "", "env")
    app.add_config_value("sphinx_preview_source_origins", "", "env")
    app.connect("builder-inited", _configure_translator)
    app.connect("doctree-resolved", _annotate_doctree)
    return {
        "version": "1",
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
