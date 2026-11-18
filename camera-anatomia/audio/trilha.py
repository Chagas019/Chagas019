# Trilha eletrônica discreta + efeitos, sintetizados (numpy/scipy). Saída: trilha.wav (48 kHz estéreo)
import json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
TL = json.load(open('timeline.json'))
DUR = TL['duration'] + 1.0
N = int(DUR * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
S = {s['id']: s for s in TL['scenes']}
L = lambda sid, i: S[sid]['lines'][i]

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def env(n, a, d):
    e = np.ones(n); na, nd = int(a * SR), int(d * SR); e[:na] = np.linspace(0, 1, na) if na else 1
    if nd: e[-nd:] *= np.linspace(1, 0, nd) ** 2
    return e
def place(buf, x, at, g=1.0, pan=0.0):
    i = int(at * SR); j = min(N, i + len(x)); x = x[:j - i] * g
    buf[0, i:j] += x * np.sqrt(.5 * (1 - pan)) * 1.41; buf[1, i:j] += x * np.sqrt(.5 * (1 + pan)) * 1.41
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

mus = np.zeros((2, N)); sfx = np.zeros((2, N))

# --- pad: acordes lentos, serras desafinadas filtradas ---
chords = [[50, 57, 60, 64, 69], [46, 53, 57, 62, 65], [43, 50, 55, 58, 65], [45, 52, 57, 61, 64]]  # Dm9 Bbmaj7 Gm9 A
CH = 8.0
for k in range(int(DUR / CH) + 1):
    ch = chords[k % 4]; n = int((CH + 3) * SR); tt = np.arange(n) / SR
    v = np.zeros(n)
    for m in ch:
        for det in (-.07, .0, .08):
            f = mtof(m + det); ph = rng.random()
            v += 2 * ((tt * f + ph) % 1) - 1
    cutoff = 700 + 500 * np.sin(2 * np.pi * (k * CH + tt) / 23)
    v = lp(v, 900) * .5 + lp(v, 420) * .5
    v *= env(n, 2.5, 3.0) / (len(ch) * 3)
    place(mus, v, k * CH - 1.5 if k else 0, .30, pan=(-.3 if k % 2 else .3))
mus = lp(mus, 3000)

# --- sub pulso (a partir da desmontagem) ---
bpm = 96; beat = 60 / bpm
roots = [38, 34, 31, 33]
t_on, t_off = S['s2']['t0'], S['s7']['t0'] + 6
x = t_on
while x < t_off:
    r = roots[int(x / CH) % 4]; n = int(.42 * SR); tt = np.arange(n) / SR
    f = mtof(r); s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 7) + .3 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 12)
    place(mus, s, x, .16)
    x += beat / 2 if int((x - t_on) / beat) % 4 != 3 else beat / 2
# --- arpejo suave (luz, sensor, processamento) ---
arp_ranges = [(S['s3']['t0'] + 1, S['s3']['t1'] - .5), (S['s4']['t0'] + .5, S['s4']['t1'] - .5), (S['s6']['t0'] + .5, S['s6']['t1'] - .5)]
for a, b in arp_ranges:
    x = a; i = 0
    while x < b:
        ch = chords[int(x / CH) % 4]; m = ch[[0, 2, 4, 3, 1, 3, 4, 2][i % 8]] + 12
        n = int(.5 * SR); tt = np.arange(n) / SR; f = mtof(m)
        s = (np.sin(2 * np.pi * f * tt) + .25 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt * 9)
        fade = min(1, (x - a) / 2, (b - x) / 2)
        place(mus, s, x, .055 * fade, pan=.4 * np.sin(i * .7))
        x += beat / 4; i += 1
# eco
d = int(beat * .75 * SR); echo = np.zeros_like(mus); echo[:, d:] = mus[:, :-d] * .25; echo[[0, 1]] = echo[[1, 0]]; mus += lp(echo, 2500)

# --- transições: sopro de ruído + impacto grave ---
for s in TL['scenes'][1:]:
    at = s['t0']; n = int(2.2 * SR); tt = np.arange(n) / SR
    sw = bp(rng.standard_normal(n), 300, 5000) * (tt / 2.2) ** 3; place(sfx, sw, at - 2.2, .10)
    n = int(2.5 * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (42 + 30 * np.exp(-tt * 9)) * tt) * np.exp(-tt * 2.2); place(sfx, boom, at, .28)
# abertura: crescendo
n = int(5 * SR); tt = np.arange(n) / SR; place(sfx, lp(rng.standard_normal(n), 1200) * (tt / 5) ** 2 * env(n, 0, 1), 0, .06)

def click(at, g=.5, bright=6000, ting=0):
    n = int(.25 * SR); tt = np.arange(n) / SR
    c = bp(rng.standard_normal(n), 1500, bright) * np.exp(-tt * 90)
    c += .4 * lp(rng.standard_normal(n), 400) * np.exp(-tt * 40)
    if ting: c += .25 * np.sin(2 * np.pi * ting * tt) * np.exp(-tt * 14)
    place(sfx, c, at, g, pan=rng.uniform(-.4, .4))
def whoosh(at, dur=1.4, g=.10):
    n = int(dur * SR); tt = np.arange(n) / SR; x = bp(rng.standard_normal(n), 400, 3500) * np.sin(np.pi * tt / dur) ** 2; place(sfx, x, at, g)

# desmontagem: estalos de encaixe + deslize
t2 = S['s2']['t0']
for a in [2.6, 6.3, 6.5, 9.9, 12.0, 12.3, 12.6, 12.9, 13.2]:
    click(t2 + a, .45, ting=rng.choice([1800, 2400, 3100])); whoosh(t2 + a + .05, 1.6, .06)
click(t2 + 3.4, .3, ting=2600)
# luz: obturador abre
click(L('s3', 4)['t0'] + .4, .5); click(L('s3', 4)['t0'] + .9, .35)
# obturador: cortinas
l1, l2, l3 = L('s5', 1), L('s5', 2), L('s5', 3)
click(l1['t0'] + .3, .55, 5000); click(l1['t0'] + .3 + (l1['t1'] - l1['t0']) * .55, .5, 5000)
click(l2['t0'] - .2, .35); click(l2['t0'] + .35, .6, 7000); click(l2['t0'] + .55, .6, 7000)
x = l3['t0']
while x < S['s5']['t1'] - .5:
    click(x + .13, .45, 7000); click(x + .52, .45, 7000); x += 2.6
# processamento: bipes de dados
for k in range(60):
    at = L('s6', 0)['t0'] + .3 + rng.random() * (L('s6', 2)['t1'] - L('s6', 0)['t0'] - 2)
    n = int(.06 * SR); tt = np.arange(n) / SR; f = rng.choice([2093, 2637, 3136])
    place(sfx, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 70), at, .035, pan=rng.uniform(-.6, .6))
n = int(.5 * SR); tt = np.arange(n) / SR
place(sfx, (np.sin(2 * np.pi * 1568 * tt) + np.sin(2 * np.pi * 2349 * tt)) * np.exp(-tt * 6), L('s6', 2)['t0'] + 1.2, .08)
# montagem: estalos em sequência e acorde final
t7 = S['s7']['t0']
for a in [.5, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.3]: click(t7 + a, .35, ting=rng.choice([1800, 2400]));
whoosh(t7 + 3.6, 3.0, .08)

mix = mus * 1.0 + sfx
# fades
fade_in = np.clip(t / 2.0, 0, 1); fade_out = np.clip((DUR - .3 - t) / 3.5, 0, 1)
mix *= fade_in * fade_out
mix = np.tanh(mix * 1.2) / 1.2
mix /= np.max(np.abs(mix)) / .7
sf.write('trilha.wav', mix.T.astype(np.float32), SR)
print('ok', DUR)
