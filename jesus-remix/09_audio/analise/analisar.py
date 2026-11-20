"""Sound Designer — análise da música original (somente leitura).
Uso: python3 analisar.py ../original/<arquivo>  → beatmap.json + onda.png
"""
import sys, json, numpy as np, librosa
path = sys.argv[1]
y, sr = librosa.load(path, sr=None, mono=True)
dur = librosa.get_duration(y=y, sr=sr)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units='time')
rms = librosa.feature.rms(y=y)[0]; t_rms = librosa.times_like(rms, sr=sr)
# impactos: picos de energia (top 2% do onset envelope, afastados >= 1 beat)
t_on = librosa.times_like(onset_env, sr=sr); thr = np.percentile(onset_env, 98)
spb = 60/float(np.atleast_1d(tempo)[0]); impacts=[]
for t, v in zip(t_on, onset_env):
    if v >= thr and (not impacts or t-impacts[-1] >= spb): impacts.append(float(t))
# seções: segmentação por novidade em features cromáticas + MFCC
feat = np.vstack([librosa.feature.chroma_cqt(y=y, sr=sr), librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)])
k = max(4, min(10, int(dur//20)))
bounds = librosa.frames_to_time(librosa.segment.agglomerative(feat, k), sr=sr)
out = dict(arquivo=path, duracao=round(dur,3), bpm=round(float(np.atleast_1d(tempo)[0]),2),
           beats=[round(float(b),3) for b in beats], downbeats_estimados=[round(float(b),3) for b in beats[::4]],
           onsets=[round(float(o),3) for o in onsets], impactos=[round(t,3) for t in impacts],
           secoes=[round(float(b),3) for b in bounds],
           energia=[[round(float(t),2), round(float(r),4)] for t, r in zip(t_rms[::20], rms[::20])])
json.dump(out, open('beatmap.json','w'), indent=1)
print(f"duração {dur:.1f}s · BPM {out['bpm']} · {len(beats)} beats · {len(impacts)} impactos · seções {out['secoes']}")
