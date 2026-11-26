"""The two parts of the visual campaign (``capture.py --part``) and the step that merges them.

The merge cases run ``merge_parts.py`` on part manifests prepared here, which hold the states no
shipped file can hold. ``VISUAL_PARTS`` and the group ids are read from the shipped files.
"""

from __future__ import annotations

import ast
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "test" / "visual"))

import capture  # noqa: E402
import capture_report  # noqa: E402
import merge_parts  # noqa: E402

FIRST = "rendering-core/v01-first"
SECOND = "theme-zoom/v01-second"
ALIAS = "theme-zoom/v02-alias"
RENDER = {
    "groups": [{"id": "rendering-core", "title": "Rendering core"}, {"id": "theme-zoom", "title": "Theme and zoom"}],
    "limitations": "Static generated HTML with mock host.",
    "scenarios": [
        {"id": FIRST, "page": "first", "machineChecks": []},
        {"id": SECOND, "page": "second", "machineChecks": []},
    ],
}
# One scenario of part 2 shows the picture of a scenario of part 1: both parts capture that one.
RENDER_WITH_ALIAS = {**RENDER, "scenarios": [*RENDER["scenarios"], {"id": ALIAS, "page": "alias"}]}
STARTS = {1: "2026-01-01T10:00:05.000Z", 2: "2026-01-01T10:00:00.000Z"}


def _result(identifier: str, screenshot_of: str | None = None, failures: tuple[str, ...] = ()) -> dict:
    file = f"visual/{identifier}.png"
    own = screenshot_of is None
    return {
        "id": identifier,
        "sequence": 1,
        "group": identifier.split("/")[0],
        "screenshotOf": screenshot_of,
        "expectedContent": f"What {identifier} shows.",
        "status": "failed" if failures else "passed",
        "failures": list(failures),
        "capture": file if own else None,
        "captures": [{"file": file, "step": None}] if own else [],
        "finalState": {"machineChecks": [{"id": "overflow", "applicable": True, "pass": False, "detail": identifier}]},
    }


def _part(number: int, results: list[dict], **changes: object) -> dict:
    pages = {scenario["id"]: scenario["page"] for scenario in RENDER_WITH_ALIAS["scenarios"]}
    failures = [{"page": pages[result["id"]], "detail": detail} for result in results for detail in result["failures"]]
    return {
        "runId": "run-1",
        "campaignStartedAt": STARTS[number],
        "campaignCommand": "node scripts/e2e-campaign.mjs begin visual",
        "startedAt": f"2026-01-01T10:0{number}:00+00:00",
        "revision": "abc",
        "worktreeStatus": "",
        "sourceCommand": ["python", "capture.py", "--part", str(number)],
        "status": "failed" if failures else "passed",
        "partial": True,
        **capture_report.result_counts(results),
        "workerCount": number,
        "failureCount": len(failures),
        "failures": failures,
        "duplicateImages": [],
        "results": results,
        "completedAt": f"2026-01-01T10:0{number + 5}:00+00:00",
        "part": number,
        **changes,
    }


def _write_parts(tmp_path: Path, parts: list[dict], render: dict = RENDER, pictures: dict[str, bytes] | None = None):
    screenshots = tmp_path / "out" / "reports" / "e2e" / "screenshots"
    screenshots.mkdir(parents=True)
    render_path = tmp_path / "manifest.json"
    render_path.write_text(json.dumps(render), encoding="utf-8")
    for part in parts:
        (screenshots / f"run-manifest.part-{part['part']}.json").write_text(json.dumps(part), encoding="utf-8")
        for result in part["results"]:
            for shot in result["captures"]:
                picture = screenshots / shot["file"]
                picture.parent.mkdir(parents=True, exist_ok=True)
                picture.write_bytes((pictures or {}).get(shot["file"], shot["file"].encode()))
    return render_path, screenshots


def _full(screenshots: Path) -> dict:
    return json.loads((screenshots / "run-manifest.json").read_text(encoding="utf-8"))


def _two_parts(**second: object) -> list[dict]:
    return [_part(1, [_result(FIRST)]), _part(2, [_result(SECOND)], **second)]


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_two_parts_merge_into_the_files_of_a_full_run(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    render_path, screenshots = _write_parts(tmp_path, _two_parts())
    assert merge_parts.merge_parts(render_path, screenshots) == 0
    assert capsys.readouterr().out.splitlines() == [
        "visual part 1: passed, 1 scenarios, 300 s",
        "visual part 2: passed, 1 scenarios, 300 s",
        "visual parts: merged",
    ]
    results = [_result(FIRST), _result(SECOND)]
    # Part 2 began its campaign first: its campaign start is the run's.
    expected = {
        **{key: value for key, value in _part(2, results).items() if key != "part"},
        "startedAt": "2026-01-01T10:01:00+00:00",
        "completedAt": "2026-01-01T10:07:00+00:00",
        "sourceCommand": sys.orig_argv,
        "partial": False,
        "workerCount": 2,
        "parts": [1, 2],
    }
    assert _full(screenshots) == expected
    written = tmp_path / "shared-writer"
    written.mkdir()
    capture_report.write_reports(written, RENDER, expected)
    for name in ("run-manifest.json", "INDEX.md", "MACHINE-CHECKS.md"):
        assert (screenshots / name).read_text(encoding="utf-8") == (written / name).read_text(encoding="utf-8"), name
    index = (screenshots / "INDEX.md").read_text(encoding="utf-8")
    assert "(run-manifest.json)" in index and "(MACHINE-CHECKS.md)" in index and ".part-" not in index


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
@pytest.mark.parametrize(
    ("parts", "render", "cause"),
    [
        (_two_parts()[:1], RENDER, "part 2 manifest is missing (run-manifest.part-2.json)"),
        (_two_parts()[1:], RENDER, "part 1 manifest is missing (run-manifest.part-1.json)"),
        (_two_parts(), RENDER_WITH_ALIAS, f"1 scenario(s) of the render manifest are in no part: {ALIAS}"),
        (_two_parts(), {**RENDER, "scenarios": RENDER["scenarios"][:1]},
         f"1 scenario(s) of the parts are not in the render manifest: {SECOND}"),
        (_two_parts(revision="def"), RENDER, "the parts disagree on revision (part 1: abc, part 2: def)"),
        (_two_parts(runId="run-0"), RENDER, "the parts disagree on runId (part 1: run-1, part 2: run-0)"),
        ([_part(1, [_result(FIRST)]), _part(2, [_result(SECOND), _result(FIRST, failures=("broken",))])], RENDER,
         f"scenario(s) with different results in two parts: {FIRST}"),
    ],
    ids=["no-part-2", "no-part-1", "scenario-in-no-part", "unknown-scenario", "revision", "run-id", "two-results"],
)
def test_parts_that_do_not_make_one_run_are_refused_and_write_nothing(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], parts: list[dict], render: dict, cause: str,
) -> None:
    render_path, screenshots = _write_parts(tmp_path, parts, render)
    assert merge_parts.merge_parts(render_path, screenshots) == 1
    assert f"visual parts: refused, {cause}" in capsys.readouterr().err
    assert not (screenshots / "run-manifest.json").exists()
    assert not (screenshots / "INDEX.md").exists()


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_a_failed_part_fails_the_merge_and_its_failures_reach_the_full_manifest(
    tmp_path: Path, capsys: pytest.CaptureFixture[str],
) -> None:
    parts = [_part(1, [_result(FIRST)]), _part(2, [_result(SECOND, failures=("the panel is missing",))])]
    render_path, screenshots = _write_parts(tmp_path, parts)
    assert merge_parts.merge_parts(render_path, screenshots) == 1
    assert "visual parts: refused, part 2 failed" in capsys.readouterr().err
    merged = _full(screenshots)
    assert (merged["status"], merged["partial"], merged["failedScenarioCount"]) == ("failed", False, 1)
    assert merged["failures"] == [{"page": "second", "detail": "the panel is missing"}]
    assert "Failure: the panel is missing" in (screenshots / "INDEX.md").read_text(encoding="utf-8")


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_identical_pngs_across_the_parts_fail_the_merge(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    files = [f"visual/{FIRST}.png", f"visual/{SECOND}.png"]
    render_path, screenshots = _write_parts(tmp_path, _two_parts(), pictures={name: b"same" for name in files})
    assert merge_parts.merge_parts(render_path, screenshots) == 1
    assert f"identical PNGs across the parts: {', '.join(files)}" in capsys.readouterr().err
    merged = _full(screenshots)
    assert merged["status"] == "failed"
    assert merged["duplicateImages"] == [files]
    assert merged["failures"] == [{"page": "campaign", "detail": f"unintended identical PNGs: {', '.join(files)}"}]
    assert [result["status"] for result in merged["results"]] == ["failed", "failed"]


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
@pytest.mark.parametrize("failures", [(), ("the picture is blank",)], ids=["passed", "failed"])
def test_a_canonical_scenario_captured_in_both_parts_counts_once(tmp_path: Path, failures: tuple[str, ...]) -> None:
    parts = [
        _part(1, [_result(FIRST, failures=failures)]),
        _part(2, [_result(FIRST, failures=failures), _result(SECOND), _result(ALIAS, screenshot_of=FIRST)]),
    ]
    render_path, screenshots = _write_parts(tmp_path, parts, RENDER_WITH_ALIAS)
    assert merge_parts.merge_parts(render_path, screenshots) == (1 if failures else 0)
    merged = _full(screenshots)
    assert [result["id"] for result in merged["results"]] == [FIRST, SECOND, ALIAS]
    assert (merged["scenarioCount"], merged["pngCount"], merged["screenshotCount"]) == (3, 2, 2)
    assert merged["failures"] == [{"page": "first", "detail": detail} for detail in failures]
    assert (merged["failureCount"], merged["failedScenarioCount"]) == (len(failures), len(failures))
    assert merged["duplicateImages"] == []


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_without_part_manifests_the_full_run_manifest_stands(
    tmp_path: Path, capsys: pytest.CaptureFixture[str],
) -> None:
    render_path, screenshots = _write_parts(tmp_path, [])
    assert merge_parts.merge_parts(render_path, screenshots) == 1
    assert "the manifests of part 1 and part 2 are missing" in capsys.readouterr().err
    full = screenshots / "run-manifest.json"
    full.write_bytes(b'{"partial": false, "status": "passed"}')
    assert merge_parts.merge_parts(render_path, screenshots) == 0
    assert capsys.readouterr().out == "visual parts: none, the full run's manifest stands\n"
    assert full.read_bytes() == b'{"partial": false, "status": "passed"}'
    assert sorted(path.name for path in screenshots.iterdir()) == ["run-manifest.json"]


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_a_merge_without_the_render_manifest_is_refused_and_writes_nothing(
    tmp_path: Path, capsys: pytest.CaptureFixture[str],
) -> None:
    render_path, screenshots = _write_parts(tmp_path, _two_parts())
    render_path.unlink()
    assert merge_parts.merge_parts(render_path, screenshots) == 1
    assert f"visual parts: refused, the render manifest is missing ({render_path})" in capsys.readouterr().err
    assert not (screenshots / "run-manifest.json").exists()
    assert not (screenshots / "INDEX.md").exists()


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_a_merge_with_a_missing_capture_file_is_refused_and_writes_nothing(
    tmp_path: Path, capsys: pytest.CaptureFixture[str],
) -> None:
    render_path, screenshots = _write_parts(tmp_path, _two_parts())
    picture = screenshots / f"visual/{SECOND}.png"
    picture.unlink()
    assert merge_parts.merge_parts(render_path, screenshots) == 1
    assert f"visual parts: refused, a capture of a part is missing: {picture}" in capsys.readouterr().err
    assert not (screenshots / "run-manifest.json").exists()
    assert not (screenshots / "INDEX.md").exists()


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
@pytest.mark.parametrize(
    ("run_id", "started_at", "pinned", "expected"),
    [
        ("run-1", STARTS[1], True, STARTS[2]),
        ("run-1", STARTS[2], True, STARTS[2]),
        # No part began at this time: the parts are the evidence of an earlier campaign.
        ("run-1", "2026-01-02T00:00:00.000Z", True, "2026-01-02T00:00:00.000Z"),
        ("run-2", STARTS[1], True, STARTS[1]),
        ("run-1", STARTS[1], False, STARTS[1]),
    ],
    ids=["later-part", "earliest-part", "later-campaign", "other-run", "unpinned"],
)
def test_the_campaign_file_of_a_pinned_part_takes_the_start_of_the_merged_run(
    tmp_path: Path, run_id: str, started_at: str, pinned: bool, expected: str,
) -> None:
    """The report job holds the campaign file of whichever part landed last, and the review index
    requires the run manifest to start with the campaign of that file."""
    render_path, screenshots = _write_parts(tmp_path, _two_parts())
    campaign = screenshots.parent / "campaign-visual.json"
    held = {"runId": run_id, "startedAt": started_at, **({"pinnedRunId": True} if pinned else {})}
    campaign.write_text(json.dumps(held), encoding="utf-8")
    assert merge_parts.merge_parts(render_path, screenshots) == 0
    assert json.loads(campaign.read_text(encoding="utf-8")) == {**held, "startedAt": expected}
    assert _full(screenshots)["campaignStartedAt"] == STARTS[2]


def _begin_visual(root: Path, pinned: str | None) -> dict:
    """The campaign file after ``e2e-campaign.mjs begin visual`` ran in ``root``, as every mode of
    `just ci-visual` starts; ``pinned`` is the run id the CI workflow sets."""
    environment = {key: value for key, value in os.environ.items() if not key.startswith("STUDIO_E2E_")}
    if pinned:
        environment["STUDIO_E2E_RUN_ID"] = pinned
    subprocess.run(
        ["node", str(ROOT / "scripts" / "e2e-campaign.mjs"), "begin", "visual"],
        cwd=root, env=environment, capture_output=True, check=True,
    )
    return json.loads((root / "out" / "reports" / "e2e" / "campaign-visual.json").read_text(encoding="utf-8"))


def _part_of(campaign: dict, number: int, results: list[dict]) -> dict:
    """The manifest of a part captured in the campaign of this campaign file."""
    return _part(
        number, results,
        runId=campaign["runId"], campaignStartedAt=campaign["startedAt"], campaignCommand=campaign["command"],
        renderRunId=campaign["runId"], renderCampaignStartedAt=campaign["startedAt"],
        startedAt=campaign["startedAt"], completedAt=campaign["startedAt"],
    )


def _review_failures(screenshots: Path) -> list[str]:
    """What the shipped review step (``review:finish --visual-only``) holds against the merged run."""
    script = (
        "import { readFileSync } from 'node:fs'; import { pathToFileURL } from 'node:url';"
        "const [check, ...files] = process.argv.slice(1);"
        "const { validateVisualEvidence } = await import(pathToFileURL(check).href);"
        "const read = (file) => JSON.parse(readFileSync(file, 'utf8'));"
        "console.log(JSON.stringify(validateVisualEvidence(...files.map(read))));"
    )
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", script, str(ROOT / "test" / "site" / "reviewEvidence.ts"),
         str(screenshots.parent / "campaign-visual.json"), str(screenshots / "run-manifest.json")],
        capture_output=True, text=True, check=False,
    )
    assert completed.returncode == 0, completed.stderr
    return json.loads(completed.stdout)


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
@pytest.mark.parametrize("pinned", [None, "4242"], ids=["local", "ci"])
def test_parts_of_two_campaign_starts_pass_the_review_only_under_a_pinned_run_id(
    tmp_path: Path, pinned: str | None,
) -> None:
    """In CI the two part jobs begin one after the other under the pinned run id. Locally, the same
    shape is `just ci-visual`, an edit, then `just ci-visual 1`: part 2 is the evidence of the code
    before the edit, under the same run id and revision."""
    first = _begin_visual(tmp_path, pinned)
    render_path, screenshots = _write_parts(
        tmp_path, [_part_of(first, 1, [_result(FIRST)]), _part_of(first, 2, [_result(SECOND)])],
    )
    second = _begin_visual(tmp_path, pinned)
    assert second["runId"] == first["runId"] and second["startedAt"] > first["startedAt"]
    (screenshots / "run-manifest.part-1.json").write_text(
        json.dumps(_part_of(second, 1, [_result(FIRST)])), encoding="utf-8",
    )
    assert merge_parts.merge_parts(render_path, screenshots) == 0
    assert _review_failures(screenshots) == ([] if pinned else [
        "visual campaign start time does not match review start",
        "visual startedAt is missing or predates review start",
        "visual render start time does not match review start",
    ])


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_a_local_run_of_both_parts_passes_the_review_with_its_campaign_file_untouched(tmp_path: Path) -> None:
    """`just ci-visual` with no part begins one campaign for both parts (test_workflows.py)."""
    campaign = _begin_visual(tmp_path, None)
    render_path, screenshots = _write_parts(
        tmp_path, [_part_of(campaign, 1, [_result(FIRST)]), _part_of(campaign, 2, [_result(SECOND)])],
    )
    held = (screenshots.parent / "campaign-visual.json").read_bytes()
    assert merge_parts.merge_parts(render_path, screenshots) == 0
    assert (screenshots.parent / "campaign-visual.json").read_bytes() == held
    assert _review_failures(screenshots) == []


def _shipped_parts() -> dict[int, tuple[str, ...]]:
    tree = ast.parse((ROOT / "test" / "visual" / "capture.py").read_text(encoding="utf-8"))
    [value] = [
        node.value for node in tree.body
        if isinstance(node, ast.Assign) and [getattr(target, "id", None) for target in node.targets] == ["VISUAL_PARTS"]
    ]
    return ast.literal_eval(value)


def _shipped_groups() -> list[str]:
    source = (ROOT / "test" / "shared" / "e2eGroups.ts").read_text(encoding="utf-8")
    declared = source.split("export const GROUPS = [", 1)[1].split("] as const", 1)[0]
    return re.findall(r'\{ id: "([a-z0-9-]+)"', declared)


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_the_shipped_parts_hold_every_e2e_group_exactly_once_in_group_order() -> None:
    parts = _shipped_parts()
    groups = _shipped_groups()
    assert sorted(parts) == [1, 2] and all(parts.values())
    assert len(groups) == len(set(groups)) == 16
    assert [group for number in sorted(parts) for group in parts[number]] == groups


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
@pytest.mark.parametrize(
    ("parts", "groups", "named"),
    [
        ({1: ("gfm",), 2: ("myst",)}, ["gfm", "myst", "new-group"], "group 'new-group' is in no part"),
        ({1: ("gfm",), 2: ("myst", "gfm")}, ["gfm", "myst"], "group 'gfm' is in 2 parts"),
    ],
    ids=["no-part", "two-parts"],
)
def test_a_group_outside_exactly_one_part_stops_the_capture_and_is_named(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
    parts: dict, groups: list[str], named: str,
) -> None:
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps(
        {"pageDirectory": str(tmp_path), "groups": [{"id": group, "title": group} for group in groups], "scenarios": []},
    ), encoding="utf-8")
    monkeypatch.setattr(capture, "VISUAL_PARTS", parts)
    monkeypatch.setattr(capture, "MANIFEST", manifest)
    monkeypatch.setattr(sys, "argv", ["capture.py"])
    assert capture.main() == 2
    assert named in capsys.readouterr().err


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
@pytest.mark.parametrize("selection", [("--scenario", "x"), ("--group", "gfm")], ids=["scenario", "group"])
def test_a_part_cannot_be_combined_with_a_selection(selection: tuple[str, str]) -> None:
    completed = subprocess.run(
        [sys.executable, str(ROOT / "test" / "visual" / "capture.py"), "--part", "1", *selection],
        capture_output=True, text=True, check=False,
    )
    assert completed.returncode == 2
    assert "usage:" in completed.stderr
    assert "--part cannot be combined with --scenario or --group" in completed.stderr


# @tests_req SwRS-MDOKFSTUDIO-CORE-076#S12
def test_two_part_runs_in_one_folder_keep_each_other_s_files_and_merge(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``capture.py`` itself, with the browser replaced: each frame it would take is a small file."""
    render = {
        **RENDER_WITH_ALIAS,
        "pageDirectory": str(tmp_path),
        "scenarios": [
            {**scenario, "group": scenario["id"].split("/")[0],
             **({"screenshotOf": FIRST} if scenario["id"] == ALIAS else {})}
            for scenario in RENDER_WITH_ALIAS["scenarios"]
        ],
    }
    render_path, screenshots = _write_parts(tmp_path, [], render)

    def take_pictures(_pages: Path, batch: list[dict]) -> tuple[list[dict], list]:
        results = [_result(scenario["id"], scenario.get("screenshotOf")) for scenario in batch]
        for result in results:
            for shot in result["captures"]:
                (screenshots / shot["file"]).parent.mkdir(parents=True, exist_ok=True)
                (screenshots / shot["file"]).write_bytes(shot["file"].encode())
        return results, []

    monkeypatch.setattr(capture, "MANIFEST", render_path)
    monkeypatch.setattr(capture, "SCREENSHOT_DIR", screenshots)
    monkeypatch.setattr(capture, "VISUAL_SCREENSHOT_DIR", screenshots / "visual")
    monkeypatch.setattr(capture, "capture_scenarios", take_pictures)
    for number in ("1", "2"):
        monkeypatch.setattr(sys, "argv", ["capture.py", "--part", number])
        assert capture.main() == 0
    assert sorted(path.name for path in screenshots.iterdir() if path.is_file()) == [
        "INDEX.part-1.md", "INDEX.part-2.md", "MACHINE-CHECKS.part-1.md", "MACHINE-CHECKS.part-2.md",
        "run-manifest.part-1.json", "run-manifest.part-2.json",
    ]
    first, second = (
        json.loads((screenshots / f"run-manifest.part-{number}.json").read_text(encoding="utf-8")) for number in (1, 2)
    )
    assert (first["part"], first["partial"], [result["id"] for result in first["results"]]) == (1, True, [FIRST])
    # The alias of part 2 brings the canonical scenario of part 1 with it.
    assert (second["part"], [result["id"] for result in second["results"]]) == (2, [FIRST, SECOND, ALIAS])
    assert "(MACHINE-CHECKS.part-2.md)" in (screenshots / "INDEX.part-2.md").read_text(encoding="utf-8")

    assert merge_parts.merge_parts(render_path, screenshots) == 0
    merged = _full(screenshots)
    assert set(merged) == (set(first) - {"part"}) | {"parts"}
    assert [result["id"] for result in merged["results"]] == [FIRST, SECOND, ALIAS]
    assert (merged["status"], merged["partial"], merged["scenarioCount"], merged["screenshotCount"]) == ("passed", False, 3, 2)
