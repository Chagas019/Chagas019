#!/usr/bin/env bash
# Gera os SFX cinematográficos (whoosh_suave, impacto_suave, riser_luz, brilho, respiro). Dono: agente SOM.
# Determinístico: síntese em Node com seeds fixas + ffmpeg (reverb por convolução, normalização).
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/gerar-sfx-cinema.mjs
