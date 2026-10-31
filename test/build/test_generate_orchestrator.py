"""Unit tests for the generated ORCHESTRATOR.md (fixture trees only, never the live changes)."""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("generate_orchestrator", ROOT / "scripts/generate_orchestrator.py")
assert spec and spec.loader
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

REPO = "acme/widgets"
BASE = ["--repo", REPO, "--today", "2026-11-01"]


def header(status: str = "ready", pr: str = "#12") -> str:
    return (
        "driver: Driver 7 · updated: 10:00\n"
        f"status: {status} · step: 5 Code · round: 1/3\n"
        f"head: abc123 · PR: {pr} · run: 1 pass\n"
        "next: wait · question: —\n\n- [ ] step 1\n"
    )


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def cr(changes: Path, name: str, title: str, state: str | None) -> Path:
    folder = changes / "03-requests" / name
    write(folder / "00-request.md", f"# {title}\n\nBody.\n")
    if state is not None:
        write(folder / "STATE.md", state)
    return folder


def run(changes: Path, *extra: str) -> int:
    return gen.main([str(changes), *BASE, *extra])


def output(changes: Path) -> str:
    return (changes / "03-requests" / "ORCHESTRATOR.md").read_text(encoding="utf-8")


@pytest.fixture
def changes(tmp_path: Path) -> Path:
    (tmp_path / "03-requests").mkdir(parents=True)
    return tmp_path


def test_active_rows_icons_and_pr_link(changes: Path, capsys: pytest.CaptureFixture[str]) -> None:
    cr(changes, "010-ready-one", "010 — Ready one", header("ready", "#12"))
    cr(changes, "011-working-one", "011: Working one", header("working", "— (Foreman)"))
    cr(changes, "012-blocked-one", "Blocked one", header("blocked", "#13"))
    assert run(changes) == 0
    text = output(changes)
    assert "> Updated 2026-11-01: 3 active CRs." in text
    assert (
        "| [010](010-ready-one/00-request.md) | Ready one | [🟢 ready 5 Code 1/3](010-ready-one/STATE.md) "
        "| `change-requests/010-ready-one` | [#12](https://github.com/acme/widgets/pull/12) |"
    ) in text
    assert "[🟡 working 5 Code 1/3](011-working-one/STATE.md) | `change-requests/011-working-one` | — |" in text
    assert "[🔴 blocked 5 Code 1/3](012-blocked-one/STATE.md)" in text
    assert text.index("[012]") < text.index("[011]") < text.index("[010]")
    assert capsys.readouterr().err == ""


def test_unparsable_header_exits_1_names_path_and_still_writes(changes: Path, capsys: pytest.CaptureFixture[str]) -> None:
    cr(changes, "020-good", "Good", header())
    bad = cr(changes, "021-bad", "Bad", header().replace("status: ready · step", "status: nearly · step"))
    cr(changes, "022-missing", "Missing", None)
    assert run(changes) == 1
    err = capsys.readouterr().err
    assert f"error: {bad / 'STATE.md'}: unparsable STATE.md header (line 2)" in err
    assert "022-missing/STATE.md: missing STATE.md" in err
    text = output(changes)
    assert "[⚠️ unparsable header](021-bad/STATE.md)" in text
    assert "| [020](020-good/00-request.md) | Good | [🟢 ready" in text
    assert "| [022](022-missing/00-request.md) | Missing | ⚠️ unparsable header | `change-requests/022-missing` | — |" in text


def test_landed_report_pr_and_date_newest_first(changes: Path) -> None:
    archives = changes / "04-archives"
    write(archives / "100-old" / "00-request.md", "# 100 - Old change\n")
    write(archives / "100-old" / "report.md", "# Report\n\nPR [#43](https://github.com/acme/widgets/pull/43) landed 2026-10-01.\n")
    write(archives / "101-new" / "00-request.md", "# 101 — New change\n")
    write(archives / "101-new" / "report.md", "Landed 2026-10-20, see PR #44.\n")
    write(archives / "099-undated" / "00-request.md", "# Undated\n")
    write(archives / "102-nodoc" / "00-index.md", "# Campaign\n")
    write(archives / "RUN-BRIEF-run3.md", "ignored\n")
    assert run(changes) == 0
    landed = output(changes).split("## Landed")[1]
    assert "| [100](../04-archives/100-old/00-request.md) | Old change | [report](../04-archives/100-old/report.md) | [#43](https://github.com/acme/widgets/pull/43) | 2026-10-01 |" in landed
    assert "[#44](https://github.com/acme/widgets/pull/44) | 2026-10-20 |" in landed
    assert "| [102](../04-archives/102-nodoc/00-index.md) | Campaign | — | — | — |" in landed
    assert "RUN-BRIEF" not in landed
    order = [landed.index(f"[{n}]") for n in ("101", "100", "102", "099")]
    assert order == sorted(order)


def test_backlog_rows(changes: Path) -> None:
    write(changes / "02-backlog/P2/zeta/01-intent.md", "---\ntitle: x\n# not a heading\n---\n\n# Zeta item\n")
    write(changes / "02-backlog/P2/zeta/notes/extra.md", "more\n")
    write(changes / "02-backlog/P1/alpha/01-intent.md", "# Alpha | pipe\n")
    assert run(changes) == 0
    text = output(changes)
    assert "| P1 | [alpha](../02-backlog/P1/alpha/01-intent.md) | Alpha \\| pipe | 1 |" in text
    assert "| P2 | [zeta](../02-backlog/P2/zeta/01-intent.md) | Zeta item | 2 |" in text
    assert text.index("| P1 |") < text.index("| P2 |")


def test_drift_by_name_is_listed_under_its_cr_only(changes: Path, capsys: pytest.CaptureFixture[str]) -> None:
    folder = cr(changes, "030-fix-thing", "Fix thing", header())
    write(folder / "backlog-item" / "01-intent.md", "# Fix thing intent\n")
    write(changes / "02-backlog/P2/fix-thing/01-intent.md", "# Fix thing intent (old copy)\n")
    write(changes / "02-backlog/P2/other/01-intent.md", "# Other\n")
    assert run(changes) == 0
    err = capsys.readouterr().err
    assert "warning: drift: 02-backlog/P2/fix-thing is also 03-requests/030-fix-thing/backlog-item" in err
    text = output(changes)
    backlog = text.split("## Backlog")[1].split("## Landed")[0]
    assert "fix-thing" not in backlog and "[other]" in backlog
    assert text.count("[030](030-fix-thing/00-request.md)") == 1
    drift = "- `02-backlog/P2/fix-thing` is also `03-requests/030-fix-thing/backlog-item`: listed under its CR only."
    assert text.count(drift) == 1
    assert text.index(drift) < text.index("## Active")


def test_drift_by_title_with_archived_cr(changes: Path, capsys: pytest.CaptureFixture[str]) -> None:
    write(changes / "04-archives/040-renamed/00-request.md", "# Renamed\n")
    write(changes / "04-archives/040-renamed/backlog-item/01-intent.md", "# Same title\n")
    write(changes / "02-backlog/P3/different-slug/01-intent.md", "# Same title\n")
    assert run(changes) == 0
    assert "warning: drift: 02-backlog/P3/different-slug is also 04-archives/040-renamed/backlog-item" in capsys.readouterr().err
    assert "different-slug](" not in output(changes)


def test_second_run_is_a_noop_even_on_another_day(changes: Path) -> None:
    cr(changes, "050-one", "One", header())
    write(changes / "02-backlog/P4/idea/01-intent.md", "# Idea\n")
    assert run(changes) == 0
    path = changes / "03-requests" / "ORCHESTRATOR.md"
    before, mtime = path.read_bytes(), path.stat().st_mtime_ns
    os.utime(path, ns=(mtime - 10**9, mtime - 10**9))
    mtime -= 10**9
    assert gen.main([str(changes), "--repo", REPO, "--today", "2027-01-02"]) == 0
    assert path.read_bytes() == before and path.stat().st_mtime_ns == mtime
    cr(changes, "051-two", "Two", header())
    assert gen.main([str(changes), "--repo", REPO, "--today", "2027-01-02"]) == 0
    assert "> Updated 2027-01-02: 2 active CRs." in output(changes)


def test_notes_are_appended_as_is(changes: Path) -> None:
    cr(changes, "060-one", "One", header())
    assert run(changes) == 0
    assert "Hand-written" not in output(changes)
    notes = "## Notes\n\nHand-written | line.\n"
    write(changes / "03-requests" / "ORCHESTRATOR-NOTES.md", notes)
    assert run(changes) == 0
    assert output(changes).endswith("\n" + notes)


def test_bad_changes_root_exits_2(tmp_path: Path) -> None:
    assert gen.main([str(tmp_path), *BASE]) == 2


def test_alert_is_singular_and_plural(changes: Path) -> None:
    assert run(changes) == 0
    assert "> Updated 2026-11-01: 0 active CRs." in output(changes)
    cr(changes, "030-only", "Only", header())
    assert run(changes) == 0
    assert "> Updated 2026-11-01: 1 active CR." in output(changes)


def test_archived_folder_without_md_still_gets_a_landed_row(changes: Path) -> None:
    (changes / "04-archives" / "050-empty").mkdir(parents=True)
    assert run(changes) == 0
    assert "| 050 | — | — | — | — |" in output(changes).split("## Landed")[1]


def test_wait_ci_and_landed_icons(changes: Path) -> None:
    cr(changes, "070-waiting", "Waiting", header("wait-ci"))
    cr(changes, "071-done", "Done", header("landed"))
    assert run(changes) == 0
    text = output(changes)
    assert "[🟡 wait-ci 5 Code 1/3](070-waiting/STATE.md)" in text
    assert "[✅ landed 5 Code 1/3](071-done/STATE.md)" in text


def test_notes_alert_like_line_is_not_ignored(changes: Path) -> None:
    cr(changes, "080-one", "One", header())
    notes = changes / "03-requests" / "ORCHESTRATOR-NOTES.md"
    write(notes, "> Updated 2026-01-01: first.\n")
    assert run(changes) == 0
    write(notes, "> Updated 2026-01-02: second.\n")
    assert run(changes) == 0
    assert "> Updated 2026-01-02: second." in output(changes)


def test_non_utf8_state_is_reported_like_unparsable(changes: Path, capsys: pytest.CaptureFixture[str]) -> None:
    folder = cr(changes, "090-binary", "Binary", None)
    (folder / "STATE.md").write_bytes(b"\xff\xfe\x00bad")
    assert run(changes) == 1
    assert f"error: {folder / 'STATE.md'}: unparsable STATE.md header (line 1)" in capsys.readouterr().err
    assert "[⚠️ unparsable header](090-binary/STATE.md)" in output(changes)
