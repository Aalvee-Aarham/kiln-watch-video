#!/usr/bin/env bash
# usage: tools/snap.sh 12.5 14 ...  -> snapshots/at-<t>.png
cd "$(dirname "$0")/.." && mkdir -p snapshots
for t in "$@"; do
  npx hyperframes snapshot --at "$t" --no-end -o "snapshots/_tmp" >/dev/null 2>&1
  mv -f snapshots/_tmp/frame-00-at-*.png "snapshots/at-$t.png" 2>/dev/null || echo "snapshot failed at $t"
done
rm -rf snapshots/_tmp snapshots/s1
