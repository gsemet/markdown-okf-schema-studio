"""Check the agent plugin manifests that package the writing skill.

Every manifest `version` equals `package.json`; the GitHub Copilot catalog follows the Copilot CLI
`marketplace.json` reference; the Agent Plugins manifest validates against the
published 1.0.0 JSON Schema (pinned copy under `test/fixtures/agent-plugins/`); every host reads
the single skill tree, never a copy; the VSIX does not ship the manifests.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import jsonschema
import pytest

# @tests_req SwRS-MDOKFSTUDIO-CORE-074
# @tests_req SwRS-MDOKFSTUDIO-CORE-075

ROOT = Path(__file__).resolve().parents[2]
SKILL = "writing-for-markdown-okf-schema-studio"
PLUGIN = "markdown-okf-schema-studio"
SCHEMA = ROOT / "test/fixtures/agent-plugins/plugin.schema.1.0.0.json"
COPILOT_CATALOG = Path(".github/plugin/marketplace.json")
KEBAB = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")
# Every file that carries the plugin version, as a path and the JSON keys leading to it.
VERSIONED = [
    (Path("plugin.json"), ()),
    (Path(".claude-plugin/plugin.json"), ()),
    (COPILOT_CATALOG, ("plugins", 0)),
]


def load(path: Path) -> dict:
    return json.loads((ROOT / path).read_text())


def package_version() -> str:
    return load(Path("package.json"))["version"]


@pytest.mark.parametrize(("path", "keys"), VERSIONED, ids=lambda v: str(v))
def test_manifest_version_matches_package(path: Path, keys: tuple[str, ...]) -> None:
    """Fail when a plugin manifest version drifts from package.json."""
    node = load(path)
    for key in keys:
        node = node[key]
    assert node["version"] == package_version(), f"{path} drifted from package.json"


def test_marketplace_entries_do_not_pin_another_version() -> None:
    """A marketplace plugin entry carries no version, or the package version."""
    for path in (Path(".claude-plugin/marketplace.json"), COPILOT_CATALOG):
        for entry in load(path)["plugins"]:
            assert entry.get("version", package_version()) == package_version(), path


def test_copilot_catalog_follows_the_copilot_cli_reference() -> None:
    """The Copilot catalog has the required fields and limits of the Copilot CLI reference.

    https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference
    """
    catalog = load(COPILOT_CATALOG)
    assert "$schema" not in catalog
    assert KEBAB.fullmatch(catalog["name"]) and len(catalog["name"]) <= 64
    assert isinstance(catalog["owner"]["name"], str) and catalog["owner"]["name"]
    assert set(catalog["owner"]) <= {"name", "email"}
    assert set(catalog.get("metadata", {})) <= {"description", "version", "pluginRoot"}
    assert catalog["plugins"], "the catalog lists no plugin"
    for entry in catalog["plugins"]:
        assert KEBAB.fullmatch(entry["name"]) and len(entry["name"]) <= 64
        assert isinstance(entry["source"], str) and entry["source"]
        assert len(entry.get("description", "")) <= 1024


def test_agent_plugins_manifest_matches_published_schema() -> None:
    """Validate the root plugin.json against the pinned Agent Plugins 1.0.0 schema."""
    schema = json.loads(SCHEMA.read_text())
    manifest = load(Path("plugin.json"))
    jsonschema.Draft202012Validator(schema).validate(manifest)
    assert manifest["$schema"] == schema["$id"]
    assert manifest["name"] == PLUGIN


def test_agent_plugins_schema_rejects_unknown_keys() -> None:
    """The pinned schema is strict, so an invented key in plugin.json would fail it."""
    manifest = {**load(Path("plugin.json")), "skills": "./skills"}
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.Draft202012Validator(json.loads(SCHEMA.read_text())).validate(manifest)


def test_hosts_share_one_names_and_one_skill_tree() -> None:
    """All manifests name the same plugin and point at the repository root; one SKILL.md exists."""
    assert load(Path(".claude-plugin/plugin.json"))["name"] == PLUGIN
    claude = load(Path(".claude-plugin/marketplace.json"))
    codex = load(Path(".agents/plugins/marketplace.json"))
    copilot = load(COPILOT_CATALOG)
    assert copilot["name"] == claude["name"] == PLUGIN
    assert [(p["name"], p["source"]) for p in claude["plugins"]] == [(PLUGIN, "./")]
    assert [(p["name"], p["source"]) for p in copilot["plugins"]] == [(PLUGIN, "./")]
    assert [(p["name"], p["source"]["path"]) for p in codex["plugins"]] == [(PLUGIN, "./")]
    assert (ROOT / "skills" / SKILL / "SKILL.md").is_file()
    copies = [
        p.relative_to(ROOT)
        for p in ROOT.rglob("SKILL.md")
        if SKILL in p.parts and "node_modules" not in p.parts and ".venv" not in p.parts
    ]
    assert copies == [Path("skills") / SKILL / "SKILL.md"], f"duplicate skill copies: {copies}"
    for manifest in ("plugin.json", ".claude-plugin/plugin.json"):
        # No manifest redirects the skill location: the default root `skills/` scan applies.
        assert "skills" not in load(Path(manifest))


def test_vsix_does_not_ship_the_plugin_manifests() -> None:
    """.vscodeignore keeps the manifests out of the extension package."""
    ignored = (ROOT / ".vscodeignore").read_text().split()
    for pattern in ("plugin.json", ".claude-plugin/**", ".agents/**"):
        assert pattern in ignored, pattern
