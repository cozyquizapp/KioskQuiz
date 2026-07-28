# -*- coding: utf-8 -*-
"""
quirks-avatars-bake.py  (2026-07-28)

Backt das animierte "Cozy Quirks"-Set aus Wolfs Lieferung
(cozy-grid-avatars-animated-v2.zip). 8 slot-gebundene Charaktere (je Farb-Slot),
jeder mit 3 Frames: open (Ruhe), closed (Blink), + individueller Quirk.

Modell = eckige Team-Kachel (App rendert), Charakter-Farbe ist ins Motiv
gebacken. Render: open-Basis + closed/quirk als Opacity-Overlays → alle 3 Frames
MUESSEN pixelgenau alignen. Wolfs Frames teilen pro Avatar dieselbe Alpha-BBox
(validation.txt), daher hier NUR uniform 1024->TARGET resizen (KEIN per-Frame-
Trim, das wuerde die Overlays gegeneinander verschieben).

Kompression: 1024er-Frames sind ~1 MB. 24 Stueck = 24 MB → sprengt den PWA-
Precache (Workbox). Auf 512^2 runter + optimize → ~5 MB gesamt, fuer eine
~126px-Kachel (auch 2x Beamer) mehr als genug.

NUTZUNG: python scripts/quirks-avatars-bake.py [--size 512]
"""
import os, sys, zipfile, tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP  = os.path.join(REPO, "frontend", "public", "icons", "cozy-grid-avatars-animated-v2.zip")

# (Nummer-Farbe-Prefix in der Lieferung, Ziel-Farb-Slug, Quirk-Frame-Suffix)
AVATARS = [
    ("01-orange", "orange", "wink"),
    ("02-green",  "green",  "glance"),
    ("03-teal",   "teal",   "waveblink"),
    ("04-violet", "violet", "talk"),
    ("05-yellow", "yellow", "wink"),
    ("06-blue",   "blue",   "glance"),
    ("07-pink",   "pink",   "talk"),
    ("08-red",    "red",    "squint"),
]

def resize_frame(im, size):
    """Uniform 1024->size. KEIN Trim (Frame-Alignment bleibt erhalten)."""
    if im.size != (size, size):
        im = im.resize((size, size), Image.LANCZOS)
    return im

def main():
    out_dir = os.path.join(REPO, "frontend", "public", "avatars", "quirks")
    size = 512
    if "--size" in sys.argv: size = int(sys.argv[sys.argv.index("--size") + 1])
    os.makedirs(out_dir, exist_ok=True)

    tmp = tempfile.mkdtemp(prefix="quirks-")
    with zipfile.ZipFile(ZIP) as z: z.extractall(tmp)

    total = 0
    for prefix, color, quirk in AVATARS:
        for state_src, state_dst in [("open", "open"), ("closed", "closed"), (quirk, "action")]:
            src = os.path.join(tmp, f"{prefix}-{state_src}.png")
            im = Image.open(src).convert("RGBA")
            im = resize_frame(im, size)
            outp = os.path.join(out_dir, f"{color}-{state_dst}.png")
            im.save(outp, optimize=True)
            kb = os.path.getsize(outp) // 1024
            total += kb
            print(f"baked {color:7s} {state_dst:7s} ({state_src:9s}) {kb:4d} KB")
    print(f"total {total} KB ({total/1024:.1f} MB) in {out_dir}")

if __name__ == "__main__":
    main()
