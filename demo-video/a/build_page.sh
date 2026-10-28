#!/usr/bin/env bash
# Renders the three states of demo-video/a/demo.md with the repo's visual harness:
#   v0 = before any edit, v1 = after the bold sentence, v2 = after the inserted tip admonition.
# The pages are written to demo-video/a/build/. The harness fixture "70-release-showcase" is swapped
# temporarily (and enabled for review comments) and restored on exit; nothing else in the repo changes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
trap 'git checkout -- test/visual/fixtures/70-release-showcase.md test/visual/releaseShowcaseScenarios.ts' EXIT
python3 - <<'PY'
import pathlib
p = pathlib.Path("test/visual/releaseShowcaseScenarios.ts")
p.write_text(p.read_text().replace('    scroll: { kind: "top" as const },', '    scroll: { kind: "top" as const },\n    render: { commentsEnabled: true as const },', 1))
v2 = pathlib.Path("demo-video/a/demo.md").read_text()
tip = "\n:::{tip}\nStart charging while the inspection is still running.\n:::\n"
v1 = v2.replace(tip, "", 1)
v0 = v1.replace(" We saved **27 minutes** per vehicle.", "", 1)
assert v0 != v1 != v2
build = pathlib.Path("demo-video/a/build")
import shutil; shutil.rmtree(build, ignore_errors=True); build.mkdir()
for name, text in (("v0", v0), ("v1", v1), ("v2", v2)):
    (build / f"{name}.md").write_text(text)
PY
npm run compile >/dev/null && npm run bundle >/dev/null
for v in v0 v1 v2; do
  cp "demo-video/a/build/$v.md" test/visual/fixtures/70-release-showcase.md
  node --import ./scripts/register-myst-patches.mjs out/test/visual/renderFixtures.js >/dev/null
  cp out/reports/visual/pages/70-release-showcase--light--*.html "demo-video/a/build/$v.html"
done
ls demo-video/a/build
