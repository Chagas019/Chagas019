# Trilha procedural: batida suave, pad, whooshes nas viradas e impactos.
# Mixa com audio/narracao.wav (ducking sob a voz) -> build/mix.wav
import json, sys, os
import numpy as np, soundfile as sf

D = os.path.dirname(os.path.abspath(__file__))
SR, DUR = 48000, 30.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(5)
bed = np.zeros(N); fx = np.zeros(N)

def at(buf, start, sig):
    i = int(start * SR); j = min(N, i + len(sig))
    if i < N: buf[i:j] += sig[: j - i]

def env(n, a, r):
    e = np.ones(n); ai = int(a * SR); e[:ai] = np.linspace(0, 1, ai)
    e *= np.exp(-np.arange(n) / (r * SR)); return e

def lowpass(x, k):  # média móvel simples (k amostras)
    return np.convolve(x, np.ones(k) / k, mode="same")

BPM = 118; beat = 60 / BPM
# kick
kn = int(.35 * SR); kt = np.arange(kn) / SR
kick = np.sin(2 * np.pi * (45 + 90 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 9)
# hat
hn = int(.06 * SR); hat = (rng.standard_normal(hn) - lowpass(rng.standard_normal(hn), 4)) * np.exp(-np.arange(hn) / SR * 70)
b = 0.0; k = 0
while b < DUR - .2:
    if b > 0.6 and not (26.6 < b < 27.1):
        at(bed, b, kick * (.9 if k % 2 == 0 else .6))
        at(bed, b + beat / 2, hat * .25)
    b += beat; k += 1
# pad (acordes em Lá menor / Fá / Dó / Sol), filtrado
chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]
bar = beat * 4
pad = np.zeros(N)
for ci in range(int(DUR / bar) + 1):
    fr = chords[ci % 4]; s = int(ci * bar * SR); e = min(N, int((ci + 1) * bar * SR))
    if s >= N: break
    tt = t[s:e]
    seg = sum(np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * 2 * f * tt + .5) for f in fr)
    a = np.minimum(1, np.minimum((tt - tt[0]) / .3, (tt[-1] - tt + 1e-3) / .3))
    pad[s:e] += seg * a
bed += lowpass(pad, 12) * .05

# whoosh: ruído filtrado com envelope em sino
def whoosh(dur=.7, amp=.5):
    n = int(dur * SR); x = rng.standard_normal(n)
    x = lowpass(x, 6) - lowpass(x, 60)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return x * e * amp
for c in [3.2, 9.65, 14.55, 20.9, 26.7]:
    at(fx, c, whoosh(.55, .9))
# impactos
def impact(amp=1.0):
    n = int(1.4 * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-tt * 12)) * tt) * np.exp(-tt * 3.5)
    crack = rng.standard_normal(n) * np.exp(-tt * 40) * .5
    return (boom + crack) * amp
for c, a in [(11.92, .9), (19.75, 1.0), (27.1, 1.1), (3.45, .5)]:
    at(fx, c, impact(a))
# ticks (dias da semana e contador)
tn = int(.03 * SR); tick = np.sin(2 * np.pi * 2400 * np.arange(tn) / SR) * np.exp(-np.arange(tn) / SR * 160)
for i in range(7): at(fx, 10.55 + i * 0.2, tick * .35)
for i in range(9): at(fx, 18.25 + (i / 9) ** .8 * 1.5, tick * .3)
# riser antes da assinatura
rn = int(1.3 * SR); rt = np.arange(rn) / SR
riser = np.sin(2 * np.pi * (300 + 900 * (rt / 1.3) ** 2) * rt) * (rt / 1.3) ** 2 * .12 + (lowpass(rng.standard_normal(rn), 3)) * (rt / 1.3) ** 3 * .25
at(fx, 25.8, riser)
# brilho no logo
sn = int(1.2 * SR); st = np.arange(sn) / SR
shimmer = sum(np.sin(2 * np.pi * f * st) for f in [1760, 2217, 2637, 3520]) * np.exp(-st * 3) * .05
at(fx, 27.15, shimmer)

# narração
v, vsr = sf.read(os.path.join(D, "audio", "narracao.wav"))
if v.ndim > 1: v = v.mean(axis=1)
v = v / (np.max(np.abs(v)) + 1e-9) * .89
v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
voice = np.zeros(N); voice[: min(N, len(v))] = v[:N]
# ducking: envelope da voz suavizado
ve = lowpass(np.abs(voice), int(.25 * SR)); ve = ve / (ve.max() + 1e-9)
duck = 1 - .55 * np.clip(ve * 4, 0, 1)
fade = np.clip((DUR - t) / 1.5, 0, 1) * np.clip(t / .4, 0, 1)
mix = voice * 1.0 + bed * .55 * duck * fade + fx * .35 * fade
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / np.max(np.abs(mix)) * .93
stereo = np.stack([mix, mix], axis=1)
os.makedirs(os.path.join(D, "build"), exist_ok=True)
sf.write(os.path.join(D, "build", "mix.wav"), stereo, SR)
print("ok", stereo.shape)
