#!/bin/zsh
# Regenerates the S1 take 2 deliverables (needs the local-campaign lock, a built .vsix, ffmpeg, a venv with
# pillow + numpy at $S_SCRATCH/venv). Run in the foreground. Usage: run.sh [path-to.vsix]
set -e
here=${0:A:h}; export S_SCRATCH=${S_SCRATCH:-/private/tmp/claude-502/cr170-s}; PY=$S_SCRATCH/venv/bin/python
cd $here
# horizontal: 1440x705 pt window, source 40 %, preview 130 % in Auto width
VARIANT=h ./restart.sh ${1:-}; VARIANT=h node prep.mjs; VARIANT=h node record.mjs
$PY compose.py $S_SCRATCH/take $S_SCRATCH/out/h
# vertical: portrait 900x1350 viewport, raw pass, then preview pass at 160 % Full width
VARIANT=v ./restart.sh ${1:-}; VARIANT=v PASS=raw node record-v.mjs; VARIANT=v node prep.mjs; VARIANT=v PASS=preview node record-v.mjs
$PY compose_v.py $S_SCRATCH/take-v-raw $S_SCRATCH/take-v $S_SCRATCH/out/v
pkill -f "$S_SCRATCH/vscode-user" || true
mkdir -p h v
\cp $S_SCRATCH/out/h/{s1-h.mp4,s1-h.srt,cover.png} h/; \cp $S_SCRATCH/out/v/{s1-v.mp4,s1-v.srt} v/; \cp $S_SCRATCH/out/v/cover-v.png v/cover.png
$PY deliver.py h v
