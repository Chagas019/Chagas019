"""PAFIES 2027 - Sound design 100% sintetizado (original, sem samples de terceiros).
Gera: stems/*.wav + trilha_mix.wav (48 kHz, estereo).  Executar: python3 sound_design.py
"""
import json, os, wave
import numpy as np

D = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(D, "cues.json")))
SR, DUR = 48000, C["duracao"]
N = int(SR * DUR)
rng = np.random.default_rng(2027)
os.makedirs(os.path.join(D, "stems"), exist_ok=True)


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def lp(x, fc):
    """Passa-baixa via FFT (corte suave)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def hp(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def bp(x, f0, q=1.0):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= np.exp(-((np.log2(np.maximum(f, 1) / f0)) ** 2) * q * 2)
    return np.fft.irfft(X, len(x))


def conv(x, ir):
    n = len(x) + len(ir)
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]


def reverb_ir(sec=2.2, decay=3.0):
    t = t_(sec)
    ir = rng.standard_normal((2, len(t))) * np.exp(-decay * t)
    ir = np.array([lp(ir[0], 6000), lp(ir[1], 6000)])
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


IR = reverb_ir()


def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= buf.shape[1]:
        return
    sig = sig[: buf.shape[1] - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    if sig.ndim == 1:
        buf[0, i:i + len(sig)] += sig * gain * l * 1.41
        buf[1, i:i + len(sig)] += sig * gain * r * 1.41
    else:
        buf[:, i:i + sig.shape[1]] += sig * gain


# ---------- SFX ----------
def heartbeat(strong=True):
    t = t_(0.45)
    f = 55 * np.exp(-t * 3) + 32
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (14 if strong else 18))
    click = lp(rng.standard_normal(len(t)), 300) * np.exp(-t * 60) * 0.6
    return np.tanh((s + click) * 1.8) * (1.0 if strong else 0.7)


def impact(big=False):
    L = 2.8 if big else 1.6
    t = t_(L)
    f = (110 if big else 90) * np.exp(-t * 5) + 28
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (1.6 if big else 2.6))
    nz = lp(rng.standard_normal(len(t)), 2500 if big else 1800) * np.exp(-t * 9)
    crack = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 40) * 0.5
    dry = np.tanh((sub * 1.4 + nz * 0.8 + crack) * 1.5)
    wet = np.array([conv(dry, IR[0]), conv(dry, IR[1])]) * 0.5
    return np.array([dry, dry]) * 0.8 + wet


def whoosh(L=0.55):
    t = t_(L)
    env = np.sin(np.pi * t / L) ** 2 * np.exp(-((t / L - 0.65) ** 2) * 2)
    nz = rng.standard_normal(len(t))
    lo, hi_ = bp(nz, 700, 0.8), bp(nz, 2600, 0.8)
    mix = (lo * (1 - t / L) + hi_ * (t / L)) * env
    pan = np.linspace(-0.8, 0.8, len(t))
    return np.array([mix * np.sqrt((1 - pan) / 2), mix * np.sqrt((1 + pan) / 2)]) * 1.6


def riser(L):
    t = t_(L)
    nz = rng.standard_normal(len(t))
    sweep = hp(nz, 400) * (t / L) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / L) ** 2) / SR) * (t / L) ** 3 * 0.35
    s = lp(sweep, 9000) * 0.5 + tone
    return np.array([s, s]) * 0.9


# ---------- MUSICA (120 BPM) ----------
def saw(freq, t):
    ph = np.cumsum(np.full(len(t), freq) if np.isscalar(freq) else freq) / SR
    return 2 * (ph % 1) - 1


def kick():
    t = t_(0.4)
    f = 150 * np.exp(-t * 28) + 45
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 2.2)


def clap():
    t = t_(0.3)
    e = np.exp(-t * 22) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 30) * (t > 0.012)
    return bp(rng.standard_normal(len(t)), 1500, 1.2) * e * 1.4


def hat():
    t = t_(0.08)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 60) * 0.5


def note(n):  # MIDI -> Hz
    return 440 * 2 ** ((n - 69) / 12)


# progressao Am - F - C - G (1 compasso = 2 s)
PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
BASS = [45, 41, 48, 43]


def music():
    m0 = C["musica_inicio"]
    beat = 60 / C["bpm"]
    drums = np.zeros((2, N)); bass = np.zeros((2, N)); pad = np.zeros((2, N)); arp = np.zeros((2, N))
    K, CL, H = kick(), clap(), hat()
    side = np.ones(N)
    nb = int((DUR - m0) / beat)
    for b in range(nb):
        at = m0 + b * beat
        sec = "s2" if at < 14 else "s3" if at < 23 else "s4" if at < 32 else "s5"
        if at >= 31.0 and at < 32.0:   # respiro antes do drop final
            continue
        full = sec in ("s2", "s4", "s5")
        if full or b % 2 == 0:
            place(drums, K, at, 0.8)
            i = int(at * SR); L = int(0.25 * SR)
            side[i:i + L] = np.minimum(side[i:i + L], 0.35 + 0.65 * np.linspace(0, 1, L) ** 0.6)
        if b % 2 == 1 and sec != "s3":
            place(drums, CL, at, 0.55, 0.0)
        if full:
            place(drums, H, at + beat / 2, 0.45, 0.3)
            if sec == "s4":
                place(drums, H, at + beat / 4, 0.25, -0.3)
                place(drums, H, at + 3 * beat / 4, 0.25, -0.3)
    # baixo, pad e arpejo por compasso
    bar = 4 * beat
    nbar = int(np.ceil((DUR - m0) / bar))
    for k in range(nbar):
        at = m0 + k * bar
        ch, bn = PROG[k % 4], BASS[k % 4]
        t = t_(bar)
        # baixo em colcheias com envelope
        bl = np.zeros(len(t))
        for e in range(8):
            i = int(e * beat / 2 * SR); L = int(beat / 2 * SR)
            tt = t_(beat / 2)
            bl[i:i + L] += (np.sin(2 * np.pi * note(bn) * tt) + 0.4 * saw(note(bn), tt)) * np.exp(-tt * 5)
        place(bass, lp(bl, 500), at, 0.55)
        # pad supersaw
        p = np.zeros(len(t))
        for n in ch + [ch[0] + 12]:
            for dt in (-0.12, 0, 0.12):
                p += saw(note(n) * 2 ** (dt / 12), t)
        p = lp(p, 1600 if at < 23 else 2600) * np.minimum(1, t / 0.15) * np.minimum(1, (bar - t) / 0.1)
        place(pad, p, at, 0.07)
        # arpejo pluck em semicolcheias (cenas 2, 4, 5)
        if not (14 <= at < 23) or at >= 18:
            for s in range(16):
                n = (ch + [ch[0] + 12])[s % 4] + 12
                tt = t_(beat / 4)
                pl = saw(note(n), tt) * np.exp(-tt * 18)
                place(arp, lp(pl, 3500), at + s * beat / 4, 0.3, 0.35 if s % 2 else -0.35)
    pad *= side; bass *= side
    padw = np.array([conv(pad[0], IR[0]), conv(pad[1], IR[1])]) * 0.6
    arpw = np.array([conv(arp[0], IR[1]), conv(arp[1], IR[0])]) * 0.5
    # drone tenso da abertura (0-6 s)
    t = t_(6.0)
    dr = (np.sin(2 * np.pi * 55 * t) + 0.5 * lp(saw(110.3, t), 400)) * np.minimum(1, t / 2) * 0.18
    drone = np.zeros((2, N)); place(drone, dr, 0.0, 1.0)
    mus = drums + bass + pad + padw + arp + arpw + drone
    # fade final
    f0 = int(38.4 * SR)
    mus[:, f0:] *= np.linspace(1, 0, N - f0) ** 1.5
    return {"bateria": drums, "baixo": bass, "pad": pad + padw, "arpejo": arp + arpw, "drone": drone}, mus


def write(name, x):
    x = np.clip(x, -1, 1)
    y = (x.T * 32767).astype("<i2")
    with wave.open(os.path.join(D, name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def main():
    sfx = np.zeros((2, N))
    for i, at in enumerate(C["heartbeat"]):
        place(sfx, heartbeat(i % 2 == 0), at, 0.9)
    for at in C["impact"]:
        big = at in C["impact_grande"]
        place(sfx, impact(big), at - 0.01, 0.75 if big else 0.5)
    for at in C["whoosh"]:
        place(sfx, whoosh(), at - 0.35, 0.33)
    for a, b in C["riser"]:
        place(sfx, riser(b - a), a, 0.33)
    stems, mus = music()
    for k, v in stems.items():
        write(f"stems/musica_{k}.wav", v / max(1e-9, np.abs(v).max()) * 0.9)
    write("stems/sfx.wav", sfx / np.abs(sfx).max() * 0.9)
    mix = mus * 0.85 + sfx
    mix = np.tanh(mix * 1.1)
    mix = mix / np.abs(mix).max() * 0.89  # ~ -1 dBFS
    write("trilha_mix.wav", mix)
    print("audio ok", mix.shape)


if __name__ == "__main__":
    main()
