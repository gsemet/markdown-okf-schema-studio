#!/usr/bin/env bash
# Fail when the commits of the branch (BASE..HEAD) include a merge commit.
# The repository merges by rebase only: a branch is updated by rebase, never by merge.
# The forge's test merge, single or chained (GitHub native stack), is not part of the branch and is
# peeled off first, under the conditions written at the walk below.
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
# The forge's test merge (GitHub refs/pull/<n>/merge, GitLab merged results): check the branch's real
# head, HEAD^2, instead. It is one merge, or a chain of them (a pull request in a native stack: one
# merge per branch below it, then its own), walked down the first parents. It is peeled only when:
# - the walk goes through two-parent merges to a first parent that is an ancestor of the base, so a
#   merge of the base into the branch is never hidden;
# - each lower second parent is an ancestor of the one above (nested branches);
# - in a chain of two or more, each merge has the forge's subject (a single one may have any subject).
# Otherwise every merge in BASE..HEAD is reported.
forge_subject='^Merge [0-9a-f]{40} into [0-9a-f]{40}$'
merge="HEAD"
upper=""         # the second parent of the merge above, empty at the tip
other_subject="" # set once a merge of the walk lacks the forge's subject
while git rev-parse --verify --quiet "$merge^2^{commit}" >/dev/null \
    && ! git rev-parse --verify --quiet "$merge^3^{commit}" >/dev/null; do
    branch="$(git rev-parse "$merge^2")"
    if [ -n "$upper" ] && ! git merge-base --is-ancestor "$branch" "$upper"; then
        break
    fi
    [[ "$(git log -1 --format=%s "$merge")" =~ $forge_subject ]] || other_subject="yes"
    if git merge-base --is-ancestor "$merge^1" "$base"; then
        if [ -z "$upper" ] || [ -z "$other_subject" ]; then
            head="HEAD^2"
        fi
        break
    fi
    upper="$branch"
    merge="$(git rev-parse "$merge^1")"
done

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
