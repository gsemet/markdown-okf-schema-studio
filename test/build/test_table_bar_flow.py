"""Unit tests for the headless table action bar layout check of the visual campaign."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "visual"))

from capture_support import table_bar_flow_failure  # noqa: E402

SHIPPED = {"position": "relative", "top": "auto", "left": "auto", "bottom": "auto", "right": "auto", "zIndex": "3"}


# @tests_req SwRS-MDOKFSTUDIO-TABLE-064
def test_shipped_bar_passes() -> None:
    assert table_bar_flow_failure(SHIPPED) is None
    assert table_bar_flow_failure({**SHIPPED, "top": "0px", "left": "0px", "bottom": "0px", "right": "0px"}) is None


# @tests_req SwRS-MDOKFSTUDIO-TABLE-064
def test_static_bar_fails() -> None:
    assert "position" in (table_bar_flow_failure({**SHIPPED, "position": "static"}) or "")
    assert table_bar_flow_failure({**SHIPPED, "position": "sticky"}) is not None


# @tests_req SwRS-MDOKFSTUDIO-TABLE-064
def test_offset_fails() -> None:
    for side in ("top", "left", "bottom", "right"):
        assert side in (table_bar_flow_failure({**SHIPPED, side: "12px"}) or "")


# @tests_req SwRS-MDOKFSTUDIO-TABLE-064
def test_wrong_z_index_fails() -> None:
    assert "z-index" in (table_bar_flow_failure({**SHIPPED, "zIndex": "auto"}) or "")
    assert table_bar_flow_failure({**SHIPPED, "zIndex": "2"}) is not None
