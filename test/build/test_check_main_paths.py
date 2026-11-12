"""Unit tests for the Main paths check of the requirements bundle."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("check_main_paths", ROOT / "scripts/check_main_paths.py")
assert spec and spec.loader
cmp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cmp)

P = "SwRS-T"
CONFIG = """version: 1
tiers:
  StRS: {folder: strs, prefix: StRS-T}
  SwRS: {folder: swrs, prefix: SwRS-T}
"""


def req(tier: str, rid: str, lifecycle: str = "proposed", derives: list[str] | None = None, body: str = "") -> str:
    head = f"---\ntype: {tier}\nid: {rid}\nreq_lifecycle: {lifecycle}\n"
    if derives is not None:
        head += "derives_from:\n" + "".join(f"- {d}\n" for d in derives)
    return head + "---\n# T\n\n" + body


def section(*lines: str) -> str:
    return "### Rationale\n\nx\n\n### Main paths\n\n#### Path 1: p\n\n" + "\n".join(lines) + "\n\n<!-- okf:links:start -->\n"


def bundle(tmp: Path, strs_body: str, crlf: bool = False) -> Path:
    (tmp / "tiers/strs/a").mkdir(parents=True)
    (tmp / "tiers/swrs/a").mkdir(parents=True)
    (tmp / "config.yml").write_text(CONFIG, encoding="utf-8")
    files = {
        "tiers/strs/a/StRS-T-A-001.md": req("StRS", "StRS-T-A-001", body=strs_body),
        "tiers/strs/a/StRS-T-A-002.md": req("StRS", "StRS-T-A-002", body="no section\n"),
        "tiers/swrs/a/SwRS-T-A-001.md": req("SwRS", f"{P}-A-001", derives=["StRS-T-A-001"]),
        "tiers/swrs/a/SwRS-T-A-002.md": req("SwRS", f"{P}-A-002", "approved", ["StRS-T-A-001"]),
        "tiers/swrs/a/SwRS-T-A-003.md": req("SwRS", f"{P}-A-003", "superseded", ["StRS-T-A-001"]),
        "tiers/swrs/a/SwRS-T-A-004.md": req("SwRS", f"{P}-A-004", "deprecated", ["StRS-T-A-001"]),
        "tiers/swrs/a/SwRS-T-A-005.md": req("SwRS", f"{P}-A-005", derives=["StRS-T-A-002"]),
        "tiers/swrs/a/SwRS-T-A-006.md": req("SwRS", f"{P}-A-006", "draft", ["StRS-T-A-001", "StRS-T-A-002"]),
    }
    for name, text in files.items():
        data = text.replace("\n", "\r\n") if crlf else text
        (tmp / name).write_bytes(data.encode("utf-8"))
    return tmp


def run(tmp: Path, body: str, crlf: bool = False) -> tuple[list[str], int, int]:
    return cmp.check(bundle(tmp, body, crlf))


def test_valid_section_passes(tmp_path: Path) -> None:
    body = section("1. Start", f"   - {P}-A-001: go", f"   - Option {P}-A-006 (refusal): other", "2. End")
    assert run(tmp_path, body) == ([], 1, 2)
    assert cmp.main(["x", str(tmp_path)]) == 0


def test_unknown_id_does_not_exist(tmp_path: Path) -> None:
    problems, _, _ = run(tmp_path, section(f"   - {P}-A-099: go"))
    assert len(problems) == 1 and "does not exist" in problems[0]
    assert "/tiers/strs/a/StRS-T-A-001.md:" in problems[0]
    assert cmp.main(["x", str(tmp_path)]) == 1


def test_superseded_and_deprecated_not_active(tmp_path: Path) -> None:
    problems, _, _ = run(tmp_path, section(f"   - {P}-A-003: a", f"   - {P}-A-004: b"))
    assert [("superseded, not active" in problems[0]), ("deprecated, not active" in problems[1])] == [True, True]


def test_other_strs_does_not_derive(tmp_path: Path) -> None:
    problems, _, _ = run(tmp_path, section(f"   - {P}-A-005: a"))
    assert len(problems) == 1 and "does not derive from StRS-T-A-001" in problems[0]


def test_option_is_checked_like_a_step(tmp_path: Path) -> None:
    problems, _, _ = run(tmp_path, section(f"   - Option {P}-A-005 (nominal): a"))
    assert len(problems) == 1 and "does not derive" in problems[0]


def test_missing_section_and_outside_citation_ignored(tmp_path: Path) -> None:
    body = f"Cites {P}-A-099 before.\n\n### Main paths\n\n{P}-A-001\n\n### After\n\n{P}-A-099\n"
    assert run(tmp_path, body) == ([], 1, 1)


def test_all_problems_listed(tmp_path: Path) -> None:
    problems, _, citations = run(tmp_path, section(f"   - {P}-A-099: a", f"   - {P}-A-003: b", f"   - {P}-A-005: c"))
    assert len(problems) == 3 and citations == 3


def test_line_numbers_point_at_the_citation(tmp_path: Path) -> None:
    problems, _, _ = run(tmp_path, section(f"   - {P}-A-099: a"))
    path = tmp_path / "tiers/strs/a/StRS-T-A-001.md"
    line = next(i for i, text in enumerate(path.read_text(encoding="utf-8").split("\n"), 1) if "A-099" in text)
    assert f":{line}: " in problems[0]


def test_crlf_file_is_read_the_same(tmp_path: Path) -> None:
    body = section(f"   - {P}-A-001: go", f"   - {P}-A-099: bad")
    lf = run(tmp_path / "lf", body)
    crlf = run(tmp_path / "crlf", body, crlf=True)
    strip = lambda r: [p.split("/tiers/", 1)[1] for p in r[0]]  # noqa: E731
    assert strip(lf) == strip(crlf) and len(crlf[0]) == 1 and lf[1:] == crlf[1:]
