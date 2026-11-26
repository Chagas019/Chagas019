#!/usr/bin/env python3
"""
gerar_trilha.py — trilha ORIGINAL da Gincana Solidária PAFIES · 10ª edição.

Lê src/timeline.json (fonte única: fps, bpm, duração, cue sheet) e sintetiza com numpy:
  pad (3 saws detunados, filtro abrindo por seção), baixo (seno + saturação), kicks com pitch-drop,
  heartbeats, snares/clap, hats, plucks (melodia de "GINCANA" com delay), arpejo nos drops,
  risers, whooshes, reverse cymbal, impactos (kick + sub boom + burst + crash), chimes, bloops,
  silêncio seco 836–839, hit final D add9 com cauda e fade 1120→1139.
Mix: reverb por convolução (IR sintética), sidechain no pad, loudness ~ -14 LUFS (BS.1770 simplificado),
limitador soft-clip, pico ≤ -1 dBFS. Saída: WAV 48 kHz estéreo 16-bit.

Uso: python3 scripts/gerar_trilha.py [--out public/trilha.wav] [--preview out/trilha-preview.mp3]
"""
import argparse
import json
import os
import shutil
import subprocess
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
RNG = np.random.default_rng(1010)  # determinístico

# ───────────────────────────── timeline ─────────────────────────────
with open(os.path.join(ROOT, "src", "timeline.json"), encoding="utf-8") as fh:
    TL = json.load(fh)
FPS = TL["fps"]
BPM = TL["bpm"]
NFR = TL["durationInFrames"]
DUR = NFR / FPS
N = int(round(DUR * SR))
BEAT_S = 60.0 / BPM
BAR_S = BEAT_S * 4
CUES = TL["cues"]


def f2s(frame):
    return frame / FPS


def f2i(frame):
    return int(round(frame / FPS * SR))


def cues(t):
    return [c for c in CUES if c["type"] == t]


def section_at(sec):
    fr = sec * FPS
    for s in TL["sections"]:
        if s["from"] <= fr <= s["to"] + 0.999:
            return s["id"]
    return TL["sections"][-1]["id"]


# ───────────────────────────── utilidades DSP ─────────────────────────────
def midi(note):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    n, o = (note[:-1], int(note[-1]))
    return 12 * (o + 1) + names[n]


def hz(note):
    return 440.0 * 2 ** ((midi(note) - 69) / 12)


def t_axis(n):
    return np.arange(n) / SR


def env_ad(n, a, d, curve=1.0):
    """attack linear (s), decay exponencial com constante d (s)."""
    t = t_axis(n)
    e = np.exp(-t / max(d, 1e-4)) ** curve
    na = min(n, int(a * SR))
    if na > 0:
        e[:na] *= np.linspace(0, 1, na, endpoint=False) ** 0.7
    return e


def fft_filter(x, resp_fn):
    """filtro de fase zero no domínio da frequência; resp_fn(freqs) -> ganho."""
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(max(n, 2))))
    X = np.fft.rfft(x, nfft)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    y = np.fft.irfft(X * resp_fn(f), nfft)[:n]
    return y


def lp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))


def hp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order))


def bp(fc, q=1.0):
    return lambda f: 1 / np.sqrt(1 + (q * (f / fc - fc / np.maximum(f, 1e-3))) ** 2)


def stft_filter(x, gain_fn, nfft=2048, hop=512):
    """filtro variante no tempo: gain_fn(times[s] (F,1), freqs (1,B)) -> (F,B)."""
    win = np.hanning(nfft)
    pad = np.concatenate([np.zeros(nfft), x, np.zeros(nfft)])
    nfr = 1 + (len(pad) - nfft) // hop
    idx = np.arange(nfft)[None, :] + hop * np.arange(nfr)[:, None]
    frames = pad[idx] * win
    X = np.fft.rfft(frames, axis=1)
    times = ((np.arange(nfr) * hop + nfft / 2) - nfft) / SR
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    G = gain_fn(times[:, None], freqs[None, :])
    y = np.fft.irfft(X * G, nfft, axis=1) * win
    out = np.zeros(len(pad))
    norm = np.zeros(len(pad))
    for i in range(nfr):  # overlap-add (rápido o bastante)
        out[i * hop : i * hop + nfft] += y[i]
        norm[i * hop : i * hop + nfft] += win**2
    out /= np.maximum(norm, 1e-6)
    return out[nfft : nfft + len(x)]


def saw(freq, n, phase0=0.0):
    """saw com polyBLEP (menos aliasing)."""
    dt = freq / SR
    ph = (phase0 + dt * np.arange(n)) % 1.0
    y = 2 * ph - 1
    # polyBLEP
    m1 = ph < dt
    t1 = ph[m1] / dt
    y[m1] -= t1 + t1 - t1 * t1 - 1
    m2 = ph > 1 - dt
    t2 = (ph[m2] - 1) / dt
    y[m2] -= t2 * t2 + t2 + t2 + 1
    return y


def pan_st(x, pan):
    """pan -1..1 equal-power → (n,2)"""
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


class Bus:
    def __init__(self):
        self.buf = np.zeros((N + SR * 4, 2))

    def add(self, start_s, sig, gain=1.0, pan=0.0):
        if sig.ndim == 1:
            sig = pan_st(sig, pan)
        i = int(round(start_s * SR))
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(len(self.buf), i + len(sig))
        self.buf[i:j] += sig[: j - i] * gain

    def out(self):
        return self.buf[:N]


# ───────────────────────────── instrumentos ─────────────────────────────
def kick(intensity=1.0, f0=150, f1=45, sweep=0.08, dec=0.26, click=True):
    n = int(0.7 * SR)
    t = t_axis(n)
    k = np.log(f0 / f1) / sweep
    f = f1 + (f0 - f1) * np.exp(-k * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_ad(n, 0.001, dec)
    body = np.tanh(body * 1.6) / np.tanh(1.6)
    if click:
        nc = int(0.003 * SR)
        c = np.zeros(n)
        c[:nc] = RNG.standard_normal(nc) * np.linspace(1, 0, nc)
        body += fft_filter(c, hp(2500)) * 0.5
    return body * intensity


def heartbeat(intensity=1.0):
    k = kick(1.0, f0=95, f1=38, sweep=0.06, dec=0.22, click=False)
    return fft_filter(k, lp(200, 2)) * intensity * 1.4


def snare(intensity=1.0):
    n = int(0.35 * SR)
    nz = RNG.standard_normal(n)
    nz = fft_filter(nz, bp(1800, 0.7)) * env_ad(n, 0.0005, 0.12)
    nz += fft_filter(RNG.standard_normal(n), hp(6000)) * env_ad(n, 0.0005, 0.05) * 0.35
    t = t_axis(n)
    tone = np.sin(2 * np.pi * 190 * t * (1 + 0.15 * np.exp(-t / 0.01))) * env_ad(n, 0.0005, 0.06)
    return (nz * 1.6 + tone * 0.8) * intensity


def clap(intensity=1.0):
    n = int(0.5 * SR)
    out = np.zeros(n)
    for k, off in enumerate([0.0, 0.011, 0.023, 0.034]):
        i = int(off * SR)
        m = n - i
        e = env_ad(m, 0.0003, 0.008 if k < 3 else 0.16)
        out[i:] += RNG.standard_normal(m) * e * (0.8 if k < 3 else 1.0)
    return fft_filter(out, bp(1300, 0.9)) * 1.8 * intensity


def hat(intensity=1.0, dec=0.03):
    n = int(0.12 * SR)
    x = fft_filter(RNG.standard_normal(n), hp(8000, 3)) * env_ad(n, 0.0003, dec)
    return x * intensity


def tick(intensity=1.0):
    n = int(0.12 * SR)
    t = t_axis(n)
    x = np.sin(2 * np.pi * 1760 * t) * env_ad(n, 0.0005, 0.025)
    x += np.sin(2 * np.pi * 2640 * t) * env_ad(n, 0.0005, 0.012) * 0.5
    x += fft_filter(RNG.standard_normal(n), hp(4000)) * env_ad(n, 0.0002, 0.006) * 0.4
    return x * intensity


def pluck(freq, intensity=1.0, dec=0.18, bright=3500):
    n = int(0.9 * SR)
    x = (saw(freq, n) + 0.6 * saw(freq * 1.005, n, 0.3)) * 0.6
    x = stft_filter(
        x, lambda T, F: 1 / np.sqrt(1 + (F / (300 + bright * np.exp(-np.maximum(T, 0) / 0.08))) ** 4), nfft=1024, hop=256
    )
    return x * env_ad(n, 0.002, dec) * intensity


def bloop(intensity=1.0):
    n = int(0.35 * SR)
    t = t_axis(n)
    f = 400 + 500 * np.clip(t / 0.09, 0, 1) ** 0.6
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env_ad(n, 0.003, 0.11) * intensity


def chime(freq, intensity=1.0, dec=1.6):
    n = int(3.0 * SR)
    t = t_axis(n)
    x = np.sin(2 * np.pi * freq * t) * env_ad(n, 0.002, dec)
    x += 0.45 * np.sin(2 * np.pi * freq * 2.76 * t) * env_ad(n, 0.001, dec * 0.35)
    x += 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * env_ad(n, 0.001, dec * 0.12)
    return x * intensity


def cymbal(n, dec, hpf=5000):
    x = fft_filter(RNG.standard_normal(n), hp(hpf, 2))
    t = t_axis(n)
    metal = sum(np.sin(2 * np.pi * f * t + RNG.uniform(0, 6)) for f in (3150, 4270, 5340, 6810, 8200, 9450)) * 0.08
    return (x + metal) * env_ad(n, 0.0005, dec)


def crash(intensity=1.0):
    n = int(3.2 * SR)
    return cymbal(n, 0.9) * intensity


def riser(dur, intensity=1.0):
    n = int(dur * SR)
    x = RNG.standard_normal(n)
    D = dur

    def g(T, F):
        u = np.clip(T / D, 0, 1)
        fc = 300 * (8000 / 300) ** u
        return 1 / np.sqrt(1 + (1.2 * (F / fc - fc / np.maximum(F, 1))) ** 2)

    x = stft_filter(x, g)
    t = t_axis(n)
    u = t / D
    f = 220 * 2 ** u  # seno subindo 1 oitava
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) * 0.35 + 0.15 * np.sin(2 * ph)
    vol = (np.exp(3.2 * u) - 1) / (np.exp(3.2) - 1)
    y = (x * 1.2 + tone) * vol
    y[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    return y * intensity


def whoosh(dur, intensity=1.0):
    """retorna estéreo (n,2) com pan L→R; pico em ~60% da duração."""
    n = int(dur * SR)
    x = RNG.standard_normal(n)
    D = dur

    def g(T, F):
        u = np.clip(T / D, 0, 1)
        fc = 250 * (5000 / 250) ** (np.sin(np.pi * u * 0.85))
        return 1 / np.sqrt(1 + (1.5 * (F / fc - fc / np.maximum(F, 1))) ** 2)

    x = stft_filter(x, g, nfft=1024, hop=256)
    u = t_axis(n) / D
    e = np.sin(np.pi * np.clip(u / 0.62, 0, 1) * 0.5) ** 2 * np.where(u > 0.62, np.exp(-(u - 0.62) * 9), 1)
    x = x * e * intensity * 1.6
    pan = -0.8 + 1.6 * u
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def sub_boom(intensity=1.0, dec=1.2):
    n = int(3.5 * SR)
    t = t_axis(n)
    f = 40 + 25 * np.exp(-t / 0.05)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * 1.5) * env_ad(n, 0.002, dec) * intensity


def impact(intensity=1.0):
    n = int(3.5 * SR)
    out = np.zeros(n)
    k = kick(1.0, f0=170, f1=42, dec=0.45)
    out[: len(k)] += k * 1.1
    out += sub_boom(1.0, 1.2) * 0.9
    nb = int(0.9 * SR)
    burst = fft_filter(RNG.standard_normal(nb), bp(900, 0.4)) * env_ad(nb, 0.0005, 0.3 * (0.5 + intensity / 2))
    out[:nb] += burst * 0.7
    return out * intensity


def reverse_cymbal(dur, intensity=1.0):
    n = int(dur * SR)
    c = cymbal(int(2.0 * SR), 0.6, 3000)
    c = c[::-1][-n:] if len(c) >= n else np.concatenate([np.zeros(n - len(c)), c[::-1]])
    return c * intensity


# ───────────────────────────── harmonia ─────────────────────────────
CHORDS = {
    "Bm": {"root": "B1", "pad": ["F#3", "B3", "D4", "F#4"], "arp": ["B4", "D5", "F#5", "D5"]},
    "G": {"root": "G1", "pad": ["G3", "B3", "D4", "G4"], "arp": ["B4", "D5", "G5", "D5"]},
    "D": {"root": "D2", "pad": ["F#3", "A3", "D4", "F#4"], "arp": ["A4", "D5", "F#5", "D5"]},
    "A": {"root": "A1", "pad": ["E3", "A3", "C#4", "E4"], "arp": ["A4", "C#5", "E5", "C#5"]},
    "Dadd9": {"root": "D2", "pad": ["D3", "A3", "E4", "F#4", "A4", "D5"], "arp": []},
}
PROG = TL["music"]["progression"]
NBARS = int(np.ceil(DUR / BAR_S))


def chord_of_bar(b):  # b 0-based
    fb = TL["music"]["finalChord"]["bar"] - 1
    if b >= fb:
        return "Dadd9"
    return PROG[b % len(PROG)]


def build_pad():
    out = np.zeros((N + SR * 4, 2))
    detunes = [-7, 0, 7]
    pans = [-0.6, 0.0, 0.6]
    for b in range(NBARS):
        ch = CHORDS[chord_of_bar(b)]
        t0 = b * BAR_S
        final = chord_of_bar(b) == "Dadd9"
        L = (DUR - t0 + 0.2) if final else BAR_S + 0.35
        n = int(L * SR)
        if n <= 0:
            continue
        t = t_axis(n)
        att = 0.4 if b == 0 or final else 0.25
        e = np.minimum(1, t / att) ** 1.5
        if not final:
            rel = 0.35
            e *= np.clip((L - t) / rel, 0, 1)
        voice = np.zeros((n, 2))
        for note in ch["pad"]:
            f = hz(note)
            for d, p in zip(detunes, pans):
                s = saw(f * 2 ** (d / 1200), n, RNG.uniform())
                voice += pan_st(s, p) * (0.33 / len(ch["pad"]))
        # sub-oitava suave
        voice += pan_st(np.sin(2 * np.pi * hz(ch["pad"][0]) / 2 * t), 0) * 0.04
        i0 = int(t0 * SR)
        out[i0 : i0 + n] += voice * e[:, None]
    out = out[:N]
    pts = np.array(TL["music"]["padFilterHz"], dtype=float)

    def g(T, F):
        fc = np.interp(T * FPS, pts[:, 0], pts[:, 1])
        return 1 / np.sqrt(1 + (F / fc) ** 4) * (1 / np.sqrt(1 + (60 / np.maximum(F, 1)) ** 4))

    for c in range(2):
        out[:, c] = stft_filter(out[:, c], g)
    return out


def build_bass():
    bus = Bus()
    eighth = BEAT_S / 2

    def note(t0, f, length, amp):
        n = int((length + 0.05) * SR)
        t = t_axis(n)
        x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
        x = np.tanh(1.8 * x) / np.tanh(1.8)
        e = np.minimum(1, t / 0.006) * np.clip((length - t) / 0.04 + 1, 0, 1) * (0.75 + 0.25 * np.exp(-t / 0.12))
        bus.add(t0, x * e, amp)

    for b in range(NBARS):
        chn = chord_of_bar(b)
        root = hz(CHORDS[chn]["root"])
        t0 = b * BAR_S
        sec = section_at(t0 + 0.01)
        if sec == "intro":
            continue
        if chn == "Dadd9":
            note(t0, hz("D1"), DUR - t0 - 0.1, 0.55)
            continue
        if sec in ("build", "drop1", "drop2"):
            pattern = [1, 1, 2, 1, 1, 1, 2, 1] if sec != "build" else [1, 1, 1, 1, 1, 1, 1, 1]
            for k in range(8):
                ts = t0 + k * eighth
                fr = ts * FPS
                if any(c["frame"] <= fr < c.get("end", c["frame"]) + 4 for c in cues("silence_start")):
                    continue
                note(ts, root * pattern[k], eighth * 0.8, 0.42 if k % 2 == 0 else 0.34)
        elif sec == "break":
            note(t0, root, BAR_S * 0.95 if b * BAR_S + BAR_S <= 836 / FPS else 836 / FPS - t0 - 0.02, 0.45)
        elif sec == "finale":
            for k in range(4):
                note(t0 + k * BEAT_S, root, BEAT_S * 0.85, 0.38)
    return bus.out()


def build_arp():
    """arpejo em colcheias de 16 nos drops (brilho, baixo volume, com delay)."""
    bus = Bus()
    six = BEAT_S / 4
    for b in range(NBARS):
        t0 = b * BAR_S
        sec = section_at(t0 + 0.01)
        if sec not in ("drop1", "drop2"):
            continue
        arp = CHORDS[chord_of_bar(b)]["arp"]
        for k in range(16):
            f = hz(arp[k % 4])
            x = pluck(f, 1.0, dec=0.09, bright=2200)
            bus.add(t0 + k * six, x, 0.09 if k % 4 == 0 else 0.065, pan=(-0.35 if k % 2 else 0.35))
    return bus.out()


# ───────────────────────────── efeitos de mix ─────────────────────────────
def make_ir(seconds, decay, lp_end=2500, predelay=0.012):
    n = int(seconds * SR)
    t = t_axis(n)
    ir = np.zeros((n, 2))
    for c in range(2):
        x = RNG.standard_normal(n) * np.exp(-t / decay)
        x = stft_filter(x, lambda T, F: 1 / np.sqrt(1 + (F / (lp_end + 9000 * np.exp(-T / 0.25))) ** 2), nfft=1024, hop=256)
        ir[:, c] = x
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((pd, 2)), ir])
    ir /= np.sqrt(np.sum(ir**2) / 2)
    return ir


def convolve(x, ir):
    n = len(x) + len(ir) - 1
    nfft = 1 << int(np.ceil(np.log2(n)))
    out = np.zeros((len(x), 2))
    for c in range(2):
        y = np.fft.irfft(np.fft.rfft(x[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[: len(x)]
        out[:, c] = y
    return out


def delay(x, time_s, fb=0.35, mix=0.3, pingpong=True):
    d = int(time_s * SR)
    out = x.copy()
    tap = x.copy()
    for k in range(1, 6):
        tap = np.roll(tap, d, axis=0)
        tap[:d] = 0
        tap = tap * fb
        if pingpong:
            tap = tap[:, ::-1]
        out += tap * (mix / fb)
    return out


def duck_env(frames, depth_db=4.0, hold=0.15):
    e = np.ones(N)
    g = 10 ** (-depth_db / 20)
    t = t_axis(int((hold + 0.25) * SR))
    shape = 1 - (1 - g) * np.where(t < hold, 1.0, np.exp(-(t - hold) / 0.08))
    shape[: int(0.005 * SR)] = np.linspace(1, g, int(0.005 * SR))
    for fr in frames:
        i = f2i(fr)
        j = min(N, i + len(shape))
        e[i:j] = np.minimum(e[i:j], shape[: j - i])
    return e


def k_weight_resp(f):
    w = 2 * np.pi * f / SR
    z = np.exp(-1j * w)

    def biq(b, a):
        return (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)

    h1 = biq([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585])
    h2 = biq([1, -2, 1], [1, -1.99004745483398, 0.99007225036621])
    return np.abs(h1 * h2)


def lufs(x):
    y = np.stack([fft_filter(x[:, c], k_weight_resp) for c in range(2)], axis=1)
    blk = int(0.4 * SR)
    hop = int(0.1 * SR)
    ms = []
    for i in range(0, len(y) - blk, hop):
        ms.append(np.sum(np.mean(y[i : i + blk] ** 2, axis=0)))
    ms = np.array(ms)
    L = -0.691 + 10 * np.log10(np.maximum(ms, 1e-12))
    ms = ms[L > -70]
    if not len(ms):
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(ms)) - 10
    L2 = -0.691 + 10 * np.log10(ms)
    return -0.691 + 10 * np.log10(np.mean(ms[L2 > rel]))


def limiter(x, ceiling_db=-1.0, release=0.08, lookahead=0.003):
    """limitador por blocos com look-ahead + soft-clip final."""
    c = 10 ** (ceiling_db / 20)
    blk = 64
    nb = int(np.ceil(len(x) / blk))
    pk = np.zeros(nb)
    a = np.abs(x).max(axis=1)
    a = np.concatenate([a, np.zeros(nb * blk - len(a))])
    pk = a.reshape(nb, blk).max(axis=1)
    la = max(1, int(lookahead * SR / blk))
    pk = np.maximum.reduce([np.roll(pk, -k) for k in range(la + 1)])
    target = np.minimum(1.0, (c * 0.93) / np.maximum(pk, 1e-9))
    g = np.ones(nb)
    rel = np.exp(-blk / (release * SR))
    cur = 1.0
    for i in range(nb):
        cur = target[i] if target[i] < cur else target[i] + (cur - target[i]) * rel
        g[i] = cur
    gs = np.interp(np.arange(len(x)), np.arange(nb) * blk + blk / 2, g)
    y = x * gs[:, None]
    # soft-clip acima de 0.93·ceiling
    k = c * 0.93
    over = np.abs(y) > k
    y[over] = np.sign(y[over]) * (k + (c - k) * np.tanh((np.abs(y[over]) - k) / (c - k)))
    return y, 20 * np.log10(np.min(g))


def true_peak(x, os_factor=4):
    """pico inter-amostra aproximado via upsampling por FFT."""
    pk = 0.0
    for c in range(x.shape[1]):
        n = len(x)
        X = np.fft.rfft(x[:, c])
        Y = np.zeros(n * os_factor // 2 + 1, dtype=complex)
        Y[: len(X)] = X
        y = np.fft.irfft(Y, n * os_factor) * os_factor
        pk = max(pk, float(np.abs(y).max()))
    return pk


# ───────────────────────────── montagem ─────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "public", "trilha.wav"))
    ap.add_argument("--preview", default=os.path.join(ROOT, "out", "trilha-preview.mp3"))
    args = ap.parse_args()

    drums = Bus()   # bateria (room curto)
    fx = Bus()      # risers, whooshes, impactos (hall)
    tonal = Bus()   # plucks, chimes, bloops (hall + delay)
    dry_sub = Bus() # subs/kicks graves sem reverb

    for c in CUES:
        t = f2s(c["frame"])
        it = c.get("intensity", 1.0)
        ty = c["type"]
        if ty == "kick":
            dry_sub.add(t, kick(it), 0.6)
        elif ty == "heartbeat":
            dry_sub.add(t, heartbeat(it), 0.62)
        elif ty == "heartbeat2":
            dry_sub.add(t, heartbeat(it), 0.62 * 10 ** (-3 / 20))
        elif ty == "snare":
            drums.add(t, snare(it), 0.42, pan=0.05)
        elif ty == "clap":
            drums.add(t, clap(it), 0.4)
        elif ty == "hat":
            drums.add(t, hat(it), 0.22, pan=0.3 if int(c["frame"]) % 30 < 15 else 0.2)
        elif ty == "tick":
            tonal.add(t, tick(it), 0.25, pan=-0.2)
        elif ty == "pluck":
            tonal.add(t, pluck(hz(c["note"]), it), 0.3)
        elif ty == "bloop":
            tonal.add(t, bloop(it), 0.32)
        elif ty == "chime":
            base = hz(c.get("note", "D6"))
            tonal.add(t, chime(base, it), 0.18, pan=-0.25)
            tonal.add(t + 0.06, chime(base * 1.5, it * 0.6), 0.12, pan=0.25)
        elif ty == "crash":
            fx.add(t, crash(it), 0.22, pan=0.15)
        elif ty in ("impact", "boom"):
            if ty == "impact":
                dry_sub.add(t, impact(it), 0.62)
                fx.add(t, fft_filter(RNG.standard_normal(int(0.5 * SR)), bp(600, 0.5)) * env_ad(int(0.5 * SR), 0.0005, 0.25), 0.25 * it)
            else:
                dry_sub.add(t, sub_boom(it, 1.6), 0.38)
        elif ty == "hit":
            dry_sub.add(t, kick(it, f0=180, f1=48, dec=0.3), 0.6)
            drums.add(t, snare(it), 0.4)
            drums.add(t, clap(it), 0.25)
            fx.add(t, crash(it * 0.6), 0.14)
        elif ty == "final_hit":
            dry_sub.add(t, impact(1.0), 0.65)
            dry_sub.add(t, sub_boom(1.0, 2.0), 0.32)
            fx.add(t, crash(1.0), 0.28)
            # stab D add9 brilhante
            n = int((DUR - t + 0.1) * SR)
            tt = t_axis(n)
            stab = np.zeros((n, 2))
            for note_, p in zip(["D4", "A4", "E5", "F#5", "A5", "D6"], [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5]):
                s = saw(hz(note_), n) * 0.5 + np.sin(2 * np.pi * hz(note_) * tt) * 0.5
                stab += pan_st(s, p)
            stab_m = np.stack([fft_filter(stab[:, k], lp(3200, 2)) for k in range(2)], axis=1)
            stab_m *= (np.minimum(1, tt / 0.004) * (0.35 + 0.65 * np.exp(-tt / 0.6)))[:, None]
            tonal.add(t, stab_m, 0.06)
            tonal.add(t, chime(hz("D6"), 1.0, 2.5), 0.16, pan=-0.3)
            tonal.add(t + 0.08, chime(hz("A6"), 0.7, 2.5), 0.1, pan=0.3)
        elif ty == "riser_start":
            dur = f2s(c["end"] - c["frame"])
            r = riser(dur, it)
            fx.add(t, np.stack([r, np.roll(r, 120)], axis=1) * 0.5, 0.33)  # estéreo levemente descorrelacionado
        elif ty == "whoosh":
            dfr = c.get("duration", 10)
            d = max(0.3, f2s(dfr) + 0.15)
            # pico do whoosh (62% da duração) no meio do movimento; nos longos (mergulho) no final
            peak = t + (f2s(dfr) if dfr >= 20 else f2s(dfr) * 0.4)
            fx.add(peak - 0.62 * d, whoosh(d, it), 0.38)
        elif ty == "snare_roll_start":
            t_end = f2s(c["end"])
            six = BEAT_S / 4
            k = 0
            tt = t
            while tt < t_end - 1e-6:
                u = (tt - t) / (t_end - t)
                drums.add(tt, snare(0.25 + 0.75 * u**1.5), 0.36, pan=(0.12 if k % 2 else -0.12))
                if u > 0.5:  # fusas no final
                    drums.add(tt + six / 2, snare(0.2 + 0.6 * u**2), 0.28)
                tt += six
                k += 1
        elif ty == "reverse_cymbal_start":
            dur = f2s(c["end"] - c["frame"])
            fx.add(t, pan_st(reverse_cymbal(dur, it), 0.0), 0.3)

    print("· sintetizando pad, baixo, arpejo …")
    pad = build_pad()
    bass = build_bass()
    arp = build_arp()

    # sidechain: pad e arpejo cedem 4 dB em kicks/impactos
    duck_frames = [c["frame"] for c in CUES if c["type"] in ("kick", "impact", "hit", "final_hit")]
    de = duck_env(duck_frames, 4.0, 0.15)
    pad *= de[:, None]
    arp *= de[:, None]

    # efeitos
    print("· reverb / delay …")
    hall = make_ir(3.2, 0.9, 2800)
    room = make_ir(0.9, 0.18, 5000)
    tonal_o = tonal.out()
    tonal_d = delay(tonal_o, BEAT_S * 0.75, fb=0.32, mix=0.22)  # dotted-eighth ping-pong
    arp_d = delay(arp, BEAT_S * 0.75, fb=0.3, mix=0.25)

    drums_o = drums.out()
    fx_o = fx.out()
    sub_o = dry_sub.out()

    send_hall = tonal_d * 0.35 + pad * 0.25 + fx_o * 0.3 + drums_o * 0.08 + arp_d * 0.3
    send_room = drums_o * 0.25
    wet = convolve(send_hall, hall) * 0.5 + convolve(send_room, room) * 0.45

    mix = pad * 0.9 + bass * 0.42 + arp_d * 1.25 + drums_o * 1.1 + fx_o * 1.0 + tonal_d * 1.35 + sub_o * 1.0 + wet

    # HP geral 25 Hz (limpa DC/subsônico) + low-shelf −3 dB abaixo de ~80 Hz (controle de grave)
    shelf = lambda f: hp(25, 2)(f) * (1 - (1 - 10 ** (-3 / 20)) / (1 + (f / 80) ** 2))
    mix = np.stack([fft_filter(mix[:, c], shelf) for c in range(2)], axis=1)

    # fade-in de 10 ms
    mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]

    # loudness → alvo -14 LUFS, mas sem esmagar: GR máx ~6 dB
    L0 = lufs(mix)
    gain_db = -14.0 - L0
    peak_db = 20 * np.log10(np.abs(mix).max() + 1e-12)
    max_gain = -1.0 - peak_db + 6.0
    gain_db = min(gain_db, max_gain)
    mix *= 10 ** (gain_db / 20)
    mix, gr = limiter(mix, -1.5)

    # silêncio seco (após reverb e limiter: corte real)
    for c in cues("silence_start"):
        a = f2i(c["frame"])
        b = f2i(c["end"])
        r = int(0.003 * SR)
        mix[a - r : a] *= np.linspace(1, 0, r)[:, None]
        mix[a:b] = 0.0

    # fade out final
    for c in cues("fade_start"):
        a = f2i(c["frame"])
        b = N
        mix[a:b] *= (np.linspace(1, 0, b - a) ** 1.6)[:, None]

    # segurança final: TRUE PEAK (4× oversampling) ≤ -1.2 dBTP
    tp = true_peak(mix)
    lim = 10 ** (-1.2 / 20)
    if tp > lim:
        mix *= lim / tp

    L1 = lufs(mix)
    pk_db = 20 * np.log10(np.abs(mix).max())
    tp_db = 20 * np.log10(true_peak(mix))
    rms_db = 20 * np.log10(np.sqrt(np.mean(mix**2)))

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    pcm = np.clip(np.round(mix * 32767), -32768, 32767).astype("<i2")
    with wave.open(args.out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    # cópia no caminho citado no storyboard (public/audio/trilha.wav)
    alt = os.path.join(ROOT, "public", "audio", "trilha.wav")
    if os.path.abspath(alt) != os.path.abspath(args.out):
        os.makedirs(os.path.dirname(alt), exist_ok=True)
        shutil.copyfile(args.out, alt)

    print(f"✓ {args.out}")
    print(f"  duração {len(mix)/SR:.3f}s ({len(mix)} amostras) · pico {pk_db:.2f} dBFS · RMS {rms_db:.2f} dBFS · "
          f"true-peak {tp_db:.2f} dBTP · ~{L1:.1f} LUFS · ganho {gain_db:+.1f} dB · GR máx limiter {gr:.1f} dB")

    if args.preview and shutil.which("ffmpeg"):
        os.makedirs(os.path.dirname(args.preview), exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", args.out, "-codec:a", "libmp3lame", "-b:a", "192k", args.preview], check=True)
        print(f"✓ {args.preview}")


if __name__ == "__main__":
    main()
