#!/usr/bin/env bash
# สร้างแอป Android (duangbon.apk) โดยไม่ต้องลง Android SDK
#   ใช้:  bash android/build-apk.sh        → ได้ไฟล์ duangbon.apk ที่โฟลเดอร์บนสุดของ repo
# แอปเปิดหน้าเว็บล่าสุดจาก GitHub Pages เอง ปกติจึงไม่ต้องสร้างใหม่
# สร้างใหม่เฉพาะตอนแก้โค้ด Android (android/) หรืออยากอัพเดทสำเนาออฟไลน์ที่ฝังในแอป
# ลงชื่อด้วยกุญแจ debug ของ uber-apk-signer ซึ่งเหมือนกันทุกเครื่อง ลงทับของเดิมได้โดยไม่ต้องลบ
# ต้องมี: java + javac (8 ขึ้นไป), curl, zip, unzip
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
T=${DUANG_APK_TOOLS:-$HOME/.cache/duang-apk-tools}
mkdir -p "$T"

get() {  # get <url> <ไฟล์>
  [ -s "$T/$2" ] || curl -sSfL --retry 2 -o "$T/$2" "$1"
}
get https://github.com/iBotPeaches/Apktool/releases/download/v2.10.0/apktool_2.10.0.jar apktool.jar
get https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar signer.jar
get https://raw.githubusercontent.com/Sable/android-platforms/master/android-34/android.jar android.jar
if ! ls "$T"/dex-tools/*/lib/dx-*.jar >/dev/null 2>&1; then
  get https://github.com/pxb1988/dex2jar/releases/download/v2.4/dex-tools-v2.4.zip dex-tools.zip
  rm -rf "$T/dex-tools"; mkdir -p "$T/dex-tools"; unzip -q -o "$T/dex-tools.zip" -d "$T/dex-tools"
fi
DX=$(ls "$T"/dex-tools/*/lib/dx-*.jar | head -1)

W=$(mktemp -d)
trap 'rm -rf "$W"' EXIT

# 1) โค้ด Java → class → dex
mkdir -p "$W/classes"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 \
  -bootclasspath "$T/android.jar" -d "$W/classes" $(find "$ROOT/android/src" -name '*.java')
java -cp "$DX" com.android.dx.command.Main --dex --min-sdk-version=24 \
  --output="$W/classes.dex" "$W/classes"

# 2) manifest + resources + สำเนาแอปที่ฝังไว้ใช้ตอนออฟไลน์
mkdir -p "$W/app/assets"
cp "$ROOT/android/AndroidManifest.xml" "$ROOT/android/apktool.yml" "$W/app/"
cp -r "$ROOT/android/res" "$W/app/res"
cp "$ROOT/duang-bon.html" "$W/app/assets/index.html"
java -jar "$T/apktool.jar" b -q "$W/app" -o "$W/unsigned.apk"
(cd "$W" && zip -q -X unsigned.apk classes.dex)

# 3) zipalign + ลงชื่อ v2/v3 แล้วตรวจลายเซ็น
java -jar "$T/signer.jar" -a "$W/unsigned.apk" -o "$W/out" >/dev/null
OUT=$(ls "$W"/out/*.apk | head -1)
java -jar "$T/signer.jar" -a "$OUT" --onlyVerify | grep -E "VERIFY|signature|Errors" | head -5 || true
cp "$OUT" "$ROOT/duangbon.apk"
echo "สร้างแล้ว: $ROOT/duangbon.apk ($(du -h "$ROOT/duangbon.apk" | cut -f1))"
