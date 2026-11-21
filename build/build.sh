#!/usr/bin/env bash
# build duang-bon.html จาก bazi-football.jsx — รันจากโฟลเดอร์ไหนก็ได้
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"
cd "$HERE"
[ -d node_modules ] || npm i --no-audit --no-fund >/dev/null
cp "$ROOT/bazi-football.jsx" app.jsx
# เลขรุ่น = แฮชของซอร์สทั้งหมด (ซอร์สเดิม build ซ้ำได้เลขเดิม) แอปใช้เช็คว่ามีรุ่นใหม่บน GitHub Pages หรือยัง
BUILD_ID=$(cat app.jsx entry.jsx in.css fonts.css tw.config.js assemble.py | sha1sum | cut -c1-12)
./node_modules/.bin/esbuild entry.jsx --bundle --loader:.jsx=jsx --minify \
  --format=iife --target=es2018 --define:__BUILD_ID__="\"$BUILD_ID\"" --outfile=bundle.js
./node_modules/.bin/tailwindcss -c tw.config.js -i in.css -o out.css --minify
cat out.css fonts.css > all.css
python3 -I assemble.py "$ROOT/duang-bon.html" all.css bundle.js
printf '{"build":"%s"}\n' "$BUILD_ID" > "$ROOT/version.json"
echo "built $ROOT/duang-bon.html ($BUILD_ID)"
