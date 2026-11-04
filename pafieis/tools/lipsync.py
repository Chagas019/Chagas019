#!/usr/bin/env python3
"""Gera os dados de sincronização labial a partir do áudio da voz.

Uso: python3 tools/lipsync.py public/audio/voz-apresentacao.mp3 src/episodes/apresentacao.lipsync.json

Para cada quadro (30 fps) calcula:
  o = abertura da boca (energia da voz, comprimida)
  w = largura (sons claros/agudos: "i", "e", "s")
  r = arredondamento (sons graves e abertos: "o", "u")
e lista os trechos de fala (segments) separados por pausas — use-os para ajustar
os tempos (cues) do roteiro do episódio.
"""
import json, subprocess, sys
import numpy as np

FPS = 30
SR = 16000


def main(src, dst):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = SR // FPS
    n = len(x) // hop
    win = np.hanning(hop * 2)
    freqs = np.fft.rfftfreq(hop * 2, 1 / SR)
    rms, cen = np.zeros(n), np.zeros(n)
    for i in range(n):
        seg = x[max(0, i * hop - hop // 2): i * hop + hop * 3 // 2]
        if len(seg) < hop * 2: seg = np.pad(seg, (0, hop * 2 - len(seg)))
        rms[i] = np.sqrt(np.mean(seg ** 2))
        sp = np.abs(np.fft.rfft(seg * win))
        band = (freqs > 150) & (freqs < 6000)
        cen[i] = (sp[band] * freqs[band]).sum() / (sp[band].sum() + 1e-9)
    ref = np.percentile(rms, 97)
    o = np.clip((rms / ref - 0.08) / 0.92, 0, 1) ** 0.7
    c = np.clip((cen - 900) / 2200, 0, 1)
    w = c
    r = np.clip(1 - c * 1.6, 0, 1) * (o > 0.25)
    # suavização assimétrica: abre rápido, fecha um pouco mais devagar
    def smooth(v, up=0.75, down=0.45):
        out, s = np.zeros_like(v), 0.0
        for i, a in enumerate(v):
            s += (up if a > s else down) * (a - s); out[i] = s
        return out
    o, w, r = smooth(o), smooth(w, 0.5, 0.5), smooth(r, 0.5, 0.4)
    # trechos de fala
    speaking = rms > ref * 0.08
    segs, start, i = [], None, 0
    while i < n:
        if speaking[i] and start is None: start = i
        if not speaking[i] and start is not None:
            j = i
            while j < n and not speaking[j]: j += 1
            if j - i >= 7 or j == n:
                segs.append([round(start / FPS, 2), round(i / FPS, 2)]); start = None
            i = j; continue
        i += 1
    if start is not None: segs.append([round(start / FPS, 2), round(n / FPS, 2)])
    data = {'fps': FPS, 'duration': round(n / FPS, 3), 'segments': segs,
            'o': [round(float(v), 3) for v in o], 'w': [round(float(v), 3) for v in w], 'r': [round(float(v), 3) for v in r]}
    json.dump(data, open(dst, 'w'))
    print('quadros:', n, '| trechos de fala:')
    for a, b in segs: print(f'  {a:6.2f} – {b:6.2f}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
