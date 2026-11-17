"""SANTORAMA — trilha original + efeitos sonoros + mixagem.

Tudo é sintetizado aqui (síntese aditiva + reverb por convolução), então a trilha
é 100% original e livre de direitos. A estrutura segue as cenas de timings.json:
suspense -> calor -> movimento -> escuridão -> tensão -> silêncio/escolha ->
luto -> esperança (ré maior) -> contemplação.

Saídas (episodes/<ep>/audio/): music.wav, sfx.wav, events.json, mix.wav
Uso: python3 -I tools/build_score.py 001-sao-maximiliano-kolbe
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)
NOTE = {n: i for i, n in enumerate("C C# D D# E F F# G G# A A# B".split())}


def hz(name):  # "D3", "A#2"
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] + 12 * (o + 1) - 69) / 12)


def env(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, sus, na) ** 1.6
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 1.4
    return e


def tone(f, dur, harm, a=0.8, r=1.2, detune=(0,), vib=0.0, decay=None):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for d in detune:
        ph0 = rng.uniform(0, 6.28)
        fv = f * 2 ** (d / 1200) * (1 + vib * np.sin(2 * np.pi * 5.1 * t + ph0))
        phase = 2 * np.pi * np.cumsum(fv) / SR
        for k, amp in enumerate(harm, 1):
            if f * k > 16000: break
            out += amp * np.sin(k * phase + ph0 * k)
    out /= len(detune) * max(1e-9, sum(harm))
    e = env(n, a, r)
    if decay: e *= np.exp(-t / decay)
    return out * e


STR = [1, .55, .38, .27, .2, .15, .11, .08, .06, .05]
CELLO = [1, .7, .5, .35, .25, .18, .12, .09]
CHOIR = [1, .35, .5, .12, .3, .06, .1, .04]  # vogal "ah" aproximada
PIANO = [1, .45, .25, .12, .08, .05]
BELL = [1, 0, .6, 0, .3, .25, 0, .15]


class Track:
    def __init__(self, dur):
        self.L = np.zeros(int(dur * SR) + SR * 6); self.R = np.zeros_like(self.L)

    def add(self, x, t, g=1.0, pan=0.0):
        i = int(t * SR); x = x[: max(0, len(self.L) - i)]
        self.L[i:i + len(x)] += x * g * (1 - pan) ** .5 * 1.0
        self.R[i:i + len(x)] += x * g * (1 + pan) ** .5 * 1.0


def strings(tr, notes, t, dur, g=.12, a=1.2, r=1.5, harm=STR, vib=.004):
    for j, nm in enumerate(notes):
        x = tone(hz(nm), dur, harm, a, r, detune=(-7, 0, 6, 11), vib=vib)
        tr.add(x, t, g, pan=(j / max(1, len(notes) - 1) - .5) * .7)


def noise(dur, lo, hi):
    n = int(dur * SR); X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(X, n); return x / (np.abs(x).max() + 1e-9)


def reverb(x, secs=3.2, wet=.35):
    n = int(secs * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / (secs / 6.5)); ir[: int(.012 * SR)] = 0; ir /= np.abs(ir).sum() ** .5 * 4
    m = len(x) + n; F = 1 << (m - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[: len(x)]
    return x * (1 - wet) + y * wet / (np.abs(y).max() + 1e-9) * np.abs(x).max()


def main(epname):
    ep = os.path.join(ROOT, "episodes", epname)
    T = json.load(open(os.path.join(ep, "audio", "timings.json"), encoding="utf-8"))
    S = {s["id"]: s for s in T["scenes"]}; D = T["duration"]
    cue = lambda i: T["cues"][i]
    word = lambda i, w: next(x["start"] for x in cue(i)["words"] if w in x["w"])

    # ---- eventos que a imagem e o som compartilham ----
    ev = {
        "titleHit": 0.25,
        "numberStamp": word(8, "16670"),
        "stepForward": cue(12)["start"] + 0.55,
        "doorClose": cue(16)["start"] - 0.9,
        "goldenReveal": S["s8-mensagem"]["start"] + 0.2,
        "logoHit": S["s10-final"]["start"] + 0.15,
    }
    json.dump(ev, open(os.path.join(ep, "audio", "events.json"), "w"), indent=1)

    mu = Track(D)
    s = lambda k: S[k]["start"]; e = lambda k: S[k]["end"]
    # 1 SUSPENSE — drone grave + harmônico agudo instável
    strings(mu, ["D2", "A2"], 0, e("s1-gancho") + 1.5, g=.16, a=2.5, r=2.0, harm=CELLO)
    mu.add(tone(hz("D#5"), 7, STR[:3], 3, 2, detune=(-12, 9), vib=.006), .5, .035, .4)
    mu.add(tone(hz("D1"), 3, [1, .3], .01, 2.6, decay=1.2), ev["titleHit"], .35)
    # 2 CALOR — Dm Bb F com piano
    t0 = s("s2-quem"); step = (e("s2-quem") - t0) / 3
    for j, ch in enumerate([["D3", "F3", "A3"], ["A#2", "D3", "F3"], ["F2", "C3", "A3"]]):
        strings(mu, ch, t0 + j * step - .3, step + 1.4, g=.07, a=1.0, r=1.3)
    for j, nm in enumerate(["A4", "D5", "C5", "A4", "F4", "G4", "A4"]):
        mu.add(tone(hz(nm), 2.4, PIANO, .005, 1.5, decay=.9), t0 + .5 + j * step * 3 / 7.5, .07, .2)
    # 3 MOVIMENTO — ostinato a 100 bpm
    t0, t1 = s("s3-missao"), e("s3-missao"); beat = 60 / 100 / 2
    prog = [["D3", "F3", "A3"], ["F2", "A2", "C3"], ["C3", "E3", "G3"], ["A#2", "D3", "F3"]]
    bar = (t1 - t0) / 4
    for j, ch in enumerate(prog):
        strings(mu, ch, t0 + j * bar - .2, bar + .9, g=.06, a=.4, r=.8)
        root = ch[0][:-1] + "2"
        k = 0
        while k * beat < bar:
            mu.add(tone(hz(root), .22, CELLO, .01, .12, detune=(-5, 5)), t0 + j * bar + k * beat, .09 if k % 2 == 0 else .06)
            k += 1
    # 4 ESCURIDÃO — cluster grave, batidas de tímpano, pulso cardíaco
    t0, t1 = s("s4-guerra"), e("s4-guerra")
    strings(mu, ["D2", "D#2", "A2"], t0 - .3, t1 - t0 + 1.2, g=.11, a=2.0, r=1.5, harm=CELLO)
    strings(mu, ["G#4"], t0 + 3, t1 - t0 - 2, g=.03, a=3, r=2)
    for hit in [t0 + .1, ev["numberStamp"]]:
        mu.add(tone(hz("D1"), 3.5, [1, .5, .2], .005, 3, decay=1.0) + noise(3.5, 30, 160) * np.exp(-np.arange(int(3.5 * SR)) / SR / .25) * .5, hit, .45)
    # 5 TENSÃO — ostinato crescente + segunda menor no agudo
    t0, t1 = s("s5-escolha"), e("s5-escolha"); k = 0; beat = 60 / 112 / 2
    while t0 + k * beat < t1 - .4:
        p = k * beat / (t1 - t0)
        mu.add(tone(hz("D2"), .2, CELLO, .005, .1, detune=(-6, 6)), t0 + k * beat, .05 + .09 * p)
        k += 1
    strings(mu, ["D3", "A3"], t0, t1 - t0 + .5, g=.07, a=2, r=1)
    strings(mu, ["D5", "D#5"], t0 + 4, t1 - t0 - 3.2, g=.035, a=4, r=.6, vib=.008)
    # 6 A ESCOLHA — silêncio, nota única, depois abertura calorosa
    t0, t1 = s("s6-sacrificio"), e("s6-sacrificio")
    mu.add(tone(hz("A5"), t1 - t0 + 1, STR[:4], 1.5, 2, detune=(-4, 4), vib=.003), t0 + .2, .04)
    strings(mu, ["A#2", "F3", "D4"], ev["stepForward"] + 1.2, 3.6, g=.08, a=1.6, r=1.4)
    strings(mu, ["F2", "C4", "A4"], ev["stepForward"] + 4.4, t1 - ev["stepForward"] - 2.8, g=.08, a=1.4, r=1.6)
    # 7 LUTO — Dm Gm com melodia de violoncelo
    t0, t1 = s("s7-ultima-prova"), e("s7-ultima-prova"); half = (t1 - t0) / 2
    strings(mu, ["D3", "F3", "A3"], t0 - .2, half + 1, g=.06, a=1.5, r=1.4)
    strings(mu, ["G2", "A#2", "D3"], t0 + half - .2, half + 1, g=.06, a=1.5, r=1.4)
    for j, (nm, d) in enumerate([("A3", 1.6), ("A#3", 1.0), ("A3", 1.2), ("G3", 1.8), ("F3", 1.4), ("E3", 1.0), ("D3", 2.8)]):
        mu.add(tone(hz(nm), d + .6, CELLO, .25, .6, detune=(-3, 3), vib=.006), t0 + .6 + sum(x[1] for x in [("A3", 1.6), ("A#3", 1.0), ("A3", 1.2), ("G3", 1.8), ("F3", 1.4), ("E3", 1.0), ("D3", 2.8)][:j]), .06, -.2)
    # 8 ESPERANÇA — ré maior, coro e sinos
    t0, t1 = s("s8-mensagem"), e("s8-mensagem"); q = (t1 - t0) / 4
    for j, ch in enumerate([["D3", "A3", "F#4"], ["G2", "D3", "B3"], ["B2", "F#3", "D4"], ["A2", "E3", "C#4"]]):
        strings(mu, ch, t0 + j * q - .3, q + 1.4, g=.075, a=1.1, r=1.2)
        strings(mu, [ch[1][:-1] + "4", ch[2][:-1] + "5"], t0 + j * q, q + 1.2, g=.035, a=1.2, r=1.2, harm=CHOIR, vib=.007)
    for j, nm in enumerate(["D6", "A5", "F#6", "E6"]):
        mu.add(tone(hz(nm), 4, BELL, .002, 3, decay=1.3), ev["goldenReveal"] + j * q, .035, .5 - j * .3)
    # 9-10 CONTEMPLAÇÃO — ré maior sustentado + motivo de piano
    t0 = s("s9-versiculo")
    strings(mu, ["D3", "A3", "D4", "F#4"], t0 - .3, D - t0 + 1, g=.065, a=1.6, r=4.5)
    strings(mu, ["A4", "D5"], t0, D - t0, g=.025, a=2.5, r=4, harm=CHOIR, vib=.006)
    for j, nm in enumerate(["F#5", "E5", "D5", "A4", "B4", "A4", "F#4", "D5"]):
        mu.add(tone(hz(nm), 3, PIANO, .005, 2, decay=1.1), t0 + .8 + j * 1.25, .06, .25)
    mu.add(tone(hz("D2"), 6, BELL, .002, 5, decay=2.2), ev["logoHit"], .14)

    L, R = reverb(mu.L, 3.6, .42), reverb(mu.R, 3.9, .42)
    music = np.stack([L, R], 1)[: int((D + 1.5) * SR)]
    fade = int(2.5 * SR); music[-fade:] *= np.linspace(1, 0, fade)[:, None]
    music /= np.abs(music).max() + 1e-9
    sf.write(os.path.join(ep, "audio", "music.wav"), music * .89, SR)

    # ---- EFEITOS SONOROS ----
    fx = Track(D)
    for k, (lo, hi, g) in {"s1-gancho": (80, 900, .05), "s4-guerra": (60, 700, .04), "s5-escolha": (60, 600, .035), "s7-ultima-prova": (50, 400, .03)}.items():
        dur = e(k) - s(k) + 1
        w = noise(dur, lo, hi) * (0.6 + 0.4 * np.sin(np.linspace(0, 5, int(dur * SR)))) * env(int(dur * SR), 1, 1)
        fx.add(w, s(k), g, rng.uniform(-.3, .3))
    for b in [x["start"] for x in T["scenes"][1:]]:  # whoosh nas transições
        n = int(1.1 * SR); w = noise(1.1, 300, 5000) * np.sin(np.linspace(0, np.pi, n)) ** 3
        fx.add(w, b - .6, .05, rng.uniform(-.5, .5))
    t0, t1 = s("s3-missao"), e("s3-missao"); k = 0  # prensa tipográfica
    while t0 + .3 + k * .3 < t1 - .2:
        n = int(.09 * SR); c = noise(.09, 800, 6000) * np.exp(-np.arange(n) / SR / .012)
        fx.add(c + tone(160, .09, [1, .5], .001, .05, decay=.02) * .6, t0 + .3 + k * .3, .07 if k % 2 else .1, .2)
        k += 1
    n = int(.15 * SR)  # carimbo do número
    fx.add(noise(.15, 60, 2500) * np.exp(-np.arange(n) / SR / .03), ev["numberStamp"], .45)
    for j in range(4):  # passos no cascalho
        n = int(.22 * SR); fx.add(noise(.22, 150, 3500) * np.exp(-np.arange(n) / SR / .045), ev["stepForward"] + j * .62, .2 + .03 * j, -.1 + .05 * j)
    n = int(2.6 * SR)  # porta de ferro + ferrolho
    fx.add(noise(2.6, 30, 600) * np.exp(-np.arange(n) / SR / .35) + tone(55, 2.6, [1, .4, .3], .002, 2, decay=.6), ev["doorClose"], .5)
    n = int(.25 * SR); fx.add(noise(.25, 1500, 9000) * np.exp(-np.arange(n) / SR / .04), ev["doorClose"] + .45, .18, .3)
    sfx = np.stack([reverb(fx.L, 2.2, .3), reverb(fx.R, 2.4, .3)], 1)[: int((D + 1.5) * SR)]
    sfx /= np.abs(sfx).max() + 1e-9
    sf.write(os.path.join(ep, "audio", "sfx.wav"), sfx * .89, SR)

    # ---- MIXAGEM: música com ducking pela voz ----
    a = os.path.join(ep, "audio")
    fc = ("[0:a]aformat=channel_layouts=stereo,asplit=2[v][sc];"
          "[1:a]volume=0.38[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=40:release=500[md];"
          "[2:a]volume=0.55[fx];"
          "[v][md][fx]amix=inputs=3:normalize=0:duration=longest,"
          f"atrim=0:{D},loudnorm=I=-14:TP=-1.0:LRA=11[out]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{a}/narration.wav", "-i", f"{a}/music.wav", "-i", f"{a}/sfx.wav",
                    "-filter_complex", fc, "-map", "[out]", "-ar", "48000", f"{a}/mix.wav"], check=True)
    print("ok", ev)


if __name__ == "__main__":
    main(sys.argv[1])
