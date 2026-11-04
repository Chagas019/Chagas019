#!/usr/bin/env python3
"""Sintetiza a trilha (120 BPM, pop animado) e os efeitos sonoros do Pafieis.

Uso: python3 tools/audio.py [duracao_segundos] [inicio_do_drop]
Gera public/audio/trilha.wav e public/audio/sfx-*.wav (tudo original, sem samples de terceiros).
"""
import sys, wave, math
import numpy as np

SR = 44100
OUT = 'public/audio/'
rs = np.random.default_rng(7)


def save(name, x, stereo=None):
    if stereo is None:
        stereo = np.stack([x, x], 1)
    y = np.clip(stereo, -1, 1)
    w = wave.open(OUT + name, 'w')
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y * 32767).astype(np.int16).tobytes())
    w.close()


def lowpass(x, cutoff):
    """Passa-baixa de um polo (cutoff pode ser array por amostra)."""
    c = np.broadcast_to(np.asarray(cutoff, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y


def env(n, a, d, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-curve * np.maximum(0, t - a) / max(d, 1e-4))
    return e


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


def place(buf, x, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n] * gain


# ---------------- instrumentos ----------------
def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 50 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.95


def clap():
    n = int(0.25 * SR); x = rs.standard_normal(n)
    x = x - lowpass(x, 900)
    t = np.arange(n) / SR
    e = np.exp(-t * 22) + 0.5 * np.exp(-((t - 0.012) * 300) ** 2) + 0.5 * np.exp(-((t - 0.024) * 300) ** 2)
    return x * e * 0.35


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); x = rs.standard_normal(n)
    x = x - lowpass(x, 7000)
    return x * env(n, 0.001, 0.12 if open_ else 0.025) * 0.18


def pluck(freq, dur=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    x = 0.6 * np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t) + 0.15 * np.sign(np.sin(2 * np.pi * freq * t))
    return x * env(n, 0.003, 0.18, 5) * 0.12


def bass(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    saw = 2 * ((freq * t) % 1) - 1
    x = lowpass(saw, 600 + 900 * np.exp(-t * 12)) + 0.5 * np.sin(2 * np.pi * freq * t)
    return x * env(n, 0.005, dur * 0.9, 2) * 0.3


def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t + rs.random() * 6) + np.sin(2 * np.pi * f * 1.004 * t) for f in freqs)
    e = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4)
    return x * e * 0.03


# ---------------- trilha ----------------
def trilha(total, drop):
    beat = 0.5  # 120 BPM
    n = int(total * SR)
    L = np.zeros(n); Rr = np.zeros(n)
    prog = [(62, [62, 66, 69]), (59, [59, 62, 66]), (55, [55, 59, 62]), (57, [57, 61, 64])]  # D Bm G A
    K, C, H, HO = kick(), clap(), hat(), hat(True)
    # intro: pad + riser até o drop
    place(L, pad([note(m) for m in prog[0][1]], drop + 0.2), 0, 1.0)
    rn = int(drop * SR); t = np.arange(rn) / SR
    riser = rs.standard_normal(rn)
    riser = lowpass(riser, 300 + 6000 * (t / drop) ** 2) * (t / drop) ** 2 * 0.25
    place(L, riser, 0)
    end = total - 1.2
    b = 0
    while True:
        tb = drop + b * beat
        if tb >= end: break
        bar = int(b // 4); root, chord = prog[bar % 4]
        place(L, K, tb, 1.0)
        if b % 4 in (1, 3): place(L, C, tb)
        place(L, H if b % 2 == 0 else HO, tb + beat / 2)
        place(L, H, tb, 0.6)
        # baixo em colcheias
        for h in range(2): place(L, bass(note(root - 24), beat / 2 * 0.95), tb + h * beat / 2)
        # pluck sincopado
        pat = [0, 0.75, 1.5, 2.5, 3.0, 3.5]
        bb = b % 4
        for i, off in enumerate(pat):
            if bb <= off < bb + 1:
                m = chord[i % 3] + 12
                place(L, pluck(note(m)), drop + (bar * 4 + off) * beat)
        if b % 4 == 0: place(L, pad([note(m) for m in chord], 4 * beat), tb)
        b += 1
    # estéreo leve: atraso no canal direito para abrir
    d = int(0.012 * SR)
    Rr[d:] = L[:-d]
    st = np.stack([L * 0.9 + Rr * 0.1, Rr * 0.9 + L * 0.1], 1)
    # fade-out
    fo = int(1.2 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]
    st /= max(1e-6, np.abs(st).max()) / 0.85
    return st


# ---------------- efeitos ----------------
def whoosh(dur=0.6, up=True):
    n = int(dur * SR); t = np.arange(n) / SR; x = rs.standard_normal(n)
    k = t / dur
    cut = 400 + 5000 * (k if up else 1 - k) ** 1.5
    y = lowpass(x, cut) - lowpass(x, cut * 0.25)
    return y * np.sin(np.pi * k) ** 1.5 * 0.9


def pop():
    n = int(0.18 * SR); t = np.arange(n) / SR
    f = 900 * np.exp(-t * 18) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * 0.6


def impact():
    n = int(1.2 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(40 + 90 * np.exp(-t * 14)) / SR) * np.exp(-t * 4)
    nz = rs.standard_normal(n); nz = lowpass(nz, 2500) * np.exp(-t * 10)
    return (boom * 0.9 + nz * 0.4) * 0.8


def sparkle():
    n = int(0.9 * SR); y = np.zeros(n)
    for i, m in enumerate([88, 91, 95, 100, 103]):
        tt = np.arange(n - int(i * 0.06 * SR)) / SR
        s = np.sin(2 * np.pi * note(m) * tt) * np.exp(-tt * 8) * 0.18
        y[int(i * 0.06 * SR):] += s
    return y


def blip():
    n = int(0.12 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(500 + 700 * t / 0.12) / SR) * np.exp(-t * 30) * 0.5


if __name__ == '__main__':
    total = float(sys.argv[1]) if len(sys.argv) > 1 else 27.5
    drop = float(sys.argv[2]) if len(sys.argv) > 2 else 1.7
    save('trilha.wav', None, trilha(total, drop))
    for name, x in [('sfx-whoosh.wav', whoosh()), ('sfx-whoosh-down.wav', whoosh(0.5, False)), ('sfx-pop.wav', pop()),
                    ('sfx-impact.wav', impact()), ('sfx-sparkle.wav', sparkle()), ('sfx-blip.wav', blip())]:
        save(name, x)
    print('ok')
