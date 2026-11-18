# PAFIES 2027 — trilha original + design de som (128 BPM, Lá menor)
# Gera: public/audio/pafies_mix.wav  e  src/sync.json (tempos dos impactos para a animação)
import numpy as np, wave, json, os
SR = 48000; DUR = 40.0; N = int(SR * DUR); rng = np.random.default_rng(2027)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BPM = 128; BEAT = 60 / BPM; BAR = 4 * BEAT
DROP = 6.0
S2, S3, S5 = DROP, DROP + 5 * BAR, DROP + 13 * BAR          # 6.0 | 15.375 | 30.375
L = np.zeros(N); R = np.zeros(N)
def put(x, t0, pan=0.0, g=1.0):
    i = int(t0 * SR); j = min(N, i + len(x))
    if j <= i or i < 0: return
    s = x[:j - i] * g; L[i:j] += s * np.sqrt(.5 * (1 - pan)); R[i:j] += s * np.sqrt(.5 * (1 + pan))
def env(n, a=.005, d=.2):
    t = np.arange(n) / SR; return np.clip(t / a, 0, 1) * np.exp(-t / d)
def lp(x, fc):
    k = max(1, int(SR / (fc * 2.2))); x = np.convolve(x, np.ones(k) / k, 'same'); return np.convolve(x, np.ones(k) / k, 'same')
def hp(x, fc): return x - lp(x, fc)
n2f = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------- instrumentos ----------------
def kick(g=1.0):
    n = int(.45 * SR); t = np.arange(n) / SR; f = 45 + 120 * np.exp(-t * 32)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + rng.standard_normal(n) * np.exp(-t * 300) * .3) * g
def clap():
    n = int(.3 * SR); x = hp(rng.standard_normal(n), 900)
    e = sum(np.exp(-np.clip(np.arange(n) / SR - o, 0, None) * 60) * (np.arange(n) / SR >= o) for o in (0, .011, .022)) + np.exp(-np.arange(n) / SR * 14) * .4
    return lp(x, 7000) * e * .45
def hat(o=False):
    n = int((.25 if o else .06) * SR); return hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR * (14 if o else 70)) * .22
def saw(f, n, det=(-.12, -.05, 0, .05, .12)):
    t = np.arange(n) / SR; return sum(2 * ((f * (1 + d / 100 * 2) * t + rng.random()) % 1) - 1 for d in det) / len(det)
def chord(notes, dur, g=.18, fc=2600):
    n = int(dur * SR); x = sum(saw(n2f(m), n) for m in notes) / len(notes)
    e = np.clip(np.arange(n) / SR / .02, 0, 1) * np.clip((dur - np.arange(n) / SR) / .08, 0, 1)
    return lp(x, fc) * e * g
def bass(m, dur, g=.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = n2f(m)
    x = np.sin(2 * np.pi * f * t) + .35 * np.sign(np.sin(2 * np.pi * f * t)) * .5
    return lp(x, 400) * np.clip(t / .005, 0, 1) * np.clip((dur - t) / .03, 0, 1) * g
def pluck(m, g=.16):
    n = int(.35 * SR); t = np.arange(n) / SR
    return lp(saw(n2f(m), n, (-.04, .04)), 3500) * np.exp(-t * 12) * g
def impact(g=1.0):  # boom cinematográfico
    n = int(2.6 * SR); t = np.arange(n) / SR; f = 38 + 80 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crack = lp(rng.standard_normal(n), 3000) * np.exp(-t * 14) * .6
    return (boom + crack) * g
def bass_hit(g=.8):
    n = int(1.2 * SR); t = np.arange(n) / SR; f = 50 + 60 * np.exp(-t * 20)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2.2 * np.exp(-t * 3)) * g
def whoosh(dur=.6, g=.35, rev=False):
    n = int(dur * SR); x = hp(lp(rng.standard_normal(n), 3500), 250); e = np.sin(np.linspace(0, np.pi, n)) ** 2
    if rev: e = np.linspace(0, 1, n) ** 3
    return x * e * g
def riser(dur, g=.4):
    n = int(dur * SR); p = np.linspace(0, 1, n)
    x = hp(rng.standard_normal(n), 400) * p ** 2.5 * .7 + np.sin(2 * np.pi * np.cumsum(200 + 1600 * p ** 2) / SR) * p ** 3 * .35
    return x * g
def heartbeat(g=1.0):
    def thump(a, f0):
        n = int(.35 * SR); t = np.arange(n) / SR; f = f0 + 40 * np.exp(-t * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * a
    x = np.zeros(int(.6 * SR)); a = thump(1, 48); b = thump(.7, 55)
    x[:len(a)] += a; o = int(.17 * SR); x[o:o + len(b)] += b[:len(x) - o]
    return lp(x, 300) * g

# ---------------- CENA 01: escuro + coração acelerando ----------------
HB = [0.12, 1.0, 1.78, 2.48, 3.08, 3.6, 4.05, 4.45, 4.8, 5.12, 5.4]
for i, t0 in enumerate(HB): put(heartbeat(.9 + i * .03), t0)
dn = int(6 * SR); dt = np.arange(dn) / SR
put(lp(saw(n2f(33), dn), 300) * np.clip(dt / 2, 0, 1) * .12, 0)          # drone grave
put(bass_hit(.5), 1.0); put(bass_hit(.6), 2.48)                             # impactos dos textos
put(whoosh(.5, .25), 0.75); put(whoosh(.5, .28), 2.25)
put(riser(1.9, .5), 4.0); put(whoosh(.9, .35, rev=True), 5.05)

# ---------------- música (a partir do DROP) ----------------
PROG = [(57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (55, [55, 59, 62, 67])]  # Am F C G
def bar_music(b0, bars, full=True, arp=True, drums=True):
    for k in range(bars):
        t0 = b0 + k * BAR; root, ch = PROG[k % 4]
        put(chord(ch + [ch[0] + 12], BAR * .98, .13 if full else .08), t0, .0)
        for s in range(8):
            put(bass(root - 12, BEAT / 2 * .9, .42), t0 + s * BEAT / 2)
        if arp:
            for s in range(16):
                put(pluck(ch[s % 4] + 12 + (12 if s % 8 == 7 else 0), .12), t0 + s * BEAT / 4, pan=(-.4 if s % 2 else .4))
        if drums:
            for s in range(4):
                put(kick(.95), t0 + s * BEAT); put(hat(True), t0 + s * BEAT + BEAT / 2, .3)
                if s % 2: put(clap(), t0 + s * BEAT, -.1)
                for h in range(2): put(hat(), t0 + s * BEAT + h * BEAT / 2 + BEAT / 4, -.3)
# CENA 02 (5 compassos) — energia total
bar_music(S2, 4); bar_music(S2 + 4 * BAR, 1, drums=False)
put(riser(BAR, .45), S2 + 4 * BAR); put(whoosh(.7, .4), S3 - .35)
# CENA 03 (8 compassos) — 4 cheios, 2 emocionais, 2 de subida
bar_music(S3, 4); bar_music(S3 + 4 * BAR, 2, arp=True, drums=False)
bar_music(S3 + 6 * BAR, 2, full=True)
for k in range(8):  # caixa acelerando (build)
    put(clap(), S3 + 6 * BAR + k * BEAT / 2 * (1 if k < 4 else .5) + (0 if k < 4 else 2 * BEAT), g=.6 + k * .05)
put(riser(2 * BAR, .5), S3 + 6 * BAR); put(whoosh(.8, .45), S5 - .4)
# CENA 05 — final
bar_music(S5, 4)
fin_n = int(2.1 * SR); put(chord([57, 60, 64, 69, 72], 2.1, .16) * np.exp(-np.arange(fin_n) / SR * 1.1), S5 + 4 * BAR)

# impactos sincronizados (cada um vira um "hit" visual)
HITS = {
    'drop_logo': S2, 'decima': S2 + BAR, 'gincana': S2 + 2 * BAR, 'ano': S2 + 2 * BAR + 2 * BEAT,
    'cena3': S3, 'competicao': S3 + BAR, 'megafone': S3 + 3 * BAR, 'missao': S3 + 4 * BAR, 'solidariedade': S3 + 4 * BAR + 2 * BEAT,
    'doacao': S3 + 6 * BAR, 'cena5': S5, 'preparados': S5 + 2 * BEAT, 'pafies2027': S5 + BAR, 'historia': S5 + 2 * BAR, 'final': S5 + 4 * BAR,
    'galera': 1.0, 'estao': 2.48,
}
for k in ('drop_logo', 'cena3', 'cena5', 'historia'): put(impact(1.0), HITS[k])
for k in ('decima', 'ano', 'competicao', 'solidariedade', 'preparados', 'pafies2027', 'final'): put(bass_hit(.7), HITS[k])
for k in ('decima', 'gincana', 'missao', 'megafone'): put(whoosh(.45, .3), HITS[k] - .25, pan=.3)
# grito do megafone: estática + ruído de banda
n = int(.8 * SR); put(lp(hp(rng.standard_normal(n), 1200), 4000) * np.exp(-np.arange(n) / SR * 3) * .3, HITS['megafone'])

# ---------------- master ----------------
mix = np.stack([L, R], 1)
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
fade = np.clip((DUR - np.arange(N) / SR) / 1.0, 0, 1); mix *= fade[:, None]
mix *= .93 / np.abs(mix).max()
os.makedirs(os.path.join(ROOT, 'public/audio'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'public/audio/pafies_mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump(dict(bpm=BPM, beat=BEAT, bar=BAR, heartbeats=HB, scenes=dict(s1=0, s2=S2, s3=S3, s5=S5, end=DUR), hits=HITS),
          open(os.path.join(ROOT, 'src/sync.json'), 'w'), indent=2)
print('ok', {k: round(v, 3) for k, v in HITS.items()})
