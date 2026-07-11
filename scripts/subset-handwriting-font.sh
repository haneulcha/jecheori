#!/usr/bin/env bash
# 손글씨 폰트(나눔손글씨 펜, OFL) 서브셋 재생성.
#
# 카드 하단 "제철이의 한마디"(whyNow)는 손글씨체로 적힌다. 전체 한글(11,172자,
# woff2 ~574KB)을 싣는 대신 public/data/produce.json 에 실제로 쓰인 글자만 골라
# 서브셋한다(현재 ~54KB). 가격이 CI JSON에서 오듯, 이 폰트도 콘텐츠(produce.json)를
# 진실의 원천으로 삼아 파생된다.
#
# whyNow·name·kind 문구를 고쳐 새 음절이 들어오면 이 스크립트를 다시 돌린다.
# (안 돌리면 그 글자만 시스템 폰트로 폴백돼 손글씨 사이에 튄다.)
#
# 사전 요구: Python + fonttools + brotli  →  python3 -m pip install fonttools brotli
# 실행:      bash scripts/subset-handwriting-font.sh

set -euo pipefail
cd "$(dirname "$0")/.."

SRC_TTF="$(mktemp -d)/NanumPenScript-Regular.ttf"
OUT="src/fonts/NanumPenScript-Regular.woff2"
TTF_URL="https://github.com/google/fonts/raw/main/ofl/nanumpenscript/NanumPenScript-Regular.ttf"

echo "· 원본 TTF 내려받기 (OFL)…"
curl -sL "$TTF_URL" -o "$SRC_TTF"

echo "· produce.json 에서 사용 글자 추출…"
CHARS_FILE="$(mktemp)"
python3 - "$CHARS_FILE" <<'PY'
import json, sys
data = json.load(open('public/data/produce.json'))
items = data if isinstance(data, list) else next(v for v in data.values() if isinstance(v, list))
chars = set()
for p in items:
    chars.update(p.get('name', ''))
    chars.update(p.get('kind', ''))
    for line in p.get('whyNow', {}).values():
        chars.update(line)
# 여백: 숫자·문장부호(카피 편집 중 흔히 쓰는 것들)
chars.update("0123456789 .,·–—…“”‘’()~%/")
open(sys.argv[1], 'w').write(''.join(sorted(chars)))
PY

echo "· 서브셋 + woff2 압축…"
pyftsubset "$SRC_TTF" \
  --text-file="$CHARS_FILE" \
  --layout-features='*' --flavor=woff2 --desubroutinize \
  --output-file="$OUT"

printf '· 완료: %s (%d KB)\n' "$OUT" "$(( $(wc -c <"$OUT") / 1024 ))"
