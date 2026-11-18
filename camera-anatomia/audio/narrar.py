# Gera a narração (Kokoro, voz pm_alex, pt-BR) frase por frase e a linha do tempo.
import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
D = sys.argv[1] if len(sys.argv) > 1 else "."
K = Kokoro("/home/user/tts/kokoro-v1.0.onnx", "/home/user/tts/voices-v1.0.bin")
SR = 24000
# pronúncias
FIX = {"f/1.8": "éfe um ponto oito", "f/8": "éfe oito", "1/250": "um duzentos e cinquenta avos",
       "1/30": "um trinta avos", "APS-C": "A P S C", "JPEG": "jota pég", "HEIF": "rêif", "RAW": "rô",
       "23,5": "vinte e três e meio", "15,6": "quinze vírgula seis", "36": "trinta e seis", "24": "vinte e quatro"}
scenes = json.load(open(f"{D}/narracao.json"))
out, t, timeline = [], 0.0, []
GAP = 0.35
for sc in scenes:
    start = t
    buf = [np.zeros(int(sc["lead"] * SR), np.float32)]; tt = sc["lead"]
    lines = []
    for line in sc["lines"]:
        spoken = line
        for a, b in FIX.items(): spoken = spoken.replace(a, b)
        s, sr = K.create(spoken, voice="pm_alex", speed=1.06, lang="pt-br")
        assert sr == SR
        s = s.astype(np.float32)
        lines.append({"text": line, "t0": round(start + tt, 3), "t1": round(start + tt + len(s) / SR, 3)})
        buf.append(s); tt += len(s) / SR
        buf.append(np.zeros(int(GAP * SR), np.float32)); tt += GAP
    dur = max(sc["min"], tt + 0.9)
    pad = int(round(dur * SR)) - sum(len(b) for b in buf)
    buf.append(np.zeros(max(pad, 0), np.float32))
    out += buf
    timeline.append({"id": sc["id"], "t0": round(start, 3), "t1": round(start + dur, 3), "lines": lines})
    t = start + dur
    print(sc["id"], round(start, 2), round(dur, 2), flush=True)
audio = np.concatenate(out)
sf.write(f"{D}/narracao.wav", audio, SR)
json.dump({"duration": round(t, 3), "scenes": timeline}, open(f"{D}/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2))
