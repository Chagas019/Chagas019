"""Gera a narração do teaser V2 e mixa com a trilha.

1. (opcional) sintetiza cada fala com Piper:  --modelo caminho/pt_BR-faber-medium.onnx
2. trata a voz como locução (EQ, compressão, leve reverb de sala)
3. posiciona cada fala no frame definido em narracao/falas.json
4. abaixa a música sob a voz (ducking) e grava public/trilha-v2-narrada.wav

Uso:
  python3 scripts/gerar_narracao.py --modelo /caminho/pt_BR-faber-medium.onnx   # regenera as falas
  python3 scripts/gerar_narracao.py                                              # só remixa os brutos
"""
import argparse, json, os, subprocess, tempfile
import numpy as np

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("--modelo")
ap.add_argument("--falas", default="narracao/falas.json")
ap.add_argument("--musica", default="public/trilha-v2.wav")
ap.add_argument("--out", default="public/trilha-v2-narrada.wav")
ap.add_argument("--voz-db", type=float, default=3.0, help="ganho extra da voz em dB")
ap.add_argument("--duck-db", type=float, default=-11.0, help="quanto a música abaixa sob a voz")
a = ap.parse_args()

cfg = json.load(open(a.falas))
fps = 30

def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, **kw)

def read_wav(path):
    raw = run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

# 1. síntese
if a.modelo:
    for f in cfg["falas"]:
        run(["python3", "-m", "piper", "-m", a.modelo, "-f", f"narracao/brutos/{f['id']}.wav",
             "--length-scale", str(f.get("length", 0.92)), "--noise-scale", "0.6", "--sentence-silence", "0"],
            input=f["texto"].encode())

# 2. tratamento de locução (por fala)
chain = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
         "highpass=f=90,"
         "equalizer=f=220:t=q:w=1:g=2.5,"          # corpo
         "equalizer=f=3200:t=q:w=1.2:g=4,"         # presença
         "equalizer=f=9000:t=q:w=1:g=2,"           # ar
         "acompressor=threshold=-20dB:ratio=4:attack=4:release=80:makeup=6,"
         "aecho=0.8:0.5:28|46:0.18|0.10,"           # sala curta, sutil
         "alimiter=limit=0.9")
music = read_wav(a.musica)
n = len(music)
voice = np.zeros_like(music)
env = np.zeros(n, dtype=np.float32)
with tempfile.TemporaryDirectory() as td:
    for f in cfg["falas"]:
        src = f"narracao/brutos/{f['id']}.wav"
        dst = os.path.join(td, f["id"] + ".wav")
        run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", chain, "-ar", str(SR), "-ac", "2", dst])
        v = read_wav(dst)
        start = int(round(f["frame"] / fps * SR))
        end = min(n, start + len(v))
        voice[start:end] += v[: end - start]
        env[start:end] = 1.0

# normaliza a voz pelo pico de RMS das falas
rms = np.sqrt(np.mean(voice[env > 0] ** 2)) if env.any() else 1
voice *= (10 ** ((-17 + a.voz_db) / 20)) / max(rms, 1e-6)

# 3. ducking: envoltória suave (ataque 60 ms, soltura 250 ms)
att, rel = int(0.06 * SR), int(0.25 * SR)
sm = np.zeros_like(env)
k_a, k_r = 1 / att, 1 / rel
cur = 0.0
for i in range(n):  # rápido o suficiente para 24 s
    t = env[i]
    cur += (t - cur) * (k_a if t > cur else k_r)
    sm[i] = cur
gain = 10 ** (a.duck_db * sm / 20)
mix = music * gain[:, None] + voice

# 4. limitador final simples + normalização de pico a -1 dBFS
peak = np.max(np.abs(mix))
mix = mix / max(peak, 1e-6) * 10 ** (-1 / 20)
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes()
# loudness final -14 LUFS / -1 dBTP (padrão de redes sociais)
run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
     "-af", "loudnorm=I=-14:TP=-1.2:LRA=9", "-ar", str(SR), a.out], input=pcm)
print("ok:", a.out, f"{n / SR:.3f}s")
