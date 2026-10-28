#!/bin/zsh
# Render the demo fixture through the repo's headless visual harness (swaps in for fixture 70, then restores it).
set -e
ROOT=${0:A:h:h:h:h}
FIX=$ROOT/test/visual/fixtures/70-release-showcase.md
cp $FIX /tmp/.70-backup.md
trap 'cp /tmp/.70-backup.md $FIX' EXIT
cp $ROOT/demo-video/c/fixture/demo.md $FIX
cd $ROOT && npm run visual:render >/dev/null
ls $ROOT/out/reports/visual/pages/70-release-showcase--light--sticky-3--default.html
