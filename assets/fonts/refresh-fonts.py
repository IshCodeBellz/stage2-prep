#!/usr/bin/env python3
# Re-run from the repo root to refresh assets/fonts.css and assets/fonts/.
"""Pull the three families down from Google Fonts and write a local @font-face
sheet. Only latin and latin-ext are kept — the site is UK rail, and the other
subsets are most of the bytes."""
import re, os, subprocess, sys

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)))
KEEP = {"latin", "latin-ext"}

# Archivo and Public Sans are variable on Google Fonts, so one file covers the
# whole weight range — which the stylesheets need, as they use 620 and 650.
# IBM Plex Mono is static, so its weights are listed out.
FAMILIES = [
    ("Archivo",       "Archivo:wght@400..800"),
    ("Public Sans",   "Public+Sans:wght@400..700"),
    ("IBM Plex Mono", "IBM+Plex+Mono:wght@400;500;600;700"),
]

def fetch(url, binary=False):
    r = subprocess.run(["curl", "-sS", "-A", UA, url],
                       capture_output=True, check=True)
    return r.stdout if binary else r.stdout.decode("utf-8")

os.makedirs(OUT, exist_ok=True)
blocks, files = [], []

for nice, spec in FAMILIES:
    css = fetch(f"https://fonts.googleapis.com/css2?family={spec}&display=swap")
    # each @font-face is preceded by a /* subset */ comment
    parts = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)
    if not parts:
        sys.exit(f"no @font-face found for {nice}")
    kept = 0
    for subset, block in parts:
        if subset not in KEEP:
            continue
        url = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", block).group(1)
        wght = re.search(r"font-weight:\s*([^;]+);", block).group(1).strip()
        slug = nice.lower().replace(" ", "-")
        name = f"{slug}-{subset}-{wght.replace(' ', '-')}.woff2"
        open(os.path.join(OUT, name), "wb").write(fetch(url, binary=True))
        files.append(name)
        blocks.append(
            re.sub(r"url\(https://fonts\.gstatic\.com/[^)]+\)", f"url(fonts/{name})", block)
               .replace("@font-face {", f"/* {nice} · {subset} */\n@font-face {{")
        )
        kept += 1
    print(f"{nice:14} {kept} file(s)")

header = """/* The three families the design uses, served from this origin.

   They were on fonts.googleapis.com, which is a network round trip on the
   critical path of an app whose whole point is working with no signal — on the
   Underground a phone would fall back to system type and the design would not
   survive the journey. These are precached by sw.js instead.

   Archivo and Public Sans are the variable cuts, so the odd weights the
   stylesheets ask for (620, 650) render exactly rather than rounding to the
   nearest static. IBM Plex Mono has no variable cut and is listed out.

   Latin and latin-ext only. Rebuild with the script in the pull request if a
   family or weight changes. */

"""
open(os.path.join(OUT, "..", "fonts.css"), "w").write(header + "\n\n".join(blocks) + "\n")
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
print(f"\n{len(files)} files, {total/1024:.0f} KB total")
print("PRECACHE=" + ",".join(f"/assets/fonts/{f}" for f in files))
