#!/bin/bash
# 클립보드의 이미지를 PNG 파일로 저장한다 (macOS 전용, 설치 불필요).
#
#   scripts/save-clipboard-image.sh cucumber          → assets/veg/cucumber.png
#   scripts/save-clipboard-image.sh /경로/아무거나.png  → 그 경로로
#
# 용도: Gemini 웹의 "이미지 복사" 버튼으로 복사한 도판을 원본 폴더에 모을 때.
# 도판 작업은 1회성 로컬 작업이라 CI가 없다 (스펙 §7).
set -euo pipefail

[ $# -eq 1 ] || { echo "사용법: $0 <이름|경로>" >&2; exit 1; }

case "$1" in
  /*) OUT="$1" ;;
  *.png) OUT="$PWD/$1" ;;
  *) OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/veg/$1.png" ;;
esac

mkdir -p "$(dirname "$OUT")"

# 클립보드에 이미지가 없으면 조용히 빈 파일을 만들지 않고 실패한다.
osascript -e 'set thePic to (the clipboard as «class PNGf»)' \
          -e "set f to open for access POSIX file \"$OUT\" with write permission" \
          -e 'set eof f to 0' \
          -e 'write thePic to f' \
          -e 'close access f' >/dev/null 2>&1 || {
  echo "클립보드에 이미지가 없다 (Gemini에서 '이미지 복사'를 먼저 누르세요)" >&2
  rm -f "$OUT"
  exit 1
}

SIZE=$(stat -f%z "$OUT")
[ "$SIZE" -gt 1000 ] || { echo "저장은 됐지만 파일이 너무 작다 ($SIZE bytes) — 확인 필요" >&2; exit 1; }
echo "$OUT  $((SIZE / 1024))KB"
