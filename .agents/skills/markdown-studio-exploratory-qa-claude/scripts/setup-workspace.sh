#!/usr/bin/env bash
# Builds the disposable QA workspace: copies of real corpora plus synthetic edge cases.
# Never point the campaign at the original files.
#
# Environment (every corpus is a parameter; a missing source is skipped with a message):
#   QA_ROOT         output root. Default: <repo>/output/qa/markdown-studio-claude
#   BOOK_DIR        book to copy to ws/book. Default: ~/Projects/Nestor/agentic-coding-white-paper/book
#                   when it exists. Set BOOK_DIR="" to skip it.
#   VISUAL_DIR      visual fixtures -> ws/fixtures-visual. Default: <repo>/test/visual/fixtures
#   DOCS_DIR        project docs -> ws/docs. Default: <repo>/docs
#   SYNTH_DIR       synthetic edge cases -> ws/synth. Default: the skill's assets/synth
#   FIXTURES_QA_DIR extra fixtures -> ws/fixtures-qa. Default: the sibling QA skill's assets/fixtures
#   VAULT_DIR       optional Obsidian vault -> ws/vault; only *.md files are copied, and only when
#                   set. Private content: never copy its screenshots into the repository.
# okf-schema is never copied. Usage: setup-workspace.sh [--force | --clone NAME]
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill="$(cd "$here/.." && pwd)"
repo="$(cd "$here/../../../.." && pwd)"
qa_root="${QA_ROOT:-$repo/output/qa/markdown-studio-claude}"
ws="$qa_root/ws"
book_dir="${BOOK_DIR-$HOME/Projects/Nestor/agentic-coding-white-paper/book}"
visual_dir="${VISUAL_DIR:-$repo/test/visual/fixtures}"
docs_dir="${DOCS_DIR:-$repo/docs}"
synth_dir="${SYNTH_DIR:-$skill/assets/synth}"
fixtures_qa_dir="${FIXTURES_QA_DIR:-$repo/.agents/skills/markdown-studio-exploratory-qa/assets/fixtures}"

# copy_corpus LABEL SRC DEST [rsync args]: copies when SRC is a directory, else says it is skipped.
copy_corpus() {
  local label="$1" src="$2" dest="$3"; shift 3
  if [[ -n "$src" && -d "$src" ]]; then
    rsync -a "$@" "$src/" "$ws/$dest/"
    echo "  $label: $src -> $dest/"
  else
    echo "  $label: skipped (${src:-not set}${src:+ not found})"
  fi
}

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

echo "Corpora:"
copy_corpus book "$book_dir" book --exclude '_build'
copy_corpus visual "$visual_dir" fixtures-visual
copy_corpus docs "$docs_dir" docs
copy_corpus fixtures-qa "$fixtures_qa_dir" fixtures-qa
copy_corpus synth "$synth_dir" synth
copy_corpus vault "${VAULT_DIR:-}" vault --exclude='.git/' --exclude='.obsidian/' --include='*/' --include='*.md' --exclude='*' --prune-empty-dirs
# CRLF variant generated at setup time so Git attributes cannot normalise it.
if [[ -f "$ws/synth/crlf-source.md" ]]; then
  perl -pe 's/\n/\r\n/' "$ws/synth/crlf-source.md" > "$ws/synth/crlf.md"
  rm "$ws/synth/crlf-source.md"
fi
# A Git root makes project-relative x-okf-link resolution behave like a real repository.
git -C "$ws" init -q
echo "Workspace ready: $ws ($(find "$ws" -name '*.md' | wc -l | tr -d ' ') Markdown files)"
