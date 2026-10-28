#!/bin/zsh
# Rebuild the clean profile, launch the throwaway VS Code window, record the storyboard.
set -e
here=${0:A:h}; S=${B_SCRATCH:-/private/tmp/claude-502/cr170-b}
pkill -f "$S/vscode-user" 2>/dev/null || true
for i in {1..10}; do pgrep -f "$S/vscode-user" >/dev/null || break; sleep 1; done
pkill -9 -f "$S/vscode-user" 2>/dev/null || true
sleep 2
node $here/setup.mjs ${1:-} 2>&1 | grep -v -i deprecat || true
node $here/launch.mjs
for i in {1..40}; do curl -s -m 1 http://127.0.0.1:9333/json/version >/dev/null 2>&1 && break; sleep 1; done
sleep 8
node $here/record.mjs
pkill -f "$S/vscode-user" 2>/dev/null || true
