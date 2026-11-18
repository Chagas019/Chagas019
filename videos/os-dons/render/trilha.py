# Trilha original sintetizada — sincronizada com os impactos da animação
import numpy as np, wave
SR = 48000; DUR = 26.0; N = int(SR * DUR)
t = np.arange(N) / SR
L = np.zeros(N); Rr = np.zeros(N)
rng = np.random.default_rng(1)

def env_seg(a, b, fi, fo):
    e = np.clip((t - a) / fi, 0, 1) * np.clip((b - t) / fo, 0, 1)
    return e * ((t >= a) & (t <= b))
def lp(x, fc):  # passa-baixa de 1 polo
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def lp_fast(x, fc, passes=2):
    # aproximação vetorizada: média móvel em cascata
    k = max(1, int(SR / (fc * 2.2)));
    for _ in range(passes): x = np.convolve(x, np.ones(k) / k, mode='same')
    return x
def saw(f, ph=0): return 2 * ((t * f + ph) % 1) - 1
def add(sig, pan=0.0):
    global L, Rr
    L += sig * np.sqrt(.5 * (1 - pan)); Rr += sig * np.sqrt(.5 * (1 + pan))

# ---- PAD: acordes por cena ----
n2f = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [ (0.3, 5.7, [38, 50, 53, 57, 62]),      # Ré menor
           (5.5, 13.7, [34, 46, 50, 53, 58]),     # Si bemol
           (13.5, 20.1, [41, 53, 57, 60, 65]),    # Fá
           (19.9, 23.8, [36, 48, 52, 55, 60, 64]),# Dó
           (23.6, 26.0, [41, 53, 57, 60, 65, 69])]# Fá (resolução)
pad = np.zeros(N)
for a, b, notes in chords:
    e = env_seg(a, b, .5, .45)
    for i, m in enumerate(notes):
        f = n2f(m)
        for det in (-.12, .12):
            pad += e * saw(f * (1 + det / 100 * 3), rng.random()) * (0.5 if m < 45 else 0.22)
pad = lp_fast(pad, 900)
swell = .35 + .65 * np.clip(t / 5, 0, 1)
add(pad * .10 * swell)

# ---- impactos (boom grave + ruído) ----
def boom(t0, amp=1.0, big=False):
    m = t >= t0; d = t[m] - t0
    f = 42 + 110 * np.exp(-d * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-d * (2.2 if big else 4.5))
    nz = rng.standard_normal(m.sum()) * np.exp(-d * (9 if big else 16))
    nz = lp_fast(nz, 2500 if big else 4000, 1)
    sig = np.zeros(N); sig[m] = (s * 1.0 + nz * .35) * amp
    add(sig)
for h in [0.95, 1.45, 1.95, 13.6, 16.6, 20.0]: boom(h, .55)
for h in [2.35, 5.6, 9.6, 11.6, 23.7]: boom(h, .75)
for h in [0.5, 7.6, 21.4, 24.0]: boom(h, 1.0, True)

# ---- risers antes das transições ----
def riser(t1, length=1.3, amp=.35):
    a = t1 - length; m = (t >= a) & (t < t1 + .05)
    d = (t[m] - a) / length
    nz = rng.standard_normal(m.sum())
    hi = nz - lp_fast(nz, 300 + 5000 * float(d.mean()), 1)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * d ** 2) / SR) * .3
    sig = np.zeros(N); sig[m] = (hi * .6 + tone) * d ** 2.2 * amp
    add(sig, -.3); add(sig * .8, .3)
for x in [5.6, 13.6, 20.0, 23.7]: riser(x)
riser(0.5, .45, .25)

# ---- whooshes (movimentos de palavra) ----
def whoosh(tc, w=.35, amp=.25, pan=0):
    m = (t > tc - w) & (t < tc + w); d = (t[m] - (tc - w)) / (2 * w)
    nz = rng.standard_normal(m.sum()); band = lp_fast(nz, 1800, 1) - lp_fast(nz, 300, 1)
    sig = np.zeros(N); sig[m] = band * np.sin(np.pi * d) ** 2 * amp; add(sig, pan)
for i, x in enumerate([7.4, 9.4, 11.4, 13.4, 19.6, 23.4, 5.3]): whoosh(x, pan=(-.5 if i % 2 else .5))

# ---- pulso rítmico (cena 2) e batida de coração (cena 3) ----
def kick(t0, amp):
    m = (t >= t0) & (t < t0 + .4); d = t[m] - t0
    s = np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-d * 30)) / SR) * np.exp(-d * 9)
    sig = np.zeros(N); sig[m] = s * amp; add(sig)
for x in np.arange(6.1, 13.4, 0.5): kick(x, .32)
for x in np.arange(14.2, 19.4, 1.0): kick(x, .30); kick(x + .22, .18)
for x in np.arange(20.5, 23.4, 0.5): kick(x, .22)

# ---- sinos / brilhos nas revelações de texto ----
def bell(t0, midi, amp=.12, pan=0):
    f = n2f(midi); m = (t >= t0) & (t < t0 + 2.5); d = t[m] - t0
    s = (np.sin(2*np.pi*f*d) + .5*np.sin(2*np.pi*f*2.76*d)*np.exp(-d*3) + .25*np.sin(2*np.pi*f*5.4*d)*np.exp(-d*6)) * np.exp(-d * 2.2)
    sig = np.zeros(N); sig[m] = s * amp; add(sig, pan)
for x, n in [(1.95, 74), (2.05, 77), (2.15, 81), (2.8, 86),
             (13.9, 77), (14.4, 81), (14.95, 84), (15.5, 89), (16.1, 86), (16.6, 93), (17.2, 89),
             (20.2, 72), (20.55, 76), (20.95, 79), (21.4, 84), (22.0, 88),
             (23.7, 77), (24.0, 81), (24.3, 84), (24.6, 89), (25.0, 93)]:
    bell(x, n, .10, pan=rng.uniform(-.6, .6))

# ---- cintilações (brilhos em estrela) ----
for x in [2.65, 3.6, 7.95, 10.4, 12.5, 17.7, 18.6, 21.85, 24.45, 25.1]:
    for j, n in enumerate([96, 100, 103]): bell(x + j * .04, n, .045, pan=rng.uniform(-.8, .8))

# ---- reverb (convolução com cauda exponencial estéreo) ----
def reverb(x, seed):
    r = np.random.default_rng(seed); n = int(SR * 2.4); d = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-d * 2.6); ir = lp_fast(ir, 5000, 1); ir[0] = 0
    nfft = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]
    return y / np.max(np.abs(ir).sum() * .02)
wetL, wetR = reverb(L, 11), reverb(Rr, 12)
L2 = L + wetL * .5; R2 = Rr + wetR * .5
# fade final, soft clip e normalização
fade = np.clip((26 - t) / .6, 0, 1) * np.clip(t / .05, 0, 1)
L2 *= fade; R2 *= fade
mx = max(np.abs(L2).max(), np.abs(R2).max())
L2 = np.tanh(L2 / mx * 1.6) / np.tanh(1.6) * .89; R2 = np.tanh(R2 / mx * 1.6) / np.tanh(1.6) * .89
st = (np.stack([L2, R2], 1) * 32767).astype(np.int16)
with wave.open('trilha.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok', st.shape)
