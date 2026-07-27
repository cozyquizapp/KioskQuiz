# -*- coding: utf-8 -*-
"""
party-avatars-bake.py  (2026-07-27)

Backt das slot-gebundene "Party 3D"-Avatar-Set aus Wolfs Lieferung.

Input  : frontend/public/icons/cozywolf-party-emotes-themed.zip
         (8 Objekte, je NN-name-base.png [transparent] + NN-name-accent-mask.png
          [weisse Silhouette der neutralen Akzentflaeche -> Team-Farbe]).
Output : 8 slot-getoente, normalisierte, transparente PNGs + ein Preview-Kontaktbogen.

Pipeline (offline vorgebacken -> zur Laufzeit nur "PNG auf Farb-Disc" wie die Woelfe):
- recolor(accent): HSV. H=Zielhue, S=Zielsat * highlight-taper (schuetzt weisse
  Glanzlichter), V-Lift fuer HELLE Zielfarben (Gelb/Orange leuchten statt oliv).
  Nur in der Masken-Region (Image.composite).
- pink_to_cream(gift base): pinke Box -> warmes Elfenbein (Pink = Marke, nimmt als
  grosse Flaeche dem Team-Akzent die Wirkung).
- trim_disco: scipy.ndimage.label -> nur die groessten ~6 Facetten toenen
  (Gold/Navy dominant, bleibt "Disco" statt "Teamkugel").

Slot-Mapping (reorderbar) + Slot-Farben = QQ_AVATARS.
NUTZUNG: python scripts/party-avatars-bake.py [--out <dir>] [--size 512]
"""
import os, sys, zipfile, tempfile, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP  = os.path.join(REPO, "frontend", "public", "icons", "cozywolf-party-emotes-themed.zip")

# Slot-Reihenfolge -> (Name, Team-Farbe [QQ_AVATARS], Objekt-Slug in der Lieferung, Ziel-Slug)
SLOTS = [
    ("Orange",  "#F97316", "01-disco-ball",   "disco"),
    ("Gruen",   "#22C55E", "02-champagne",    "champagne"),
    ("Teal",    "#14B8A6", "03-martini",      "martini"),
    ("Violett", "#A855F7", "04-cake",         "cake"),
    ("Gelb",    "#FACC15", "05-gift",         "gift"),
    ("Blau",    "#3B82F6", "06-balloons",     "balloons"),
    ("Pink",    "#EC4899", "07-party-popper", "popper"),
    ("Rot",     "#EF4444", "08-dice",         "dice"),
]

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def pink_to_cream(base):
    """Pinke Box -> warmes Elfenbein, Schattierung bleibt."""
    rgb = base.convert('RGB')
    H, S, V = [np.asarray(c).astype(np.float32) for c in rgb.convert('HSV').split()]
    hue, sat = H / 255.0, S / 255.0
    pink = (hue > 0.80) & (hue < 0.98) & (sat > 0.30)
    Hn, Sn, Vn = H.copy(), S.copy(), V.copy()
    Hn[pink] = int(0.09 * 255)                    # warm cream hue
    Sn[pink] = 0.14 * 255                          # low sat = ivory
    Vn[pink] = np.clip(V[pink] * 1.06 + 18, 0, 255)
    out = Image.fromarray(np.stack([Hn, Sn, Vn], -1).clip(0, 255).astype('uint8'), 'HSV').convert('RGB').convert('RGBA')
    out.putalpha(base.split()[3]); return out

def recolor(base, mask, thex, strength=1.0):
    rgb = base.convert('RGB')
    H, S, V = [np.asarray(c).astype(np.float32) for c in rgb.convert('HSV').split()]
    tr, tg, tb = [c / 255 for c in hexrgb(thex)]
    th, ts, tv = colorsys.rgb_to_hsv(tr, tg, tb)
    taper = np.clip((255.0 - V) / 22.0, 0, 1)                       # protect specular highlights
    lift  = float(np.clip((tv - 0.6) * 1.5, 0, 0.7))               # brighter for LIGHT targets
    Hn = np.full_like(H, th * 255.0)
    Sn = (ts * 255.0) * taper
    Vn = np.clip(V + (255.0 - V) * lift * np.clip(V / 210.0, 0, 1), 0, 255)
    newrgb = Image.fromarray(np.stack([Hn, Sn, Vn], -1).clip(0, 255).astype('uint8'), 'HSV').convert('RGB')
    msel = mask.split()[3]
    if strength < 1.0:
        msel = msel.point(lambda p: int(p * strength))
    out = Image.composite(newrgb, rgb, msel).convert('RGBA'); out.putalpha(base.split()[3]); return out

def trim_disco(mask, keep=6):
    a = np.asarray(mask.split()[3])
    from scipy import ndimage
    lbl, n = ndimage.label(a > 60)
    if n <= keep: return mask
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    order = np.argsort(sizes)[::-1][:keep] + 1                      # keep the biggest facets
    newa = (a * np.isin(lbl, order)).astype('uint8')
    out = mask.copy(); out.putalpha(Image.fromarray(newa)); return out

def normalize(obj, size=512, fill=0.88):
    """Objekt auf gleiche optische Groesse: bbox trimmen, zentriert auf Quadrat."""
    bb = obj.split()[3].getbbox(); crop = obj.crop(bb)
    cw, ch = crop.size; sc = (size * fill) / max(cw, ch)
    ns = (max(1, int(cw * sc)), max(1, int(ch * sc)))
    crop = crop.resize(ns, Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((size - ns[0]) // 2, (size - ns[1]) // 2))
    return canvas

def main():
    out_dir = REPO + r"\frontend\public\avatars\party"
    size = 512
    if "--out" in sys.argv:  out_dir = sys.argv[sys.argv.index("--out") + 1]
    if "--size" in sys.argv: size = int(sys.argv[sys.argv.index("--size") + 1])
    os.makedirs(out_dir, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="party-")
    with zipfile.ZipFile(ZIP) as z: z.extractall(tmp)
    # find dir with the base pngs
    src = tmp
    for root, _, files in os.walk(tmp):
        if any(f.endswith("-base.png") for f in files): src = root; break

    finals = []
    for name, chex, ofile, slug in SLOTS:
        base = Image.open(os.path.join(src, ofile + "-base.png")).convert('RGBA').resize((512, 512), Image.LANCZOS)
        mask = Image.open(os.path.join(src, ofile + "-accent-mask.png")).convert('RGBA').resize((512, 512), Image.LANCZOS)
        if slug == "gift":  base = pink_to_cream(base)
        if slug == "disco": mask = trim_disco(mask, keep=6)
        tint = recolor(base, mask, chex)
        final = normalize(tint, size=size)
        outp = os.path.join(out_dir, f"{slug}.png")
        final.save(outp)
        finals.append((name, chex, slug, final))
        print("baked", outp)

    # preview contact sheet on discs
    D = 300; pad = 14; labelh = 30
    W = pad + len(finals) * (D + pad); Hh = labelh + D + pad
    sheet = Image.new('RGBA', (W, Hh), (18, 14, 26, 255)); draw = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype("arialbd.ttf", 18)
    except Exception: font = ImageFont.load_default()
    for i, (name, chex, slug, final) in enumerate(finals):
        x = pad + i * (D + pad)
        disc = Image.new('RGBA', (D, D), (0, 0, 0, 0)); dr = ImageDraw.Draw(disc)
        dr.ellipse([0, 0, D - 1, D - 1], fill=hexrgb(chex) + (255,))
        o = final.resize((int(D * 0.92),) * 2, Image.LANCZOS)
        disc.alpha_composite(o, ((D - o.size[0]) // 2, (D - o.size[1]) // 2))
        draw.text((x + D // 2, 6), f"{name} - {slug}", fill=(230, 230, 235, 255), anchor="mm", font=font)
        sheet.alpha_composite(disc, (x, labelh))
    prev = os.path.join(out_dir, "_preview-slotbound.png")
    sheet.convert('RGB').save(prev, quality=93)
    print("preview", prev)

if __name__ == "__main__":
    main()
