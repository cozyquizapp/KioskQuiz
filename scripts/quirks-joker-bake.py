# -*- coding: utf-8 -*-
"""
quirks-joker-bake.py  (2026-07-29)

Backt das 11. Cozy-Quirks-Design "joker" (Harlekin) aus Wolfs Lieferung
`frontend/public/avatars/cozy-quirk-joker-team-colors-v1/` ins V2-Quirk-Format.

V2-Modell = frei kombinierbar (Design x Farbe): Assets liegen als
`avatars/quirks/<color>/<design>-<state>.webp` (512^2 RGBA). Die Lieferung
bringt joker in allen 8 Teamfarben mit 3 Frames open/closed/wink; wink wird auf
den generischen Quirk-Slot "action" gemappt.

Alle Joker-Frames teilen dieselbe Alpha-BBox (validation.txt: 100,38,923,986)
-> NUR uniform 1024->512 resizen (KEIN per-Frame-Trim), sonst verschieben sich
die Opacity-Overlays gegeneinander.

NUTZUNG: python scripts/quirks-joker-bake.py [--size 512]
"""
import os, sys
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(REPO, "frontend", "public", "avatars", "cozy-quirk-joker-team-colors-v1")
OUT_ROOT = os.path.join(REPO, "frontend", "public", "avatars", "quirks")

COLORS = ["orange", "green", "teal", "violet", "yellow", "blue", "pink", "red"]
# (Liefer-State, Ziel-State)
STATES = [("open", "open"), ("closed", "closed"), ("wink", "action")]


def main():
    size = 512
    if "--size" in sys.argv:
        size = int(sys.argv[sys.argv.index("--size") + 1])

    total = 0
    for color in COLORS:
        out_dir = os.path.join(OUT_ROOT, color)
        os.makedirs(out_dir, exist_ok=True)
        for state_src, state_dst in STATES:
            src = os.path.join(SRC_DIR, color, f"joker-{color}-{state_src}.png")
            im = Image.open(src).convert("RGBA")
            if im.size != (size, size):
                im = im.resize((size, size), Image.LANCZOS)
            outp = os.path.join(out_dir, f"joker-{state_dst}.webp")
            im.save(outp, "WEBP", quality=90, method=6)
            kb = os.path.getsize(outp) // 1024
            total += kb
            print(f"baked {color:7s} joker-{state_dst:7s} ({state_src:6s}) {kb:4d} KB")
    print(f"total {total} KB ({total/1024:.1f} MB) -> {OUT_ROOT}/<color>/joker-*.webp")


if __name__ == "__main__":
    main()
