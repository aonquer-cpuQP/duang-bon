#!/usr/bin/env bash
# build duang-bon.html จาก bazi-football.jsx — รันจากโฟลเดอร์ไหนก็ได้
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"
cd "$HERE"
[ -d node_modules ] || npm i --no-audit --no-fund >/dev/null
cp "$ROOT/bazi-football.jsx" app.jsx
./node_modules/.bin/esbuild entry.jsx --bundle --loader:.jsx=jsx --minify \
  --format=iife --target=es2018 --outfile=bundle.js
./node_modules/.bin/tailwindcss -c tw.config.js -i in.css -o out.css --minify
cat out.css fonts.css > all.css
python3 -I assemble.py "$ROOT/duang-bon.html" all.css bundle.js
echo "built $ROOT/duang-bon.html"
