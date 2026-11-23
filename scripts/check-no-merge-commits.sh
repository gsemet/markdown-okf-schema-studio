#!/usr/bin/env bash
# Fail when the commits of the branch (BASE..HEAD) include a merge commit.
# The repository merges by rebase only: a branch is updated by rebase, never by merge.
# Git only: no network, no forge API. Usage: check-no-merge-commits.sh [BASE] (default origin/main).
set -uo pipefail

base="${1:-origin/main}"
name="check-no-merge-commits"

fetch_hint="fetch the base and the full history: locally 'git fetch origin'; in CI, a full-history checkout ('fetch-depth: 0' in GitHub's actions/checkout, 'GIT_DEPTH: 0' on GitLab)"

if ! git rev-parse --verify --quiet "${base}^{commit}" >/dev/null; then
    echo "$name: the base '$base' does not resolve; $fetch_hint" >&2
    echo "$name: FAILED" >&2
    exit 1
fi

head="HEAD"
# The forge's test merge (GitHub refs/pull/<n>/merge, GitLab merged results) is not part of the branch:
# check the branch's real head instead. Only the tip is treated so; the first parent must be
# an ancestor of the base, so a merge of the base into the branch is never hidden.
if git rev-parse --verify --quiet "HEAD^2^{commit}" >/dev/null \
    && git merge-base --is-ancestor "HEAD^1" "$base"; then
    head="HEAD^2"
fi

if ! git merge-base "$base" "$head" >/dev/null 2>&1; then
    echo "$name: no common commit between '$base' and the branch; $fetch_hint" >&2
    echo "$name: FAILED" >&2
    exit 1
fi

merges="$(git rev-list --merges "$base..$head")"
if [ -z "$merges" ]; then
    count="$(git rev-list --count "$base..$head")"
    echo "$name: passed ($count commits since $base, no merge commit)"
    exit 0
fi

git log --merges --format='%h %s' "$base..$head" >&2
echo "The repository merges by rebase only, so a branch is updated by rebase, never by merge." >&2
echo "Remove the merge commits with a rebase (a plain git rebase linearizes them):" >&2
case "$base" in
    origin/*) echo "  git fetch origin && git rebase $base && git push --force-with-lease" >&2 ;;
    *) echo "  git rebase $base && git push --force-with-lease" >&2 ;;
esac
echo "$name: FAILED" >&2
exit 1
