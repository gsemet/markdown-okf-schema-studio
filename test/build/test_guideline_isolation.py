"""Keep the project rules independent of the change request process.

The process guideline (`change-requests-lifecycle.guidelines.md`) ranks below the constitution,
`AGENTS.md` and every project guideline. A project rule must still hold if another process runs
the work, so no project rule links to the process guideline or names one of its roles. `AGENTS.md`
holds the only link, in its "Process" section.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROCESS = ".agents/guidelines/change-requests-lifecycle.guidelines.md"
PROCESS_NAME = "change-requests-lifecycle.guidelines.md"
ROLES = re.compile(r"\b(Chief of Staff|Foreman|drivers?|Inspector)\b", re.IGNORECASE)
LINK = re.compile(r"\]\(([^)\s]+)\)")


def project_rules() -> list[Path]:
    """The constitution, the project guidelines and the requirements guidelines."""
    guidelines = sorted((ROOT / ".agents/guidelines").glob("*.md"))
    requirements = sorted((ROOT / "requirements/guidelines").glob("*.md"))
    demo = sorted((ROOT / "docs/demo-video/guidelines").glob("*.md"))
    rules = [ROOT / ".agents/constitution.md", *guidelines, *requirements, *demo]
    return [path for path in rules if path != ROOT / PROCESS]


def links_to_process(path: Path) -> list[str]:
    found = []
    for target in LINK.findall(path.read_text(encoding="utf-8")):
        resolved = (path.parent / target.split("#")[0]).resolve() if target.split("#")[0] else path
        if resolved == (ROOT / PROCESS).resolve():
            found.append(target)
    return found


def test_project_rules_are_found() -> None:
    names = {path.name for path in project_rules()}
    assert {"constitution.md", "ci.guidelines.md", "requirements.guidelines.md"} <= names
    assert "release-process.guidelines.md" in names
    assert PROCESS_NAME not in names


def test_no_project_rule_links_to_the_process_guideline() -> None:
    offenders = {
        path.relative_to(ROOT).as_posix(): links
        for path in project_rules()
        if (links := links_to_process(path))
    }
    assert offenders == {}


def test_no_project_rule_names_the_process_guideline() -> None:
    offenders = [
        path.relative_to(ROOT).as_posix()
        for path in project_rules()
        if PROCESS_NAME in path.read_text(encoding="utf-8")
    ]
    assert offenders == []


def test_no_project_rule_names_a_process_role() -> None:
    offenders: dict[str, list[str]] = {}
    for path in project_rules():
        text = path.read_text(encoding="utf-8")
        roles = sorted({match.group(0).lower() for match in ROLES.finditer(text)})
        if roles:
            offenders[path.relative_to(ROOT).as_posix()] = roles
    assert offenders == {}


def test_agents_md_links_to_the_process_guideline_exactly_once() -> None:
    assert len(links_to_process(ROOT / "AGENTS.md")) == 1


def test_process_guideline_ranks_below_the_project_guidelines() -> None:
    opening = (ROOT / PROCESS).read_text(encoding="utf-8").split("\n## ", 1)[0]
    assert "process guideline" in opening
    assert "project guidelines" in opening
    assert "ranks below" in opening


def test_state_file_guideline_is_absorbed() -> None:
    assert not (ROOT / ".agents/guidelines/state-file.guidelines.md").exists()
    for path in [ROOT / "AGENTS.md", *project_rules(), ROOT / PROCESS]:
        assert "state-file.guidelines.md" not in path.read_text(encoding="utf-8"), path
