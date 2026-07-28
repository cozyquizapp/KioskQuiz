# -*- coding: utf-8 -*-
"""
party-avatars-bake.py  (2026-07-28, neutral-on-disc)

Backt das "Party 3D"-Avatar-Set aus Wolfs NEUTRALER Lieferung (10 Objekte,
creme/gold/navy, KEIN Team-Akzent). Modell = cozy3d: neutrales PNG auf der
Slot-Farb-Disc, frei kombinierbar. Daher hier NUR normalisieren, kein Tint.

Input  : frontend/public/icons/cozyparty avatars/NN-name.png (10 Objekte).
Output : 10 getrimmte, zentrierte, gleich grosse transparente PNGs
         nach frontend/public/avatars/party/<slug>.png + Preview-Kontaktbogen.

NUTZUNG: python scripts/party-avatars-bake.py [--out <dir>] [--size 512]
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(REPO, "frontend", "public", "icons", "cozyparty avatars")

# Liefer-Datei -> (Ziel-Slug, Anzeige-Label, Preview-Disc-Farbe [QQ_AVATARS])
OBJECTS = [
    ("01-disco-ball",         "disco",     "Discokugel",  "#F97316"),
    ("02-champagne",          "champagne", "Sekt",        "#22C55E"),
    ("03-martini",            "martini",   "Cocktail",    "#14B8A6"),
    ("04-cake",               "cake",      "Torte",       "#A855F7"),
    ("05-gift",               "gift",      "Geschenk",    "#FACC15"),
    ("06-balloons",           "balloons",  "Ballons",     "#3B82F6"),
    ("07-party-popper",       "popper",    "Konfetti",    "#EC4899"),
    ("08-dice",               "dice",      "Wuerfel",     "#EF4444"),
    ("09-party-hat",          "hat",       "Partyhut",    "#F97316"),
    ("10-karaoke-microphone", "mic",       "Mikrofon",    "#22C55E"),
]

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def normalize(obj, size=512, fill=0.88):
    """Objekt auf gleiche optische Groesse: bbox trimmen, zentriert auf Quadrat."""
    bb = obj.split()[3].getbbox()
    if bb is None:
        return obj.resize((size, size), Image.LANCZOS)
    crop = obj.crop(bb)
    cw, ch = crop.size
    sc = (size * fill) / max(cw, ch)
    ns = (max(1, int(round(cw * sc))), max(1, int(round(ch * sc))))
    crop = crop.resize(ns, Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((size - ns[0]) // 2, (size - ns[1]) // 2))
    return canvas

def main():
    out_dir = os.path.join(REPO, "frontend", "public", "avatars", "party")
    size = 512
    if "--out" in sys.argv:  out_dir = sys.argv[sys.argv.index("--out") + 1]
    if "--size" in sys.argv: size = int(sys.argv[sys.argv.index("--size") + 1])
    os.makedirs(out_dir, exist_ok=True)

    finals = []
    for ofile, slug, label, chex in OBJECTS:
        path = os.path.join(SRC, ofile + ".png")
        base = Image.open(path).convert('RGBA')
        # Alpha-BBox messen (Wolf-Lieferungen NICHT als getrimmt annehmen).
        bb = base.split()[3].getbbox()
        final = normalize(base, size=size)
        outp = os.path.join(out_dir, f"{slug}.png")
        final.save(outp)
        finals.append((label, chex, slug, final))
        print(f"baked {slug:10s} bbox={bb} -> {outp}")

    # Preview-Kontaktbogen: jedes Objekt auf seiner Beispiel-Farb-Disc.
    D = 300; pad = 14; labelh = 30; per_row = 5
    rows = (len(finals) + per_row - 1) // per_row
    W = pad + per_row * (D + pad)
    Hh = rows * (labelh + D + pad)
    sheet = Image.new('RGBA', (W, Hh), (18, 14, 26, 255)); draw = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype("arialbd.ttf", 18)
    except Exception: font = ImageFont.load_default()
    for i, (label, chex, slug, final) in enumerate(finals):
        r, c = divmod(i, per_row)
        x = pad + c * (D + pad)
        y = r * (labelh + D + pad)
        disc = Image.new('RGBA', (D, D), (0, 0, 0, 0)); dr = ImageDraw.Draw(disc)
        dr.ellipse([0, 0, D - 1, D - 1], fill=hexrgb(chex) + (255,))
        o = final.resize((int(D * 0.9),) * 2, Image.LANCZOS)
        disc.alpha_composite(o, ((D - o.size[0]) // 2, (D - o.size[1]) // 2))
        draw.text((x + D // 2, y + 6), f"{label} - {slug}", fill=(230, 230, 235, 255), anchor="mm", font=font)
        sheet.alpha_composite(disc, (x, y + labelh))
    prev = os.path.join(out_dir, "_preview.png")
    sheet.convert('RGB').save(prev, quality=93)
    print("preview", prev)

if __name__ == "__main__":
    main()
