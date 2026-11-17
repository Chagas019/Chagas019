"""SANTORAMA — pipeline de narração.

Lê episodes/<ep>/script/narration.json, gera cada fala com TTS neural
(Kokoro, local) ou usa WAVs já existentes (ex.: ElevenLabs exportado em
episodes/<ep>/audio/lines/NN.wav), monta a faixa de narração com as pausas
dramáticas e grava timings.json (cenas + legendas palavra a palavra) para o Remotion.

Uso:
  python3 -I tools/build_narration.py 001-sao-maximiliano-kolbe --model-dir /caminho/kokoro
  python3 -I tools/build_narration.py 001-sao-maximiliano-kolbe --use-existing   # pula o TTS
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
import soundfile as sf

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def resample(x, sr_in, sr_out=SR):
    if sr_in == sr_out:
        return x.astype(np.float32)
    n = int(len(x) * sr_out / sr_in)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def trim(x, thr=0.008, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * SR)); b = min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]


def syllable_weight(w):
    v = len(re.findall(r"[aeiouáéíóúâêôãõàüy]+", w.lower()))
    if re.search(r"\d", w):
        v = 4 + len(w)  # números são falados por extenso (mais longos)
    return max(1, v) + 0.35


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--model-dir")
    ap.add_argument("--use-existing", action="store_true")
    a = ap.parse_args()

    ep = os.path.join(ROOT, "episodes", a.episode)
    cfg = json.load(open(os.path.join(ep, "script", "narration.json"), encoding="utf-8"))
    lines_dir = os.path.join(ep, "audio", "lines"); os.makedirs(lines_dir, exist_ok=True)

    if not a.use_existing:
        from kokoro_onnx import Kokoro
        k = Kokoro(os.path.join(a.model_dir, "kokoro-v1.0.onnx"), os.path.join(a.model_dir, "voices-v1.0.bin"))
        v = cfg["voice"]
        for i, ln in enumerate(cfg["lines"]):
            s, sr = k.create(ln["say"], voice=v["voice"], speed=v["speed"], lang="pt-br")
            sf.write(os.path.join(lines_dir, f"{i:02d}.wav"), resample(s, sr), SR)
            print("tts", i, ln["say"][:50])

    t = cfg["leadIn"]
    chunks, cues, scenes = [], [], {}
    chunks.append(np.zeros(int(t * SR), np.float32))
    for i, ln in enumerate(cfg["lines"]):
        x, sr = sf.read(os.path.join(lines_dir, f"{i:02d}.wav"), dtype="float32")
        if x.ndim > 1:
            x = x.mean(1)
        x = trim(resample(x, sr))
        dur = len(x) / SR
        words = ln["text"].split()
        ws = [syllable_weight(w) for w in words]; tot = sum(ws); acc = 0.0
        wt = []
        for w, wgt in zip(words, ws):
            st = t + dur * acc / tot; acc += wgt
            clean = re.sub(r"[^\wÀ-ú]", "", w)
            wt.append({"w": w, "start": round(st, 3), "end": round(t + dur * acc / tot, 3),
                       "hl": clean in ln.get("hl", [])})
        cues.append({"i": i, "scene": ln["scene"], "text": ln["text"], "start": round(t, 3),
                     "end": round(t + dur, 3), "words": wt, "subtitle": ln.get("subtitle", True)})
        sc = scenes.setdefault(ln["scene"], {"id": ln["scene"], "voiceStart": t})
        sc["voiceEnd"] = t + dur
        chunks.append(x)
        gap = ln["pause"]
        chunks.append(np.zeros(int(gap * SR), np.float32))
        t += dur + gap
    chunks.append(np.zeros(int(cfg["tail"] * SR), np.float32))
    total = t + cfg["tail"]

    # cortes de cena: no meio do silêncio entre a última fala de uma cena e a primeira da próxima
    order = list(scenes.values())
    for j, sc in enumerate(order):
        sc["start"] = 0.0 if j == 0 else round((order[j - 1]["voiceEnd"] + sc["voiceStart"]) / 2, 3)
    for j, sc in enumerate(order):
        sc["end"] = round(total, 3) if j == len(order) - 1 else order[j + 1]["start"]
        sc["voiceStart"] = round(sc["voiceStart"], 3); sc["voiceEnd"] = round(sc["voiceEnd"], 3)

    raw = np.concatenate(chunks)
    raw_path = os.path.join(ep, "audio", "narration_raw.wav")
    sf.write(raw_path, raw, SR)
    # masterização da voz: limpeza de graves, presença, calor, compressão suave e ambiência curta
    out = os.path.join(ep, "audio", "narration.wav")
    af = ("highpass=f=70,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=2,"
          "equalizer=f=7500:t=q:w=1:g=-2,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,"
          "aecho=0.8:0.5:38|61:0.10|0.06,loudnorm=I=-16:TP=-1.5:LRA=9")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw_path, "-af", af, "-ar", str(SR), "-ac", "1", out], check=True)

    timing = {"fps": 30, "duration": round(total, 3), "scenes": order, "cues": cues}
    json.dump(timing, open(os.path.join(ep, "audio", "timings.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    srt = []
    for n, c in enumerate([c for c in cues], 1):
        f = lambda s: "%02d:%02d:%02d,%03d" % (s // 3600, s % 3600 // 60, s % 60, round((s % 1) * 1000) % 1000)
        srt.append(f"{n}\n{f(c['start'])} --> {f(c['end'])}\n{c['text']}\n")
    os.makedirs(os.path.join(ep, "subtitles"), exist_ok=True)
    open(os.path.join(ep, "subtitles", "legendas.srt"), "w", encoding="utf-8").write("\n".join(srt))
    print("total", round(total, 2), "s;", len(cues), "falas;", len(order), "cenas")


if __name__ == "__main__":
    main()
