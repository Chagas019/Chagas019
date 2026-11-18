"""PAFIES 2027 — Sound design + trilha original (100% sintetizada, sem samples de terceiros).

120 BPM (1 batida = 0,5 s = 15 frames @30fps). Mapa emocional:
  00–06s  CENA 1  tensão: batimentos cardíacos, drone grave, riser → IMPACTO
  06–14s  CENA 2  revelação: impacto, kick 4x4, baixo, pads épicos, whooshes
  14–24s  CENA 3  emoção: breakdown com arpejo, retorno gradual da batida
  24–32s  CENA 4  energia máxima: cortes no tempo, stabs, contagem 3-2-1, rufar
  32–40s  CENA 5  clímax: impacto, refrão, golpe final em 38s, cauda de reverb
Saída: stems/music.wav, stems/sfx.wav, PAFIES2027_mix.wav (48 kHz, 24-bit)
"""
import os
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 40.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
rng = np.random.default_rng(2027)


def t_(d):
    return np.arange(int(d * SR)) / SR


def bus():
    return np.zeros((N, 2))


def place(b, x, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], 1)
    n = min(len(x), N - i)
    b[i:i + n] += x[:n] * gain


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output="sos")


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=0)


def env(n, a=0.005, d=0.2, curve=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d) ** curve
    return e


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- instrumentos ----------
def kick(d=0.5, hard=1.0):
    t = t_(d)
    f = 45 + 120 * np.exp(-t / 0.035) * hard
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env(len(t), 0.001, 0.22)
    click = filt(rng.standard_normal(len(t)), "highpass", 2000) * env(len(t), 0.0005, 0.004)
    return np.tanh(1.6 * (x + 0.4 * click))


def snare(d=0.35):
    t = t_(d)
    n = filt(rng.standard_normal(len(t)), "bandpass", [1500, 8000]) * env(len(t), 0.001, 0.12)
    tone = np.sin(2 * np.pi * 190 * t) * env(len(t), 0.001, 0.05)
    return 0.8 * n + 0.6 * tone


def clap(d=0.4):
    x = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.011, 0.022, 0.034]):
        i = int(off * SR)
        seg = filt(rng.standard_normal(len(x) - i), "bandpass", [900, 5000]) * env(len(x) - i, 0.0005, 0.02 if k < 3 else 0.14)
        x[i:] += seg
    return x * 0.7


def hat(d=0.06, open_=False):
    t = t_(0.3 if open_ else d)
    return filt(rng.standard_normal(len(t)), "highpass", 7000) * env(len(t), 0.0005, 0.12 if open_ else 0.018) * 0.5


def heartbeat():
    t = t_(0.5)
    def thump(dl, amp):
        x = np.sin(2 * np.pi * (52 + 30 * np.exp(-t / 0.02)) * t) * env(len(t), 0.004, 0.07)
        return np.roll(x, int(dl * SR)) * amp
    return filt(thump(0, 1.0) + thump(0.16, 0.7), "lowpass", 180) * 1.6


def saw(f, d, detune=(0,), lp=None):
    t = t_(d)
    x = sum(signal.sawtooth(2 * np.pi * f * (1 + c) * t + rng.uniform(0, 6.28)) for c in detune) / len(detune)
    return filt(x, "lowpass", lp) if lp else x


def pad(chord, d, lp=1800):
    x = sum(saw(note(m), d, (-0.006, 0, 0.007), lp) for m in chord) / len(chord)
    a = min(0.6, d / 3)
    e = np.minimum(1, t_(d) / a) * np.minimum(1, (d - t_(d)) / 0.4)
    st = np.stack([x * e, np.roll(x, 480) * e], 1)
    return st * 1.3


def pluck(m, d=0.25, bright=4000):
    t = t_(d)
    x = signal.sawtooth(2 * np.pi * note(m) * t) + 0.5 * signal.square(2 * np.pi * note(m) * 2 * t, 0.3)
    return filt(x, "lowpass", bright) * env(len(t), 0.002, 0.09) * 0.75


def bass(m, d, lp=500):
    t = t_(d)
    x = signal.sawtooth(2 * np.pi * note(m) * t) + np.sin(2 * np.pi * note(m - 12) * t)
    return filt(np.tanh(1.5 * x), "lowpass", lp) * env(len(t), 0.004, d * 0.9) * 0.5


def stab(chord, d=0.35):
    x = sum(saw(note(m), d, (-0.01, 0, 0.01), 5000) for m in chord) / len(chord)
    return x * env(len(x), 0.002, 0.12)


def riser(d, f0=200, f1=4000):
    t = t_(d)
    nz = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    blk = 1024
    for i in range(0, len(t), blk):
        fc = f0 * (f1 / f0) ** (i / len(t))
        out[i:i + blk] = filt(nz[i:i + blk + 0], "bandpass", [fc * 0.7, min(fc * 1.4, 20000)], 1)
    sweep = np.sin(2 * np.pi * np.cumsum(f0 / 2 * (f1 / f0 / 2) ** (t / d)) / SR) * 0.25
    e = (t / d) ** 2
    return (out * 0.8 + sweep) * e


def whoosh(d=0.6, up=True):
    t = t_(d)
    nz = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    blk = 512
    for i in range(0, len(t), blk):
        p = i / len(t)
        fc = 300 + 5000 * (np.sin(np.pi * p) if not up else p)
        out[i:i + blk] = filt(nz[i:i + blk], "bandpass", [fc * 0.6, min(fc * 1.6, 20000)], 1)
    e = np.sin(np.pi * t / d) ** 2
    return out * e * 0.9


def impact(d=3.0, size=1.0):
    t = t_(d)
    boom = np.sin(2 * np.pi * (38 + 70 * np.exp(-t / 0.06)) * t) * env(len(t), 0.001, 0.9 * size)
    crack = filt(rng.standard_normal(len(t)), "lowpass", 6000) * env(len(t), 0.0005, 0.08)
    tail = filt(rng.standard_normal(len(t)), "bandpass", [200, 2500]) * env(len(t), 0.01, 1.1 * size) * 0.25
    return np.tanh(1.8 * (boom + 0.6 * crack + tail))


def reverse_swell(d=1.0):
    x = impact(d, 0.6)[::-1]
    return x * (t_(d) / d) ** 1.5


def reverb(x, rt=1.8, mix=0.25):
    ir_t = t_(rt)
    ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t / (rt / 6.9))[:, None]
    ir = filt(ir, "lowpass", 6000)
    ir /= np.sqrt((ir ** 2).sum(0))
    wet = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - mix) + wet * mix * 1.4


# ---------- arranjo ----------
music, sfx = bus(), bus()
# progressões (MIDI) — Lá menor épico → Dó maior edificante
AM, F, C, G = [57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]
PROG_A = [AM, F, C, G]
PROG_B = [C, G, AM, F]

# CENA 1 (0–6): drone + batimentos acelerando + riser
drone = filt(rng.standard_normal(int(6.2 * SR)), "lowpass", 140) * 0.35
drone += np.sin(2 * np.pi * 55 * t_(6.2)) * 0.25
drone *= np.minimum(1, t_(6.2) / 2.5)[:]
place(music, drone, 0.0)
place(music, pad([45, 52, 57], 6.0, 600) * 0.6, 0.0)
hb_t, gap = 0.4, 1.05
while hb_t < 5.4:
    place(sfx, heartbeat(), hb_t, 1.0)
    hb_t += gap
    gap = max(0.55, gap * 0.9)
place(sfx, riser(2.2, 150, 6000), 3.8, 0.55)
place(sfx, reverse_swell(1.0), 5.0, 0.6)
place(sfx, whoosh(0.5), 1.1, 0.35, -0.4)   # "EI, GALERA…"
place(sfx, whoosh(0.5), 3.1, 0.35, 0.4)    # "ESTÃO PREPARADOS?"

# IMPACTO 6.0
place(sfx, impact(3.0, 1.2), 6.0, 1.0)

# CENA 2 (6–14): kick 4x4, baixo, pad A, hats
def drums(t0, t1, kick_every=1, snare_on=False, hats16=False, claps=False, gain=1.0):
    t = t0
    i = 0
    while t < t1 - 1e-6:
        if i % kick_every == 0:
            place(music, kick(), t, 0.9 * gain)
        if snare_on and i % 2 == 1:
            place(music, snare(), t, 0.55 * gain)
        if claps and i % 2 == 1:
            place(music, clap(), t, 0.5 * gain, 0.1)
        place(music, hat(), t + BEAT / 2, 0.35 * gain, 0.3)
        if hats16:
            place(music, hat(), t + BEAT / 4, 0.2 * gain, -0.3)
            place(music, hat(), t + 3 * BEAT / 4, 0.2 * gain, -0.3)
        t += BEAT
        i += 1


def chords(t0, prog, bars, lp=2200, g=0.55, bass_on=True, arp=False):
    for b in range(bars):
        ch = prog[b % len(prog)]
        tb = t0 + b * 4 * BEAT
        place(music, pad(ch, 4 * BEAT, lp), tb, g)
        if bass_on:
            for k in range(8):
                place(music, bass(ch[0] - 12, BEAT / 2 * 0.9), tb + k * BEAT / 2, 0.55)
        if arp:
            seq = ch + [ch[1] + 12, ch[2] + 12, ch[1] + 12]
            for k in range(16):
                place(music, pluck(seq[k % len(seq)] + 12, 0.22), tb + k * BEAT / 4, 0.32, 0.25 if k % 2 else -0.25)


drums(6.0, 14.0, kick_every=1, hats16=False)
chords(6.0, PROG_A, 4, lp=1600)
for tt, p in [(6.6, -0.3), (8.0, 0.3), (10.0, -0.2), (12.0, 0.2)]:
    place(sfx, whoosh(0.55), tt, 0.4, p)
place(sfx, riser(1.5, 300, 7000), 12.5, 0.45)

# CENA 3 (14–24): breakdown emocional → batida volta em 18
place(sfx, impact(2.0, 0.7), 14.0, 0.6)
chords(14.0, PROG_B, 5, lp=2600, g=0.5, bass_on=False, arp=True)
for b in range(2, 5):
    for k in range(8):
        ch = PROG_B[b % 4]
        place(music, bass(ch[0] - 12, BEAT / 2 * 0.9, 380), 14.0 + b * 2 + k * BEAT / 2, 0.45)
drums(18.0, 24.0, kick_every=1, claps=True, gain=0.85)
for tt, p in [(14.4, -0.5), (15.6, 0.5), (16.8, -0.3), (18.0, 0.4), (19.8, -0.4), (21.0, 0.3)]:
    place(sfx, whoosh(0.45, up=False), tt, 0.3, p)
place(sfx, riser(2.0, 200, 8000), 22.0, 0.5)
place(sfx, reverse_swell(0.8), 23.2, 0.5)

# CENA 4 (24–32): energia máxima
place(sfx, impact(1.5, 0.8), 24.0, 0.85)
drums(24.0, 30.0, kick_every=1, snare_on=True, hats16=True)
chords(24.0, PROG_A, 3, lp=3200, g=0.45)
for tt in (24.0, 26.0, 28.0):
    place(music, stab([69, 72, 76]), tt, 0.5)
    place(sfx, whoosh(0.35), tt - 0.3, 0.45)
# contagem 3-2-1 (30.0 / 30.5 / 31.0) + rufar
for k, tt in enumerate((30.0, 30.5, 31.0)):
    place(music, kick(hard=1.3), tt, 1.0)
    place(music, stab([69 + k * 2, 72 + k * 2, 76 + k * 2], 0.3), tt, 0.55)
roll_t = 31.25
while roll_t < 31.98:
    place(music, snare(0.15), roll_t, 0.35 + 0.4 * (roll_t - 31.25))
    roll_t += BEAT / 8
place(sfx, riser(1.4, 400, 10000), 30.6, 0.55)

# CENA 5 (32–40): clímax + golpe final
place(sfx, impact(4.0, 1.4), 32.0, 1.0)
drums(32.0, 38.0, kick_every=1, snare_on=True, hats16=True)
chords(32.0, PROG_B, 3, lp=4000, g=0.55, arp=True)
for tt, p in [(32.3, -0.3), (34.0, 0.3), (36.0, 0)]:
    place(sfx, whoosh(0.4), tt - 0.25, 0.4, p)
place(sfx, riser(1.0, 500, 9000), 37.0, 0.5)
place(music, stab([57, 64, 69, 72], 1.5), 38.0, 0.7)
place(music, pad([45, 57, 64, 69], 2.0, 3000), 38.0, 0.6)
place(sfx, impact(2.0, 1.6), 38.0, 1.0)

# ---------- mix ----------
# sidechain: abaixa a música em cada kick (cenas 2–5)
sc_env = np.ones(N)
for tb in np.arange(6.0, 38.0, BEAT):
    i = int(tb * SR)
    n = int(0.22 * SR)
    sc_env[i:i + n] = np.minimum(sc_env[i:i + n], 0.55 + 0.45 * np.linspace(0, 1, n) ** 0.7)
music *= sc_env[:, None]
music = reverb(music, 1.6, 0.18)
sfx = reverb(sfx, 2.4, 0.28)


def master(x):
    x = filt(x, "highpass", 25)
    x = np.tanh(x * 1.1) * 0.95
    fade = np.ones(N)
    fade[-int(0.25 * SR):] = np.linspace(1, 0, int(0.25 * SR))
    x *= fade[:, None]
    return x / np.abs(x).max() * 0.891  # -1 dBFS


def norm(x, peak=0.8):
    return x / (np.abs(x).max() + 1e-9) * peak


music, sfx = norm(music, 0.8), norm(sfx, 0.85)
mix = master(music * 0.85 + sfx * 0.8)


def save(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    wavfile.write(path, SR, (np.clip(x, -1, 1) * (2 ** 31 - 1)).astype(np.int32))


save(os.path.join(ROOT, "stems", "PAFIES2027_music.wav"), music)
save(os.path.join(ROOT, "stems", "PAFIES2027_sfx.wav"), sfx)
save(os.path.join(ROOT, "PAFIES2027_mix.wav"), mix)
print("OK", mix.shape, "peak", np.abs(mix).max())
