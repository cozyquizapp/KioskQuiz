# -*- coding: utf-8 -*-
"""
quirks2-bake.py  (2026-07-29)

Backt „Cozy Quirks 2.0" aus Wolfs Lieferung
`frontend/public/avatars/quirk-editor-webapp-v1.zip` (quirk-editor/assets/fixed/).

Modell = SLOT-GEBUNDEN (wie Cozy Pack / cozyWolves): 8 Designs, jedes mit EINER
fest gebackenen Teamfarbe (Prisma=orange … Quad=rot), index-aligned zu QQ_AVATARS.
Eckige Kachel (Farbe ins Motiv gebacken), nur 2 Frames: base (Ruhe) + blink.
KEINE Action/Quirk-Geste (anders als das freie V2-Set cozyQuirks).

base+blink teilen pro Design dieselbe Alpha-BBox (validiert) → NUR uniform
1024->512 resizen (kein per-Frame-Trim), sonst verschieben sich die Overlays.

Ausgabe: `avatars/quirks2/<id>-{open,closed}.webp` (open=base, closed=blink).

NUTZUNG: python scripts/quirks2-bake.py [--size 512]
"""
import os, sys, zipfile, tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP  = os.path.join(REPO, "frontend", "public", "avatars", "quirk-editor-webapp-v1.zip")
OUT  = os.path.join(REPO, "frontend", "public", "avatars", "quirks2")

# id (Datei-Basis) — Reihenfolge = Slot 0..7 (orange, green, teal, violet, yellow, blue, pink, red)
IDS = ["prisma", "orbit", "wink", "split", "duo", "stack", "ripple", "quad"]
STATES = [("base", "open"), ("blink", "closed")]


def main():
    size = 512
    if "--size" in sys.argv:
        size = int(sys.argv[sys.argv.index("--size") + 1])
    os.makedirs(OUT, exist_ok=True)

    tmp = tempfile.mkdtemp(prefix="quirks2-")
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(tmp)
    src_dir = os.path.join(tmp, "quirk-editor", "assets", "fixed")

    total = 0
    for qid in IDS:
        for state_src, state_dst in STATES:
            src = os.path.join(src_dir, f"{qid}-{state_src}.png")
            im = Image.open(src).convert("RGBA")
            if im.size != (size, size):
                im = im.resize((size, size), Image.LANCZOS)
            outp = os.path.join(OUT, f"{qid}-{state_dst}.webp")
            im.save(outp, "WEBP", quality=90, method=6)
            kb = os.path.getsize(outp) // 1024
            total += kb
            print(f"baked {qid:7s} {state_dst:7s} ({state_src:5s}) {kb:4d} KB")
    print(f"total {total} KB ({total/1024:.1f} MB) -> {OUT}/<id>-*.webp")


if __name__ == "__main__":
    main()
