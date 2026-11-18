"""PAFIES 2027 — Pós-produção / finalização.

1. Gera a LUT de color grading "PAFIES_Punch.cube" (33³) — carregável no DaVinci Resolve
   (Project Settings > Color Management > LUTs, ou nó com 3D LUT).
2. Divide o master do Remotion em clipes por cena (media/) para montagem.
3. Gera a timeline PAFIES2027_timeline.fcpxml (Resolve: File > Import > Timeline),
   com V1 = cenas, A1 = trilha, A2 = efeitos sonoros, A3 = locução (vazia, para gravar).
4. Finaliza: aplica a LUT, masteriza o áudio a -14 LUFS e exporta MP4 H.264 1080x1920 30fps.

Uso: python finalizar.py <master_sem_audio.mp4>
"""
import os, subprocess, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = os.path.abspath(os.path.join(ROOT, ".."))
FPS = 30
SCENES = [("CENA_01_ABERTURA", 0, 180), ("CENA_02_REVELACAO", 180, 240), ("CENA_03_SOLIDARIEDADE", 420, 300),
          ("CENA_04_EXPECTATIVA", 720, 240), ("CENA_05_FINAL", 960, 240)]


def run(cmd):
    print("$", " ".join(cmd[:6]), "...")
    subprocess.run(cmd, check=True)


# ---------- 1. LUT ----------
def make_lut(path, n=33):
    g = np.linspace(0, 1, n)
    lines = ['TITLE "PAFIES_Punch"', f"LUT_3D_SIZE {n}", "DOMAIN_MIN 0 0 0", "DOMAIN_MAX 1 1 1"]
    for b in g:          # .cube: R varia mais rápido
        for gg in g:
            for r in g:
                c = np.array([r, gg, b])
                # contraste em S suave (pivô 0.45)
                c = 0.45 + (c - 0.45) * 1.08
                c = np.clip(c, 0, 1)
                c = c + 0.06 * np.sin(np.pi * c) * (c - 0.45)
                # saturação +12% preservando luminância
                y = c @ np.array([0.2126, 0.7152, 0.0722])
                c = y + (c - y) * 1.12
                # sombras puxando para o azul royal, altas luzes levemente quentes
                sh = np.clip(1 - y / 0.35, 0, 1) ** 2
                hi = np.clip((y - 0.7) / 0.3, 0, 1)
                c = c + sh * np.array([-0.006, 0.0, 0.03]) + hi * np.array([0.015, 0.008, -0.012])
                c = np.clip(c, 0, 1)
                lines.append(f"{c[0]:.6f} {c[1]:.6f} {c[2]:.6f}")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")


# ---------- 3. FCPXML ----------
def fcpxml(path, media_dir, music, sfx):
    def t(fr):
        return f"{fr}/{FPS}s"
    res, clips = [], []
    for i, (name, start, dur) in enumerate(SCENES):
        rid = f"r{i + 2}"
        src = os.path.join(media_dir, f"{name}.mp4")
        res.append(f'<asset id="{rid}" name="{name}" start="0s" duration="{t(dur)}" hasVideo="1" hasAudio="0" format="r1" '
                   f'videoSources="1"><media-rep kind="original-media" src="file://{src}"/></asset>')
        clips.append((rid, name, start, dur))
    res.append(f'<asset id="r10" name="TRILHA" start="0s" duration="{t(1200)}" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000">'
               f'<media-rep kind="original-media" src="file://{music}"/></asset>')
    res.append(f'<asset id="r11" name="SFX" start="0s" duration="{t(1200)}" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000">'
               f'<media-rep kind="original-media" src="file://{sfx}"/></asset>')
    spine = []
    for k, (rid, name, start, dur) in enumerate(clips):
        inner = ""
        if k == 0:
            inner = (f'<asset-clip ref="r10" lane="-1" offset="0s" name="TRILHA" duration="{t(1200)}" start="0s" role="music"/>'
                     f'<asset-clip ref="r11" lane="-2" offset="0s" name="SFX" duration="{t(1200)}" start="0s" role="effects"/>')
        marker = f'<marker start="0s" duration="1/30s" value="{name}"/>'
        spine.append(f'<asset-clip ref="{rid}" offset="{t(start)}" name="{name}" duration="{t(dur)}" start="0s" format="r1" tcFormat="NDF">{marker}{inner}</asset-clip>')
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat1080x1920p30" frameDuration="1/30s" width="1080" height="1920" colorSpace="1-1-1 (Rec. 709)"/>
    {"".join(res)}
  </resources>
  <library>
    <event name="PAFIES 2027">
      <project name="PAFIES2027_10a_EDICAO">
        <sequence format="r1" duration="{t(1200)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
            {"".join(spine)}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
'''
    with open(path, "w") as f:
        f.write(xml)


if __name__ == "__main__":
    master = os.path.abspath(sys.argv[1])
    media = os.path.join(ROOT, "media")
    os.makedirs(media, exist_ok=True)
    lut = os.path.join(ROOT, "LUT", "PAFIES_Punch.cube")
    os.makedirs(os.path.dirname(lut), exist_ok=True)
    make_lut(lut)
    print("LUT:", lut)

    for name, start, dur in SCENES:
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", master, "-vf", f"trim=start_frame={start}:end_frame={start + dur},setpts=PTS-STARTPTS",
             "-c:v", "libx264", "-crf", "12", "-preset", "medium", "-pix_fmt", "yuv420p", "-an", os.path.join(media, f"{name}.mp4")])

    music = os.path.join(P, "08_AUDIO", "stems", "PAFIES2027_music.wav")
    sfx = os.path.join(P, "08_AUDIO", "stems", "PAFIES2027_sfx.wav")
    mix = os.path.join(P, "08_AUDIO", "PAFIES2027_mix.wav")
    fcpxml(os.path.join(ROOT, "PAFIES2027_timeline.fcpxml"), media, music, sfx)
    print("FCPXML ok")

    final = os.path.join(P, "10_FINAL", "PAFIES2027_10a_EDICAO_1080x1920.mp4")
    os.makedirs(os.path.dirname(final), exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", master, "-i", mix,
         "-filter_complex", f"[0:v]lut3d=file='{lut}':interp=tetrahedral,format=yuv420p[v];[1:a]loudnorm=I=-14:TP=-1.0:LRA=11[a]",
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slow", "-crf", "17", "-maxrate", "14M", "-bufsize", "28M",
         "-r", "30", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
         "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", "-t", "40", final])
    print("FINAL:", final)
