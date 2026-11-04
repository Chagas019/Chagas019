"""Monta slides/*.html a partir de src/*.html (cabeçalho comum + CSS e corpo de cada slide).
Uso: python3 scripts/build.py && node scripts/export.js
"""
import glob, os, re
root = os.path.join(os.path.dirname(__file__), "..")
head = open(os.path.join(root, "src", "_layout.html")).read()
for f in sorted(glob.glob(os.path.join(root, "src", "[0-9]*.html"))):
    s = open(f).read()
    title = re.search(r"<!--\s*title:(.*?)-->", s).group(1).strip()
    css = re.search(r"<style>(.*?)</style>", s, re.S).group(1).strip()
    body = re.sub(r"<style>.*?</style>|<!--\s*title:.*?-->", "", s, flags=re.S).strip()
    out = head.replace("__TITLE__", title).replace("__CSS__", css).replace("__BODY__", body)
    open(os.path.join(root, "slides", os.path.basename(f)), "w").write(out)
    print("ok", os.path.basename(f))
