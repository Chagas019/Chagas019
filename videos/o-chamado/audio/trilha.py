# O CHAMADO — trilha instrumental original + efeitos + mixagem com narração
# Ré maior, 80 bpm. Cresce gradualmente: piano -> cordas -> pulso -> resolução.
import numpy as np, wave, subprocess, os
SR = 48000; DUR = 32.0; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))
L = np.zeros(N); R = np.zeros(N)
n2f = lambda m: 440 * 2 ** ((m - 69) / 12)

def put(sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[:j - i] * gain
    L[i:j] += s * np.sqrt(.5 * (1 - pan)); R[i:j] += s * np.sqrt(.5 * (1 + pan))

def smooth(x, k):
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')

def lowpass(x, fc):
    return smooth(smooth(x, SR / (fc * 2.2)), SR / (fc * 2.2))

# ---------------- piano (felt) ----------------
def piano(m, dur=3.0, vel=.5):
    f = n2f(m); n = int(dur * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for h, a in ((1, 1), (2, .45), (3, .22), (4, .1), (5, .05)):
        fh = f * h * (1 + .0004 * h * h)
        s += a * np.sin(2 * np.pi * fh * tt) * np.exp(-tt * (1.2 + h * .9))
    att = np.clip(tt / .006, 0, 1)
    hammer = rng.standard_normal(n) * np.exp(-tt * 90) * .05
    return lowpass((s * att + hammer), 3200) * vel

# ---------------- cordas (pad) ----------------
def strings(notes, t0, t1, amp, att=1.5, rel=1.5, bright=1800):
    n = int((t1 - t0 + rel) * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        f = n2f(m)
        for d in (-.07, 0, .07):
            ph = rng.random()
            vib = 1 + .003 * np.sin(2 * np.pi * 5.2 * tt + ph * 6)
            s += (2 * ((f * (1 + d / 100 * 5) * vib * tt + ph) % 1) - 1) / len(notes)
    env = np.clip(tt / att, 0, 1) * np.clip((t1 - t0 + rel - tt) / rel, 0, 1)
    return lowpass(s, bright) * env * amp

# progressão: D  A/C#  Bm  G  |  Em  G  A  D
CH = {'D': [50, 57, 62, 66, 69], 'A': [49, 57, 61, 64, 69], 'Bm': [47, 54, 59, 62, 66], 'G': [43, 55, 59, 62, 67],
      'Em': [40, 52, 55, 59, 64], 'Dsus': [50, 57, 62, 64, 69]}

# CENA 1 (0–6.5): piano esparso + pad muito suave
for x, m in [(.4, 74), (1.9, 69), (2.65, 71), (3.4, 66), (4.9, 74), (5.65, 76)]:
    put(piano(m, 3.5, .32), x, pan=.2)
put(strings(CH['Dsus'], 0.0, 6.6, .05, att=3), 0.0)
# CENA 2 (6.5–12.5): entra o baixo e as cordas
for x, m in [(6.6, 73), (7.35, 69), (8.1, 66), (9.6, 71), (10.35, 74), (11.1, 78)]:
    put(piano(m, 3.5, .34), x, pan=-.2)
put(strings(CH['A'], 6.5, 9.5, .08, att=1.2), 6.5); put(strings(CH['Bm'], 9.5, 12.6, .09), 9.5)
for x, m in [(6.5, 37), (9.5, 35)]: put(piano(m, 3.2, .3), x)
# CENA 3 (12.5–20.5): pulso de piano em colcheias + cordas crescendo
prog3 = [('G', 12.5), ('D', 14.5), ('A', 16.5), ('Bm', 18.5)]
for name, x0 in prog3:
    put(strings(CH[name], x0, x0 + 2.05, .11 + (x0 - 12.5) * .006, att=.6, bright=2400), x0)
    notes = CH[name][2:]
    for k in range(8):
        put(piano(notes[k % len(notes)] + (12 if k % 4 == 3 else 0), 1.2, .18 + .03 * (k % 2 == 0)), x0 + k * .375, pan=(-.3 if k % 2 else .3))
    put(piano(CH[name][0] - 12, 2.5, .32), x0)
# CENA 4 (20.5–26.5): tensão e expectativa
for name, x0, x1 in [('Em', 20.5, 23.5), ('G', 23.5, 26.6)]:
    put(strings(CH[name], x0, x1, .13, att=1.0, bright=2000), x0)
    put(piano(CH[name][0] - 12, 3, .3), x0)
for x, m in [(21.0, 79), (21.75, 78), (22.5, 76), (24.0, 74), (24.75, 76), (25.5, 78)]:
    put(piano(m, 3, .26), x, pan=.25)
# CENA 5 (26.5–32): resolução — A -> D (aberto), cordas cheias
put(strings(CH['A'], 26.5, 28.0, .14, att=.5, bright=2600), 26.5)
put(strings(CH['D'] + [74, 78], 28.0, 31.2, .17, att=1.2, bright=3000), 28.0)
for x, m in [(26.55, 45), (28.0, 38)]: put(piano(m, 4, .4), x)
for x, m in [(28.0, 78), (28.4, 81), (28.8, 86), (29.9, 85), (30.6, 81)]:
    put(piano(m, 3.5, .28), x, pan=(.3 if m % 2 else -.3))

# ---------------- efeitos ----------------
def noise_band(dur, f_lo, f_hi):
    n = int(dur * SR); x = rng.standard_normal(n)
    return lowpass(x, f_hi) - lowpass(x, f_lo)

def whoosh(t0, dur=.7, amp=.35, pan=0, up=True):
    x = noise_band(dur, 250, 2600); tt = np.linspace(0, 1, len(x))
    env = np.sin(np.pi * tt) ** (2 if up else 1.5)
    put(x * env * amp, t0, pan)

def sub(t0, amp=.6, f0=55, dur=2.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f0 + 35 * np.exp(-tt * 12)
    put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.8) * amp, t0)

def tick(t0, amp=.12, pan=0):
    n = int(.04 * SR); tt = np.arange(n) / SR
    put((np.sin(2 * np.pi * 3200 * tt) + .5 * rng.standard_normal(n)) * np.exp(-tt * 260) * amp, t0, pan)

def swell(t0, t1, amp=.25):  # luz/ar subindo
    n = int((t1 - t0) * SR); tt = np.linspace(0, 1, n)
    x = noise_band(t1 - t0, 600, 7000) * tt ** 2 * amp
    put(x + np.sin(2 * np.pi * np.cumsum(300 + 500 * tt ** 2) / SR) * tt ** 3 * amp * .25, t0)

def page(t0, amp=.18, pan=0):
    x = noise_band(.35, 1500, 9000); tt = np.linspace(0, 1, len(x))
    put(x * np.sin(np.pi * tt) ** .7 * (1 + .6 * np.sin(tt * 40)) * amp, t0, pan)

def crackle(t0, t1, amp=.07):
    n = int((t1 - t0) * SR); x = np.zeros(n)
    idx = rng.integers(0, n, int((t1 - t0) * 55)); x[idx] = rng.uniform(-1, 1, len(idx))
    x = x - smooth(x, 20); base = noise_band(t1 - t0, 80, 900) * .25
    env = np.clip(np.linspace(0, 1, n) * 4, 0, 1) * np.clip(np.linspace(1, 0, n) * 4, 0, 1)
    put((x * 3 + base) * env * amp, t0)

# transições
for x in (6.25, 12.25, 20.25, 26.2): whoosh(x, .65, .32, pan=(.4 if x % 2 > 1 else -.4))
# cena 1: bússola girando (ticks desacelerando) + entrada
whoosh(.0, 1.4, .18, up=True)
tt_ = .3
for k in range(22):
    tick(tt_, .08, pan=.3 * np.sin(k)); tt_ += .08 + k * .012
# cena 2: porta aparece (ar) + abre (rangido grave suave) + luz
whoosh(6.6, 1.3, .2)
dn = int(2.4 * SR); dt = np.arange(dn) / SR
creak = np.sin(2 * np.pi * np.cumsum(70 + 25 * np.sin(dt * 3) + 10 * rng.standard_normal(dn).cumsum() / SR) / SR) * .08
put(lowpass(creak * np.sin(np.pi * dt / 2.4), 900), 8.3, .2)
swell(8.3, 10.3, .22); sub(10.2, .35)
# cena 3: objetos surgindo (whooshes curtos) + páginas virando + impactos discretos
for i, x in enumerate([12.55, 12.67, 12.79, 12.91]): whoosh(x, .45, .16, pan=(-.6 + i * .4))
for k in range(6): page(12.5 + 1.2 + k * .55 + .4, .16, pan=.4)
for x in (13.6, 15.6, 17.6): sub(x, .22, 60, 1.6)
# cena 4: fogo
crackle(20.5, 26.6, .09); whoosh(20.55, 1.2, .2); swell(25.3, 26.4, .2)
# cena 5: impacto profundo + ar
sub(26.55, .6, 48, 3.5); whoosh(26.5, 1.0, .2)
sub(29.6, .35, 50, 3)

# ---------------- reverb ----------------
def reverb(x, seed, dec=2.2, ln=3.0):
    r = np.random.default_rng(seed); n = int(SR * ln); d = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-d * dec); ir = lowpass(ir, 6000); ir[:int(.02 * SR)] *= np.linspace(0, 1, int(.02 * SR))
    nf = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]
    return y / (np.abs(ir).sum() * .015)
music = np.stack([L + reverb(L, 1) * .35, R + reverb(R, 2) * .35], 1)
music /= np.abs(music).max() + 1e-9

# ---------------- narração (frases posicionadas por cena) ----------------
def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768
nar = load_audio(os.path.join(HERE, 'narracao_eleven.mp3'))
# (início na narração, fim, posição no vídeo)
PHR = [(0.0, 2.45, 2.0), (3.28, 5.35, 8.4), (6.3, 7.6, 13.55), (8.08, 9.33, 15.55), (9.76, 11.2, 17.55),
       (11.94, 14.45, 21.5), (14.87, 16.7, 24.0), (17.28, 18.7, 27.3), (19.25, 21.55, 29.5)]
voice = np.zeros(N)
for a, b, x in PHR:
    seg = nar[int(a * SR):int(b * SR)].copy(); fl = int(.03 * SR)
    seg[:fl] *= np.linspace(0, 1, fl); seg[-fl:] *= np.linspace(1, 0, fl)
    i = int(x * SR); voice[i:i + len(seg)] += seg[:N - i]
voice /= np.abs(voice).max() + 1e-9
# ducking: envelope da voz reduz a música ~7 dB
envv = smooth(np.abs(voice), SR * .08); envv = np.clip(envv / (envv.max() * .25), 0, 1)
envv = smooth(envv, SR * .25)
duck = 1 - .55 * envv
vrev = reverb(voice, 3, dec=4.5, ln=1.5) * .08
mix = music * (duck[:, None]) * .55 + np.stack([voice + vrev, voice + vrev], 1) * .95
fade = np.clip((DUR - t) / 1.2, 0, 1) * np.clip(t / .05, 0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2); mix *= .92 / np.abs(mix).max()
def save(name, x):
    st = (x * 32767).astype(np.int16)
    with wave.open(os.path.join(HERE, name), 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
save('mix_final.wav', mix)
save('trilha_instrumental.wav', music * .8 * fade[:, None])
save('narracao_sincronizada.wav', np.stack([voice, voice], 1) * .9)
print('ok')
