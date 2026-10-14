"""Gera a trilha e os efeitos sonoros da campanha DISANTOS.

Todo o áudio é sintetizado aqui (senoides, ruído filtrado e envelopes), por isso
não há licença de terceiros envolvida. Para trocar por música licenciada,
coloque o arquivo em public/audio/trilha-licenciada.mp3 (ver README).

Uso: python3 scripts/gerar-audio.py
"""
import os
import wave

import numpy as np

SR = 48000
DUR = 20.0  # duração total da campanha, em segundos (600 frames a 30 FPS)
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
RNG = np.random.default_rng(1956)  # semente fixa: o áudio é reprodutível


def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def env(length, attack, release):
    e = np.ones(length)
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a)
    e[-r:] = np.linspace(1, 0, r)
    return e


def place(buf, sig, start):
    i = int(start * SR)
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def stereo(mono, pan=0.0):
    left = mono * (1 - max(pan, 0) * 0.5)
    right = mono * (1 - max(-pan, 0) * 0.5)
    return np.stack([left, right], axis=1)


def write_wav(name, data):
    data = np.clip(data, -1, 1)
    pcm = (data * 32767).astype("<i2")
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"  {name}: {len(data) / SR:.2f}s")


def note(freq, t, partials=((1, 1.0), (2, 0.35), (3, 0.12))):
    out = np.zeros_like(t)
    for k, amp in partials:
        out += amp * np.sin(2 * np.pi * freq * k * t)
    return out


def smooth_noise(n, cut):
    """Ruído passa-baixas por média móvel (barato e vetorizado)."""
    white = RNG.standard_normal(n + cut)
    kernel = np.ones(cut) / cut
    return np.convolve(white, kernel, mode="valid")[:n]


def trilha():
    """Cama musical de 20 s: ambiência grave, acordes que crescem e sinos esparsos."""
    n = int(DUR * SR)
    t = t_axis(DUR)
    mix = np.zeros((n,))

    # Ambiência grave (ruído marrom muito baixo, cresce com o tempo)
    brown = np.cumsum(RNG.standard_normal(n))
    brown = brown - np.linspace(brown[0], brown[-1], n)
    brown /= np.max(np.abs(brown)) + 1e-9
    amb_env = np.clip(t / 3.0, 0, 1) * (1 - np.clip((t - 18.5) / 1.5, 0, 1))
    mix += 0.10 * brown * amb_env

    # Progressão: Dm7 -> Bb -> Gm, com crescimento de volume até o clímax
    chords = [
        (0.0, 12.0, [146.83, 174.61, 220.00, 261.63], 0.20),  # Dm7 (D F A C)
        (12.0, 16.0, [116.54, 146.83, 174.61], 0.30),        # Bb (Bb D F)
        (16.0, 20.0, [196.00, 233.08, 293.66], 0.36),        # Gm (G Bb D)
    ]
    for start, end, freqs, level in chords:
        seg_t = t[int(start * SR): int(end * SR)] - start
        seg = np.zeros_like(seg_t)
        for f in freqs:
            detune = 1.0 + RNG.uniform(-0.002, 0.002)
            seg += note(f, seg_t, ((1, 1.0), (2, 0.25), (3, 0.06)))
            seg += 0.6 * note(f * detune, seg_t, ((1, 1.0), (2, 0.2)))
        seg *= env(len(seg_t), 2.2, 1.8) * level / len(freqs)
        place(mix, seg, start)

    # Drone grave em D2 que sustenta a peça toda
    drone = 0.6 * np.sin(2 * np.pi * 73.42 * t) + 0.25 * np.sin(2 * np.pi * 110.0 * t)
    drone *= np.clip(t / 4.0, 0, 1) * 0.10
    mix += drone

    # Sinos esparsos (síntese de sino com parciais inarmônicos)
    bells = [(4.5, 293.66), (9.0, 440.0), (14.4, 349.23), (17.9, 587.33)]
    for when, f in bells:
        bt = t_axis(4.0)
        bell = (
            1.00 * np.sin(2 * np.pi * f * bt)
            + 0.45 * np.sin(2 * np.pi * f * 2.76 * bt)
            + 0.25 * np.sin(2 * np.pi * f * 5.40 * bt)
        )
        bell *= np.exp(-bt * 1.4) * 0.16
        place(mix, bell, when)

    # Pulso grave suave a partir de 12 s, para dar força sem bater de frente com a narração
    kick_env = np.exp(-np.linspace(0, 1, int(0.35 * SR)) * 9)
    kick_t = t_axis(0.35)
    kick = np.sin(2 * np.pi * (58 - 18 * np.linspace(0, 1, len(kick_t))) * kick_t) * kick_env
    for when in np.arange(12.0, 19.6, 0.75):
        gain = 0.10 + 0.05 * (when - 12) / 8
        place(mix, kick * gain, when)

    # Entrada e saída
    mix *= env(n, 0.6, 1.4)
    mix *= 0.85 / (np.max(np.abs(mix)) + 1e-9)
    write_wav("trilha.wav", stereo(mix, 0.0))


def whoosh():
    """Varredura de ar (1,2 s) para as viradas de corte."""
    n = int(1.2 * SR)
    noise = RNG.standard_normal(n + 120)
    short = np.convolve(noise, np.ones(4) / 4, mode="valid")[:n]
    long_ = np.convolve(noise, np.ones(40) / 40, mode="valid")[:n]
    k = np.linspace(0, 1, n)
    sig = short * (1 - k) + long_ * k  # passa de agudo a grave
    sig *= np.sin(np.pi * k) ** 1.6 * 0.9
    sig /= np.max(np.abs(sig)) + 1e-9
    write_wav("whoosh.wav", stereo(sig * 0.7, 0.0))


def impacto():
    """Impacto grave com sub-sweep e transiente curto (2 s)."""
    n = int(2.0 * SR)
    t = t_axis(2.0)
    f = 90 * np.exp(-t * 3.0) + 32
    phase = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(phase) * np.exp(-t * 2.4)
    click = smooth_noise(n, 6) * np.exp(-t * 90)
    sig = 0.9 * sub + 0.18 * click
    sig /= np.max(np.abs(sig)) + 1e-9
    write_wav("impacto.wav", stereo(sig * 0.95, 0.0))


def assinatura():
    """Assinatura final: sino grave refinado (3 s)."""
    t = t_axis(3.0)
    bell = (
        np.sin(2 * np.pi * 220.0 * t)
        + 0.45 * np.sin(2 * np.pi * 220.0 * 2.76 * t)
        + 0.22 * np.sin(2 * np.pi * 220.0 * 5.4 * t)
    )
    bell *= np.exp(-t * 1.3) * 0.5
    bell += 0.4 * np.sin(2 * np.pi * 329.63 * t) * np.exp(-t * 1.6) * 0.3
    bell *= env(len(t), 0.005, 1.2)
    bell /= np.max(np.abs(bell)) + 1e-9
    write_wav("assinatura.wav", stereo(bell * 0.7, 0.0))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print("Gerando áudio original (sem licença de terceiros):")
    trilha()
    whoosh()
    impacto()
    assinatura()
    print("Pronto.")
