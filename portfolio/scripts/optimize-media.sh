#!/usr/bin/env bash
# optimize-media.sh — gera variantes responsivas (WebP/AVIF 640/1280/1920) e
# poster frames de vídeos em portfolio/media/, sem tocar nos originais.
# Também escreve portfolio/media/manifest.json (src original → variantes).
#
# Uso (a partir de qualquer pasta):  bash portfolio/scripts/optimize-media.sh [arquivos...]
# Sem argumentos processa: videos/ resultado/ midia/ fotos/ (jpg, jpeg, png, webp, mp4, mov, webm)
# Requer: ffmpeg + ffprobe (libwebp, libaom-av1). Não amplia imagens menores que a largura alvo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTFOLIO="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$PORTFOLIO/.." && pwd)"
OUT="$PORTFOLIO/media"
WIDTHS=(640 1280 1920)
WEBP_Q="${WEBP_Q:-78}"
AVIF_CRF="${AVIF_CRF:-34}"
FORCE="${FORCE:-0}"

command -v ffmpeg >/dev/null || { echo "ffmpeg não encontrado" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe não encontrado" >&2; exit 1; }
HAS_AVIF=1
ENCODERS="$(ffmpeg -hide_banner -encoders 2>/dev/null || true)"
[[ "$ENCODERS" == *libaom-av1* ]] || { HAS_AVIF=0; echo "aviso: libaom-av1 ausente, AVIF ignorado" >&2; }

mkdir -p "$OUT"
cd "$ROOT"

if [ "$#" -gt 0 ]; then FILES=("$@"); else
  mapfile -t FILES < <(find videos resultado midia fotos -maxdepth 1 -type f \
    \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.webm' \) 2>/dev/null | sort)
fi

dims() { ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$1" | head -1; }
need() { [ "$FORCE" = 1 ] || [ ! -s "$1" ] || [ "$2" -nt "$1" ]; }

ENTRIES=()
for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "pulando (não existe): $f" >&2; continue; }
  dir="$(dirname "$f")"; base="$(basename "${f%.*}")"
  slug="$(echo "${dir}-${base}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//')"
  ext="${f##*.}"; ext="${ext,,}"
  src_rel="../$f"   # relativo a portfolio/index.html
  img_in="$f"; poster_json=""; kind="image"

  if [[ "$ext" =~ ^(mp4|mov|webm)$ ]]; then
    kind="video"
    dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | cut -d. -f1)"; dur="${dur:-2}"
    t=$(( dur > 3 ? 1 : 0 ))
    poster="$OUT/$slug-poster.jpg"
    if need "$poster" "$f"; then
      echo "poster  $f"
      ffmpeg -v error -y -ss "$t" -i "$f" -frames:v 1 -q:v 3 "$poster"
    fi
    img_in="$poster"
    poster_json="\"poster\":\"media/$slug-poster.jpg\","
  fi

  wh="$(dims "$img_in")"; w="${wh%x*}"; h="${wh#*x}"
  vars=()
  targets=()
  for tw in "${WIDTHS[@]}"; do [ "$tw" -lt "$w" ] && targets+=("$tw"); done
  # inclui a largura original quando menor que o maior alvo (sem upscale)
  [ "$w" -lt "${WIDTHS[-1]}" ] && targets+=("$w")
  [ "${#targets[@]}" -eq 0 ] && targets=("$w")
  for tw in "${targets[@]}"; do
    th=$(( (h * tw / w) / 2 * 2 ))
    for fmt in webp avif; do
      [ "$fmt" = avif ] && [ "$HAS_AVIF" = 0 ] && continue
      o="$OUT/$slug-$tw.$fmt"
      if need "$o" "$img_in"; then
        echo "$fmt  $tw  $f"
        if [ "$fmt" = webp ]; then
          ffmpeg -v error -y -i "$img_in" -vf "scale=$tw:-2:flags=lanczos" -c:v libwebp -quality "$WEBP_Q" "$o"
        else
          ffmpeg -v error -y -i "$img_in" -vf "scale=$tw:-2:flags=lanczos,format=yuv420p" -c:v libaom-av1 -still-picture 1 -crf "$AVIF_CRF" -cpu-used 6 "$o"
        fi
      fi
      vars+=("{\"format\":\"$fmt\",\"w\":$tw,\"h\":$th,\"src\":\"media/$slug-$tw.$fmt\"}")
    done
  done
  joined="$(IFS=,; echo "${vars[*]}")"
  ENTRIES+=("\"$src_rel\":{\"type\":\"$kind\",\"w\":$w,\"h\":$h,${poster_json}\"variants\":[${joined}]}")
done

{
  echo "{"
  echo "\"_generated\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "\"_note\":\"Gerado por scripts/optimize-media.sh. Chaves = src usado no portfolio.json (relativo a portfolio/index.html). Não edite à mão.\","
  echo "\"items\":{"
  for i in "${!ENTRIES[@]}"; do
    sep=","; [ "$i" -eq $(( ${#ENTRIES[@]} - 1 )) ] && sep=""
    echo "  ${ENTRIES[$i]}$sep"
  done
  echo "}}"
} > "$OUT/manifest.json"

if command -v python3 >/dev/null; then python3 -c "import json,sys;print(json.dumps(json.load(open(sys.argv[1])),indent=2,ensure_ascii=False))" "$OUT/manifest.json" > "$OUT/manifest.tmp" && mv "$OUT/manifest.tmp" "$OUT/manifest.json"; fi
echo "ok: $(ls "$OUT" | wc -l) arquivos em $OUT"
