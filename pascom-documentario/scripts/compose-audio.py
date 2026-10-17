#!/usr/bin/env python3
"""
Trilha original e sound design de "Somos chamados a algo maior".

Tudo aqui é sintetizado do zero (NumPy/SciPy): piano por síntese aditiva com
inarmonicidade, cordas por osciladores com vibrato e coro de vozes, tímpanos,
ambiente de igreja, passos, porta, zíper, anel de foco e obturador. Não há
amostras de terceiros, então não há licença a respeitar: a obra é do projeto.

A sincronia vem de src/data/timeline.json (mesma fonte usada pelo Remotion):
pausa musical antes do clímax, clímax no "SOMOS CHAMADOS", cliques de câmera
nos cortes, ambiente que some no final.

Saída (MP3 320 kbps, 48 kHz, estéreo, começando em 0 s):
  public/assets/audio/music/score.mp3
  public/assets/audio/ambience/church-ambience.mp3
  public/assets/audio/sfx/foley.mp3

Uso: python3 scripts/compose-audio.py   (requer numpy, scipy e ffmpeg)
"""
import json
import os
import subprocess
import tempfile
import wave

import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, "src", "data", "timeline.json"), encoding="utf-8"))
SR = 48000
DUR = float(TL["durationSec"])
N = int(DUR * SR)
M = TL["music"]
rng = np.random.default_rng(2026)

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6,
        "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def hz(name):
    """'F#4' -> frequência (A4 = 440 Hz)."""
    pitch, octave = name[:-1], int(name[-1])
    midi = 12 * (octave + 1) + NOTE[pitch]
    return 440.0 * 2 ** ((midi - 69) / 12)


def stereo(n):
    return np.zeros((n, 2), dtype=np.float64)


def add(bus, sig, t, pan=0.0, gain=1.0):
    """Soma um sinal mono/estéreo ao barramento a partir de t segundos, com pan de potência constante."""
    i = int(t * SR)
    if i >= len(bus):
        return
    if sig.ndim == 1:
        left = np.cos((pan + 1) * np.pi / 4)
        right = np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * left, sig * right], axis=1)
    j = min(len(bus), i + len(sig))
    bus[i:j] += sig[: j - i] * gain


def env_ar(n, attack, release):
    e = np.ones(n)
    a = min(n, int(attack * SR))
    r = min(n - a, int(release * SR))
    if a:
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        e[n - r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e


def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def lowpass(x, f, order=2):
    sos = signal.butter(order, f, btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def highpass(x, f, order=2):
    sos = signal.butter(order, f, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def church_ir(rt60=4.2, pre=0.035, size=1.0):
    """Resposta ao impulso estéreo de uma nave de igreja: reflexões iniciais + cauda difusa escurecendo."""
    n = int((rt60 * 1.15 + pre) * SR)
    t = np.arange(n) / SR
    ir = stereo(n)
    decay = np.exp(-6.91 * t / rt60)
    for ch in range(2):
        noise = rng.standard_normal(n)
        # a cauda perde agudos com o tempo (absorção do ar e da pedra)
        bright = lowpass(noise, 9000)
        dark = lowpass(noise, 1800)
        mix = np.clip(t / (rt60 * 0.5), 0, 1)
        tail = (bright * (1 - mix) + dark * mix) * decay
        tail[: int(pre * SR)] = 0
        ir[:, ch] = tail
        for k in range(14):  # reflexões iniciais nas paredes e colunas
            d = pre * 0.4 + rng.uniform(0.004, pre + 0.06) * size
            ir[int(d * SR), ch] += rng.uniform(0.25, 0.6) * (-1) ** k
    return ir / np.max(np.abs(ir))


def reverb(dry, ir, wet=0.35, dry_gain=1.0):
    out = stereo(len(dry))
    for ch in range(2):
        w = signal.fftconvolve(dry[:, ch], ir[:, ch])[: len(dry)]
        out[:, ch] = dry[:, ch] * dry_gain + w * wet * 0.08
    return out


# ------------------------------------------------------------------ instrumentos

def piano(f, dur, vel=0.6):
    """Nota de piano: parciais inarmônicas, dois estágios de decaimento, cordas duplas com batimento e martelo."""
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    B = 0.00035 if f < 300 else 0.0006
    out = np.zeros(n)
    t60 = np.interp(np.log2(f), [5.0, 11.0], [9.0, 1.6])  # graves soam mais
    for k in range(1, 15):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        amp = (vel ** (0.5 + 0.12 * k)) / k ** 1.15
        if k in (7, 14):
            amp *= 0.25  # ponto de toque do martelo abafa o 7º parcial
        fast = np.exp(-6.91 * t / (t60 * 0.18 / (1 + 0.15 * k)))
        slow = np.exp(-6.91 * t / (t60 / (1 + 0.09 * k)))
        e = 0.55 * fast + 0.45 * slow
        detune = 1 + rng.uniform(0.0003, 0.0011)
        ph = rng.uniform(0, 2 * np.pi)
        out += amp * e * (np.sin(2 * np.pi * fk * t + ph) + 0.6 * np.sin(2 * np.pi * fk * detune * t + ph))
    hammer = lowpass(rng.standard_normal(int(0.012 * SR)), 2500 + 3000 * vel) * np.linspace(1, 0, int(0.012 * SR))
    out[: len(hammer)] += hammer * 0.08 * vel
    # abafador: libera a nota ao fim da duração
    rel = int(dur * SR)
    if rel < n:
        out[rel:] *= np.exp(-np.arange(n - rel) / (0.35 * SR))
    out *= env_ar(n, 0.002, 0.05)
    return out * 0.22


def string_voice(f, dur, attack=1.2, release=1.8, bright=3500, vib=0.0045):
    """Uma seção de cordas: três instrumentos levemente desafinados, vibrato lento, arco suave."""
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v in range(3):
        rate = rng.uniform(4.6, 5.6)
        depth = vib * np.clip(t / 1.5, 0, 1)  # vibrato entra depois do ataque
        inst = f * (1 + rng.uniform(-0.003, 0.003)) * (1 + depth * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6)))
        ph = 2 * np.pi * np.cumsum(inst) / SR
        saw = 2 * ((ph / (2 * np.pi)) % 1.0) - 1
        out += saw
    out = lowpass(out, bright, order=2)
    out = highpass(out, max(40, f * 0.6), order=1)
    # arco: pequenas variações de pressão
    bow = 1 + 0.06 * lowpass(rng.standard_normal(n), 3)
    out *= env_ar(n, attack, release) * bow
    return out * 0.05


def timpani(f=hz("D2"), vel=0.7):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    pitch = f * (1 + 0.04 * np.exp(-t / 0.05))
    ph = 2 * np.pi * np.cumsum(pitch) / SR
    body = (np.sin(ph) + 0.5 * np.sin(1.5 * ph) + 0.3 * np.sin(1.99 * ph)) * np.exp(-t / 0.75)
    head = lowpass(rng.standard_normal(n), 900) * np.exp(-t / 0.03)
    return (body * 0.5 + head * 0.25) * vel * 0.35


def boom():
    n = int(5 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (38 + 14 * np.exp(-t / 0.25)) * t) * np.exp(-t / 1.6)
    air = lowpass(rng.standard_normal(n), 400) * np.exp(-t / 0.9) * 0.4
    return (sub + air) * 0.35


def swell(dur):
    """Respiração de ar crescente antes da pausa (sem riser eletrônico)."""
    n = int(dur * SR)
    x = bandpass(rng.standard_normal(n), 300, 4000)
    return x * np.linspace(0, 1, n) ** 3 * 0.05


# ------------------------------------------------------------------ harmonia

CHORDS = {
    "D": ["D3", "A3", "D4", "F#4", "A4"],
    "Dadd9": ["D3", "A3", "E4", "F#4", "A4"],
    "Gmaj7": ["G2", "D3", "B3", "F#4", "B4"],
    "G": ["G2", "D3", "B3", "D4", "G4"],
    "Bm": ["B2", "F#3", "B3", "D4", "F#4"],
    "Bm7": ["B2", "F#3", "A3", "D4", "F#4"],
    "A": ["A2", "E3", "A3", "C#4", "E4"],
    "Asus4": ["A2", "E3", "A3", "D4", "E4"],
    "D/F#": ["F#2", "D3", "A3", "D4", "F#4"],
    "Em": ["E2", "B2", "G3", "B3", "E4"],
    "A/C#": ["C#3", "E3", "A3", "C#4", "E4"],
}
BEAT = 60.0 / M["bpm"]
BAR = 4 * BEAT


def up(name, octaves=1):
    return name[:-1] + str(int(name[-1]) + octaves)


def compose_music():
    dry = stereo(N)
    strings = stereo(N)
    perc = stereo(N)

    # ATO 1 — piano minimalista, poucas notas, muito espaço.
    t = M["pianoIn"]
    for i, ch in enumerate(["Dadd9", "Gmaj7", "Bm7", "Asus4", "Dadd9", "Gmaj7"]):
        c = CHORDS[ch]
        if t > 23.6:
            break
        add(dry, piano(hz(c[0]), BAR * 0.95, 0.35), t, -0.3)
        for j, idx in enumerate([3, 4, 2] if i % 2 == 0 else [4, 3]):
            add(dry, piano(hz(up(c[idx])), BAR * 0.6, 0.28 + 0.03 * j), t + BEAT * (1.1 + j * 1.25), 0.25)
        t += BAR
    add(dry, piano(hz("A5"), 3.0, 0.22), 24.2, 0.35)  # nota suspensa: a imagem respira

    # ATO 2 — piano em arpejos, cordas entram e crescem.
    t = M["stringsIn"]
    prog = ["D", "Bm", "G", "A"]
    bar_i = 0
    while t < M["pauseStart"] - 0.2:
        ch = CHORDS[prog[bar_i % 4]]
        grow = np.clip((t - M["stringsIn"]) / (M["pauseStart"] - M["stringsIn"]), 0, 1)
        add(dry, piano(hz(ch[0]), BAR, 0.4 + 0.15 * grow), t, -0.35)
        pattern = [1, 2, 3, 4, 3, 2, 3, 4]
        for k, idx in enumerate(pattern):
            tt = t + k * BEAT / 2
            if tt >= M["pauseStart"] - 0.15:
                break
            add(dry, piano(hz(up(ch[idx]) if k in (3, 7) else ch[idx]), BEAT * 0.9, 0.24 + 0.14 * grow), tt, 0.1 + 0.15 * (k % 2))
        length = min(BAR, M["pauseStart"] - t) + 0.2
        g = 0.3 + 0.6 * grow
        add(strings, string_voice(hz(ch[1]), length, attack=1.6, release=0.25) * g, t, -0.4)
        add(strings, string_voice(hz(ch[3]), length, attack=1.6, release=0.25) * g, t, 0.4)
        if t >= M["buildFrom"]:
            add(strings, string_voice(hz(ch[0]) / 2, length, attack=1.0, release=0.25, bright=1500) * g * 1.3, t, 0.0)
            add(strings, string_voice(hz(up(ch[4])), length, attack=1.4, release=0.25, bright=5000) * g * 0.7, t, 0.2)
        t += BAR
        bar_i += 1
    add(dry, swell(2.2), M["pauseStart"] - 2.2, 0.0)

    # ATO 3 — clímax: tutti de cordas, piano em oitavas, tímpanos discretos.
    c0 = M["climax"]
    add(perc, boom(), c0)
    prog = ["G", "D/F#", "Em", "A", "Bm", "G", "D", "A"]
    t = c0
    for i, name in enumerate(prog):
        ch = CHORDS[name]
        # dinâmica: pleno no impacto, recua sob a narração central, cresce de novo até o fim do ato
        dyn = 1.35 * float(np.interp(t, [c0, c0 + 10, c0 + 14, c0 + 22, c0 + 27, c0 + 30], [1.0, 0.9, 0.62, 0.62, 0.95, 0.8]))
        add(strings, string_voice(hz(ch[0]) / 2, BAR + 0.3, 0.25 if i == 0 else 0.6, 0.6, 1300) * dyn * 1.5, t, 0)
        add(strings, string_voice(hz(ch[1]), BAR + 0.3, 0.2 if i == 0 else 0.5, 0.6, 2500) * dyn, t, -0.5)
        add(strings, string_voice(hz(ch[2]), BAR + 0.3, 0.2 if i == 0 else 0.5, 0.6, 3500) * dyn, t, 0.5)
        add(strings, string_voice(hz(up(ch[3])), BAR + 0.3, 0.3 if i == 0 else 0.6, 0.6, 5500) * dyn * 0.9, t, -0.25)
        add(strings, string_voice(hz(up(ch[4])), BAR + 0.3, 0.3 if i == 0 else 0.6, 0.6, 6000) * dyn * 0.8, t, 0.25)
        add(dry, piano(hz(ch[0]), BAR, 0.75 * dyn), t, -0.3)
        add(dry, piano(hz(up(ch[0])), BAR, 0.6 * dyn), t, -0.2)
        for k in range(4):  # piano em semínimas, acentuando o pulso dos cortes
            add(dry, piano(hz(up(ch[3 + (k % 2)])), BEAT, (0.5 if k == 0 else 0.36) * dyn), t + k * BEAT, 0.25)
        add(perc, timpani(hz(ch[0][:-1] + "2"), 0.75 * dyn), t)
        if i % 2 == 1:
            add(perc, timpani(hz(ch[0][:-1] + "2"), 0.35 * dyn), t + 3 * BEAT)
        t += BAR
    end3 = M["releaseFrom"]
    ch = CHORDS["D"]
    for idx, pan in zip(range(5), [0, -0.5, 0.5, -0.2, 0.2]):
        add(strings, string_voice(hz(ch[idx]) / (2 if idx == 0 else 1), end3 - t + 1.5, 0.8, 3.0, 3000) * 0.7, t, pan)
    add(dry, piano(hz("D2"), 4, 0.6), t, -0.3)
    add(dry, piano(hz("D5"), 4, 0.4), t + BEAT, 0.3)

    # ATO 4 — a música desacelera: arpejos em semínimas, depois em mínimas.
    t = end3 + 0.4
    prog = ["D", "A/C#", "Bm", "G"]
    i = 0
    while t < M["pianoSoloFrom"] - 1.0:
        ch = CHORDS[prog[i % 4]]
        slow = np.clip((t - end3) / (M["pianoSoloFrom"] - end3), 0, 1)
        step = BEAT * (1 + slow * 1.2)  # ritardando
        bar = step * 4
        add(dry, piano(hz(ch[0]), bar, 0.38), t, -0.35)
        for k, idx in enumerate([2, 3, 4, 3]):
            add(dry, piano(hz(ch[idx]), step * 1.4, 0.3 - 0.06 * slow), t + k * step, 0.15 + 0.1 * (k % 2))
        g = 0.55 * (1 - 0.6 * slow)
        add(strings, string_voice(hz(ch[1]), bar + 0.5, 1.8, 1.5, 2200) * g, t, -0.4)
        add(strings, string_voice(hz(ch[3]), bar + 0.5, 1.8, 1.5, 2600) * g, t, 0.4)
        t += bar
        i += 1

    # ATO 5 — piano sozinho, reverberação natural.
    p = M["pianoSoloFrom"]
    for k, name in enumerate(["D2", "A2", "F#3", "E4", "A4"]):
        add(dry, piano(hz(name), 6, 0.32), p + 0.4 + k * 0.22, -0.3 + k * 0.15)
    add(dry, piano(hz("F#5"), 3, 0.24), 131.2, 0.3)
    add(dry, piano(hz("E5"), 3, 0.2), 133.6, 0.2)
    add(dry, piano(hz("D5"), 4, 0.22), 135.4, 0.1)
    for k, name in enumerate(["D2", "D3", "A3", "F#4", "A4", "D5"]):
        add(dry, piano(hz(name), 6, 0.3 - k * 0.02), 138.8 + k * 0.09, -0.3 + k * 0.12)

    ir = church_ir(4.6)
    mix = reverb(dry, ir, wet=0.55) + reverb(strings, ir, wet=0.7) + reverb(perc, ir, wet=0.45)
    # pausa musical antes da frase principal: o silêncio também é música
    t = np.arange(N) / SR
    gate = np.ones(N)
    a, b = M["pauseStart"], M["climax"]
    gate = np.where((t >= a) & (t < b - 0.01), np.clip(1 - (t - a) / 0.18, 0, 1), gate)
    mix *= gate[:, None]
    mix *= np.clip((DUR - t) / 2.0, 0, 1)[:, None] ** 2  # fim
    return mix


# ------------------------------------------------------------------ ambiente e foley

def church_ambience():
    n = N
    tone = stereo(n)
    pink = signal.lfilter([0.049922, -0.095993, 0.050612, -0.004408], [1, -2.494956, 2.017265, -0.522189],
                          rng.standard_normal((n, 2)), axis=0)
    tone += lowpass(highpass(pink, 40), 700) * 0.06
    # ar externo distante, muito filtrado (cidade atrás das paredes de pedra)
    tone += lowpass(rng.standard_normal((n, 2)), 180) * 0.012
    ir = church_ir(4.2)
    events = stereo(n)
    for tt, f0 in [(9.6, 210), (38.0, 180), (96.0, 230), (124.0, 200)]:  # rangido distante de banco
        add(events, creak(0.45, f0) * 0.18, tt, rng.uniform(-0.7, 0.7))
    for ev in TL["sfx"]:
        if ev["type"] == "murmur":
            add(events, murmur(ev["dur"]) * ev["gain"] * 0.3, ev["t"])
    amb = tone + reverb(events, ir, wet=0.9, dry_gain=0.25)
    t = np.arange(n) / SR
    fade_in = np.clip((t - 0.8) / 2.6, 0, 1) ** 2
    fade_out = np.clip((DUR - 0.3 - t) / 6.0, 0, 1) ** 1.5  # o som da igreja desaparece lentamente
    return amb * (fade_in * fade_out)[:, None]


def creak(dur, f0=200.0):
    """Atrito madeira-madeira: trem de impulsos de taxa variável passando por ressonâncias."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rate = f0 * (1 + 0.35 * np.sin(2 * np.pi * 1.7 * t) + 0.15 * rng.standard_normal(n).cumsum() / np.sqrt(n))
    ph = np.cumsum(rate) / SR
    pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float)
    x = bandpass(pulses, 400, 1800, 2) + 0.5 * bandpass(pulses, 2200, 3200, 2)
    return x * env_ar(n, 0.05, 0.12)


def murmur(dur):
    """Comunidade conversando baixinho ao fundo: fontes com formantes e sílabas aleatórias."""
    n = int(dur * SR)
    out = stereo(n)
    for v in range(14):
        src = rng.standard_normal(n)
        f1 = rng.uniform(350, 800)
        f2 = rng.uniform(1100, 2300)
        voice = bandpass(src, f1 * 0.8, f1 * 1.25) + 0.6 * bandpass(src, f2 * 0.85, f2 * 1.15)
        syll = lowpass(np.clip(rng.standard_normal(n), 0, None), rng.uniform(3, 6), 2)
        phrase = lowpass((rng.random(n) < 1 / SR).astype(float).cumsum() % 2, 0.6, 1)
        add(out, voice * syll * (0.3 + 0.7 * phrase), 0, rng.uniform(-0.8, 0.8))
    out = lowpass(out, 2600)
    return out / (np.max(np.abs(out)) + 1e-9) * 0.5 * env_ar(n, 3.0, 4.0)[:, None]


def footsteps(start, dur):
    sig = stereo(int((dur + 1) * SR))
    t, k = 0.0, 0
    while t < dur:
        n = int(0.09 * SR)
        tt = np.arange(n) / SR
        heel = lowpass(rng.standard_normal(n), 1400) * np.exp(-tt / 0.012)
        heel += np.sin(2 * np.pi * 95 * tt) * np.exp(-tt / 0.02) * 0.6
        toe = lowpass(rng.standard_normal(n), 2400) * np.exp(-tt / 0.008) * 0.5
        near = 0.35 + 0.65 * (t / dur)  # alguém se aproxima pela nave
        add(sig, heel * near, t, -0.2 + 0.3 * (k % 2))
        add(sig, toe * near, t + 0.07, -0.2 + 0.3 * (k % 2))
        t += rng.uniform(0.56, 0.64)
        k += 1
    return lowpass(sig, 3500)


def door():
    out = stereo(int(3.2 * SR))
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    latch = bandpass(rng.standard_normal(n), 1500, 6000) * np.exp(-tt / 0.006)
    latch += np.sin(2 * np.pi * 820 * tt) * np.exp(-tt / 0.02) * 0.3
    add(out, latch * 0.8, 0.0, 0.3)
    add(out, creak(1.7, 140) * 0.55, 0.25, 0.25)
    whoosh = lowpass(rng.standard_normal(int(2.2 * SR)), 900) * env_ar(int(2.2 * SR), 0.6, 1.3) * 0.12
    add(out, whoosh, 0.5, 0.0)
    return out


def zipper(dur=0.75):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rate = 260 + 140 * np.sin(np.pi * t / dur)
    ph = np.cumsum(rate) / SR
    clicks = (np.diff(np.floor(ph), prepend=0) > 0).astype(float) * (0.6 + 0.4 * rng.random(n))
    return bandpass(clicks, 2000, 7000) * env_ar(n, 0.05, 0.15) * 1.4


def focus_ring(dur):
    n = int(dur * SR)
    out = np.zeros(n)
    t = 0.05
    while t < dur - 0.05:
        i = int(t * SR)
        m = int(0.004 * SR)
        out[i:i + m] += bandpass(rng.standard_normal(m), 3000, 9000, 1) * np.linspace(1, 0, m)
        t += rng.uniform(0.05, 0.14)
    return out * 0.8


def shutter():
    """Câmera: espelho + cortina (dois cliques com 55 ms) e o corpo da câmera ressoando."""
    n = int(0.35 * SR)
    out = np.zeros(n)
    for off, g in [(0.0, 1.0), (0.055, 0.75)]:
        i = int(off * SR)
        m = int(0.03 * SR)
        tt = np.arange(m) / SR
        c = bandpass(rng.standard_normal(m), 1800, 7500) * np.exp(-tt / 0.004)
        c += np.sin(2 * np.pi * 1250 * tt) * np.exp(-tt / 0.01) * 0.25
        c += np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.012) * 0.35
        out[i:i + m] += c * g
    return out * 0.9


def compose_foley():
    dry = stereo(N)
    for ev in TL["sfx"]:
        kind, t, g = ev["type"], ev["t"], ev.get("gain", 0.5)
        if kind == "footsteps":
            add(dry, footsteps(t, ev["dur"]) * g, t)
        elif kind == "door":
            add(dry, door() * g, t)
        elif kind == "zipper":
            add(dry, zipper() * g, t, 0.15)
        elif kind == "focusRing":
            add(dry, focus_ring(ev["dur"]) * g, t, 0.1)
        elif kind == "shutter":
            add(dry, shutter() * g, t, rng.uniform(-0.15, 0.15))
    return reverb(dry, church_ir(3.6, size=0.6), wet=0.32)


# ------------------------------------------------------------------ saída

def write_mp3(path, x, peak_db):
    x = x / (np.max(np.abs(x)) + 1e-12) * 10 ** (peak_db / 20)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "out.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "320k", path], check=True)
    print("ok", os.path.relpath(path, ROOT), f"{len(x) / SR:.1f}s")


if __name__ == "__main__":
    out = os.path.join(ROOT, "public", "assets", "audio")
    write_mp3(os.path.join(out, "music", "score.mp3"), compose_music(), -1.0)
    write_mp3(os.path.join(out, "ambience", "church-ambience.mp3"), church_ambience(), -9.0)
    write_mp3(os.path.join(out, "sfx", "foley.mp3"), compose_foley(), -3.0)
