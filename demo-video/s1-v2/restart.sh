#!/bin/zsh
# Rebuild the clean profile and relaunch the throwaway window. VARIANT=h|v.
here=${0:A:h}; S=${S_SCRATCH:-/private/tmp/claude-502/cr170-s}
pkill -f "$S/vscode-user" 2>/dev/null; sleep 4; pkill -9 -f "$S/vscode-user" 2>/dev/null; sleep 2
node $here/setup.mjs ${1:-} 2>&1 | grep -v -i deprecat
node $here/launch.mjs
for i in {1..40}; do curl -s -m 1 http://127.0.0.1:9344/json/version >/dev/null 2>&1 && break; sleep 1; done
sleep 8
