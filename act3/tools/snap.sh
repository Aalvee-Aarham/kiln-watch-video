#!/usr/bin/env bash
# usage: tools/snap.sh <outdir> 12.5,14,...   (calls the CLI through node so commas survive Windows' cmd shim)
cd "$(dirname "$0")/.."
HF=$(ls -d ~/AppData/Local/npm-cache/_npx/*/node_modules/hyperframes 2>/dev/null | head -1)
node "$HF/bin/hyperframes.mjs" snapshot --at "$2" --no-end --timeout 60000 -o "snapshots/$1" 2>&1 | grep -E "Capturing|saved|rror|⚠"
