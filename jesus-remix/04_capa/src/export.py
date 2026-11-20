# Exporta versões JPG de plataforma (RGB, perfil sRGB embutido). Rodar após render.js:
#   python3 export.py
import os
from PIL import Image, ImageCms
D = os.path.dirname(os.path.abspath(__file__)); CAPA = os.path.join(D, '..')
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
def jpg(src, dst, q, rm=False):
    im = Image.open(src).convert('RGB')
    im.save(dst, 'JPEG', quality=q, subsampling=0, optimize=True, icc_profile=SRGB)
    if rm: os.remove(src)
    print('ok', os.path.relpath(dst, CAPA), im.size, f'{os.path.getsize(dst)/1e6:.2f} MB')
jpg(os.path.join(CAPA, 'capa_3000.png'), os.path.join(CAPA, 'capa_spotify_3000.jpg'), 95)
jpg(os.path.join(CAPA, 'youtube_thumb_1280x720.png'), os.path.join(CAPA, 'youtube_thumb_1280x720.jpg'), 92, rm=True)
