"""Gera a trilha instrumental do vídeo (audio/trilha.wav), só com NumPy.

Piano suave + cama de cordas, crescendo até a revelação da 10ª edição e
abrindo para um final esperançoso. Os tempos batem com config.js:
- 0 a 11 s: começo delicado (piano sozinho, poucas notas)
- 11 a 23 s: a história cresce (entra a cama de cordas e um pulso leve)
- 23 a 29 s: subida de expectativa até a revelação
- 29 s: impacto suave na revelação da 10ª Gincana
- 29 a 58 s: tema completo, que vai se acalmando até o fim

Uso: python3 trilha.py   (troque por uma música licenciada, se preferir)
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
DUR = 58.0
BPM = 72
BEAT = 60 / BPM
REVELACAO = 29.1

rng = np.random.default_rng(2027)
t_total = int(SR * DUR)
mix_l = np.zeros(t_total)
mix_r = np.zeros(t_total)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= t_total:
        return
    sig = sig[: t_total - i] * gain
    mix_l[i : i + len(sig)] += sig * np.cos((pan + 1) * np.pi / 4)
    mix_r[i : i + len(sig)] += sig * np.sin((pan + 1) * np.pi / 4)


def piano(midi, length=3.5, vel=0.5):
    n = int(SR * length)
    t = np.arange(n) / SR
    f = hz(midi)
    out = np.zeros(n)
    # Harmônicos levemente desafinados, os agudos morrem mais rápido (som de piano abafado).
    for k, amp in enumerate([1.0, 0.42, 0.2, 0.09, 0.05], start=1):
        detune = 1 + 0.0004 * k * k
        out += amp * np.sin(2 * np.pi * f * k * detune * t) * np.exp(-t * (1.1 + 0.9 * k))
    attack = np.minimum(1, t / 0.006)
    release = np.minimum(1, (length - t) / 0.4)
    return out * attack * release * vel * 0.32


def pad(midis, length, vel=0.5, brilho=0.0):
    n = int(SR * length)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in midis:
        f = hz(m)
        for d in (-0.07, 0.0, 0.07):  # três vozes levemente desafinadas = coro de cordas
            ph = rng.uniform(0, 2 * np.pi)
            fd = f * 2 ** (d / 12)
            out += np.sin(2 * np.pi * fd * t + ph) + (0.18 + brilho) * np.sin(4 * np.pi * fd * t + ph)
    vib = 1 + 0.15 * np.sin(2 * np.pi * 0.23 * t)
    env = np.minimum(1, t / 1.6) * np.minimum(1, (length - t) / 1.8)
    return out * env * vib * vel * 0.03


# Progressão: C  G/B  Am  F  (I V vi IV), tom esperançoso
acordes = [
    ([48, 55, 60, 64], [72, 76, 79]),
    ([47, 55, 59, 62], [71, 74, 79]),
    ([45, 52, 57, 60], [69, 72, 76]),
    ([41, 48, 53, 57], [69, 72, 77]),
]
compasso = 4 * BEAT  # 3,33 s

# 1) Piano ao longo de todo o vídeo
t = 0.4
idx = 0
while t < DUR - 3:
    graves, agudos = acordes[idx % 4]
    fase = "inicio" if t < 11 else ("cresce" if t < REVELACAO else "tema")
    vel = 0.35 if fase == "inicio" else (0.45 if fase == "cresce" else 0.55)
    if t > 50:
        vel *= max(0.35, 1 - (t - 50) / 8)
    add(piano(graves[0], 5, vel * 0.9), t, pan=-0.2)
    notas = agudos if fase == "inicio" else agudos + [agudos[1] + 12]
    passo = BEAT if fase == "inicio" else BEAT / 2
    for j in range(int(compasso / passo)):
        m = notas[j % len(notas)]
        if fase == "inicio" and j % 2:
            continue
        add(piano(m, 3, vel * (0.7 + 0.25 * rng.random())), t + j * passo + rng.normal(0, 0.006), pan=0.25)
    t += compasso
    idx += 1

# 2) Cama de cordas: entra no crescimento e fica até o fim
t = 11.0 - compasso / 2
idx = 3
while t < DUR:
    graves, agudos = acordes[idx % 4]
    vel = 0.6 if t < REVELACAO else 0.95
    if t > 48:
        vel *= max(0.3, 1 - (t - 48) / 10)
    add(pad(graves[1:] + [agudos[0]], compasso + 1.8, vel, 0.1 if t > REVELACAO else 0), t)
    t += compasso
    idx += 1

# 3) Pulso grave leve (como um coração) no crescimento
t = 11.0
while t < REVELACAO - 0.3:
    n = int(SR * 0.5)
    tt = np.arange(n) / SR
    kick = np.sin(2 * np.pi * (48 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9)
    add(kick * 0.22 * min(1, (t - 10) / 8), t)
    t += BEAT

# 4) Subida até a revelação (ruído filtrado que abre) e impacto suave
n = int(SR * 6)
tt = np.arange(n) / SR
ruido = rng.normal(0, 1, n)
# filtro passa-baixa simples que vai abrindo
cut = 0.01 + 0.25 * (tt / 6) ** 2
filtrado = np.zeros(n)
acc = 0.0
for i in range(n):
    acc += cut[i] * (ruido[i] - acc)
    filtrado[i] = acc
add(filtrado * (tt / 6) ** 2.5 * 0.35, REVELACAO - 6)

n = int(SR * 4)
tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-tt * 12)) * tt) * np.exp(-tt * 1.6)
brilho = sum(np.sin(2 * np.pi * hz(m) * tt) for m in (84, 88, 91, 96)) * np.exp(-tt * 1.2) * 0.05
add(boom * 0.55 + brilho, REVELACAO)

# 5) Reverb simples (vários ecos difusos) e masterização
def reverb(x):
    out = x.copy()
    for d, g in [(0.029, 0.32), (0.037, 0.28), (0.041, 0.25), (0.053, 0.2), (0.071, 0.16), (0.089, 0.12)]:
        k = int(d * SR)
        y = np.zeros_like(x)
        for rep in range(1, 7):
            o = k * rep
            if o >= len(x):
                break
            y[o:] += x[:-o] * g ** rep * 1.8
        out += y * 0.5
    return out


mix_l = reverb(mix_l)
mix_r = reverb(np.roll(mix_r, int(0.011 * SR)))
st = np.stack([mix_l, mix_r], axis=1)
fade = np.minimum(1, np.arange(t_total) / (SR * 0.8)) * np.minimum(1, (t_total - np.arange(t_total)) / (SR * 3.5))
st *= fade[:, None]
st /= np.max(np.abs(st)) * 1.12
st = np.tanh(st * 1.1) / np.tanh(1.1)

saida = Path(__file__).with_name("audio") / "trilha.wav"
saida.parent.mkdir(exist_ok=True)
with wave.open(str(saida), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767 * 0.89).astype("<i2").tobytes())
print("trilha salva em", saida)
