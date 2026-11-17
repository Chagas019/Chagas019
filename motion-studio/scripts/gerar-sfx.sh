#!/usr/bin/env bash
# Gera a biblioteca base de SFX de forma determinística (seed fixa). Dono: agente SOM.
set -euo pipefail
cd "$(dirname "$0")/../public/audio/sfx"
F="-y -loglevel error"
O="-ar 48000 -ac 2"
# whoosh: ruído rosa com varredura de passa-banda + envelope em sino (0,6s)
ffmpeg $F -f lavfi -i "anoisesrc=color=pink:seed=42:duration=0.6:amplitude=0.9:sample_rate=48000" \
  -af "bandpass=f=1200:width_type=o:w=2,volume='sin(PI*t/0.6)':eval=frame,highpass=f=200,lowpass=f=6000,afade=t=in:d=0.05,afade=t=out:st=0.45:d=0.15,loudnorm=I=-18:TP=-2" $O whoosh.wav
# pop: seno com queda de pitch rápida (0,12s)
ffmpeg $F -f lavfi -i "aevalsrc='sin(2*PI*(900-5000*t)*t)*exp(-28*t)':d=0.12" -af "loudnorm=I=-20:TP=-2" $O pop.wav
# click: transiente curto (0,04s)
ffmpeg $F -f lavfi -i "aevalsrc='sin(2*PI*2400*t)*exp(-180*t)':d=0.04" -af "volume=0.8" $O click.wav
# notificação: dois tons ascendentes (0,45s)
ffmpeg $F -f lavfi -i "aevalsrc='(sin(2*PI*880*t)*lt(t\,0.18)+sin(2*PI*1320*t)*gte(t\,0.15))*exp(-6*t)':d=0.45" -af "loudnorm=I=-20:TP=-2" $O notificacao.wav
# impacto: sub grave + ruído curto (0,5s)
ffmpeg $F -f lavfi -i "aevalsrc='sin(2*PI*(70-40*t)*t)*exp(-7*t)':d=0.5" -af "loudnorm=I=-18:TP=-1.5" $O impacto.wav
ls -la
