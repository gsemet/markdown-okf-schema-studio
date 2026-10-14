#!/usr/bin/env bash
# Builds the disposable QA workspace: copies of real corpora plus synthetic edge cases.
# Never point the campaign at the original files.
#
# Environment:
#   QA_ROOT         default: <repo>/output/qa/markdown-studio-claude
#   OKF_SCHEMA_DIR  default: ~/Projects/DevTools/okf-schema (skipped when missing)
#   VAULT_DIR       optional Obsidian vault; only *.md files are copied. Private content:
#                   never copy its screenshots into the repository.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill="$(cd "$here/.." && pwd)"
repo="$(cd "$here/../../../.." && pwd)"
qa_root="${QA_ROOT:-$repo/output/qa/markdown-studio-claude}"
ws="$qa_root/ws"
okf="${OKF_SCHEMA_DIR:-$HOME/Projects/DevTools/okf-schema}"

# --clone NAME: copy the built workspace to ws-NAME, so parallel charters never edit the same files.
if [[ "${1:-}" == "--clone" ]]; then
  name="${2:?usage: setup-workspace.sh --clone NAME}"
  [[ -d "$ws" ]] || { echo "Build the workspace first: setup-workspace.sh" >&2; exit 1; }
  rm -rf "$qa_root/ws-$name"
  rsync -a "$ws/" "$qa_root/ws-$name/"
  echo "Workspace clone ready: $qa_root/ws-$name"
  exit 0
fi
if [[ -e "$ws" && "${1:-}" != "--force" ]]; then
  echo "Workspace exists: $ws (pass --force to rebuild)" >&2
  exit 1
fi
rm -rf "$ws"
mkdir -p "$ws"

rsync -a --exclude '_build' "$repo/book/" "$ws/book/"
rsync -a "$repo/test/visual/fixtures/" "$ws/fixtures-visual/"
rsync -a "$repo/.agents/skills/markdown-studio-exploratory-qa/assets/fixtures/" "$ws/fixtures-qa/" 2>/dev/null || true
rsync -a "$skill/assets/synth/" "$ws/synth/"
if [[ -d "$okf/examples" ]]; then
  rsync -a "$okf/examples/" "$ws/okf/"
  rsync -a "$okf/src/okf_schema/data/kb/" "$ws/okf/kb-template/"
fi
if [[ -n "${VAULT_DIR:-}" && -d "$VAULT_DIR" ]]; then
  rsync -a --include='*/' --include='*.md' --exclude='*' --exclude='.git/' --exclude='.obsidian/' \
    "$VAULT_DIR/" "$ws/vault/"
fi
# CRLF variant generated at setup time so Git attributes cannot normalise it.
if [[ -f "$ws/synth/crlf-source.md" ]]; then
  perl -pe 's/\n/\r\n/' "$ws/synth/crlf-source.md" > "$ws/synth/crlf.md"
  rm "$ws/synth/crlf-source.md"
fi
# A Git root makes project-relative x-okf-link resolution behave like a real repository.
git -C "$ws" init -q
echo "Workspace ready: $ws ($(find "$ws" -name '*.md' | wc -l | tr -d ' ') Markdown files)"
