"""Sound Designer/VFX — energia por quadro para o visualizer (lê o áudio ORIGINAL só para leitura).
Uso: python3 extrair_energia.py [../../09_audio/original/Corte_Jesus.wav] [--fps 30] [--bandas 24]
Saída: ../data/energia.json  { fps, duracao, bandas, rms[f], onset[f], kick[f], b[f][bandas] }  (0..1)
- rms: energia global (normalizada pelo percentil 98, envelope ataque rápido / release lento)
- b: bandas mel em escala log (40 Hz–16 kHz), normalizadas por banda (p5–p98), mesmo envelope
- onset: força de ataque (transientes) · kick: energia < 150 Hz (pulso do piso)"""
import sys, os, json, argparse, numpy as np, librosa
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('wav', nargs='?', default=os.path.join(HERE, '../../09_audio/original/Corte_Jesus.wav'))
ap.add_argument('--fps', type=int, default=30); ap.add_argument('--bandas', type=int, default=24)
a = ap.parse_args()
y, sr = librosa.load(a.wav, sr=44100, mono=True)
dur = len(y) / sr; hop = sr // a.fps; nf = int(np.ceil(dur * a.fps))
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop, center=True)) ** 2
mel = librosa.feature.melspectrogram(S=S, sr=sr, n_mels=a.bandas, fmin=40, fmax=16000)
db = librosa.power_to_db(mel, ref=np.max)
def norm(x, lo=5, hi=98):
    l, h = np.percentile(x, lo), np.percentile(x, hi); return np.clip((x - l) / max(h - l, 1e-9), 0, 1)
def env(x, att=.6, rel=.18):          # ataque/release por quadro (suaviza sem atrasar o transiente)
    o = np.zeros_like(x); v = 0
    for i, s in enumerate(x): v += (s - v) * (att if s > v else rel); o[i] = v
    return o
# contraste local: mix comprimido (LRA 2,8 LU) → subtrai média móvel de 1 s para a barra respirar
from scipy.ndimage import uniform_filter1d
loc = lambda x: x - uniform_filter1d(x, a.fps) * .7
bands = np.stack([env(norm(loc(db[k]))) for k in range(a.bandas)], 1)[:nf]
rms = env(norm(librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0], 2, 98))[:nf]
on = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop); on = env(norm(on, 50, 99.5), .9, .25)[:nf]
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048); low = S[freqs < 150].sum(0)
ldb = librosa.power_to_db(low + 1e-12); flux = np.maximum(0, np.diff(ldb, prepend=ldb[0]))   # fluxo positivo no grave = batida
kick = env(norm(flux, 50, 99.5), .95, .22)[:nf]
pad = lambda v: np.pad(v, (0, max(0, nf - len(v))), mode='edge')
out = dict(arquivo=os.path.basename(a.wav), fps=a.fps, duracao=round(dur, 3), quadros=nf, bandas=a.bandas,
           rms=[round(float(v), 3) for v in pad(rms)], onset=[round(float(v), 3) for v in pad(on)], kick=[round(float(v), 3) for v in pad(kick)],
           b=[[round(float(v), 3) for v in row] for row in np.vstack([bands, np.repeat(bands[-1:], max(0, nf - len(bands)), 0)])])
dst = os.path.join(HERE, '../data/energia.json'); json.dump(out, open(dst, 'w'), separators=(',', ':'))
print(f'{dst}: {nf} quadros a {a.fps} fps, {a.bandas} bandas, {dur:.2f}s')
