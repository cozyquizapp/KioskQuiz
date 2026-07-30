# -*- coding: utf-8 -*-
"""quirks-cat-cutout.py (2026-07-30)

Stellt Wolfs Quirks-Kategorie-Icons frei (grüner/magenta Chroma-Hintergrund raus),
normalisiert auf 512² und backt sie nach /icons/quirks/cat-*.png.

Chroma-Key = border-connected Flood (nur der zusammenhaengende Rand-Hintergrund
wird entfernt, keine Loecher im Motiv), 2px Foreground-Erode gegen den Chroma-
Fransen-Ring, weiche Alpha-Kante, Despill. Danach Crop auf Alpha-BBox + zentriert
auf Quadrat -> 512².
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = r"C:\Users\hornu\Desktop\für claude\NEUES MATERIAL"
OUT  = os.path.join(REPO, "frontend", "public", "icons", "quirks")

# Datei -> Kategorie-Slug (per Bild zugeordnet)
MAP = {
    "exec-6e8e5f78-528a-4c0e-bec7-9c6134293320.png": "cat-mucho",          # A-D Karte
    "exec-acb507f6-b833-4e83-bd28-90a4395d1ba7.png": "cat-schaetzchen",    # Zielscheibe
    "exec-ae374a78-fc11-4287-8386-8eefda98411e.png": "cat-bunte-tuete",    # Süßigkeiten-Tüte
    "exec-e2475ef3-a028-4f11-bc2d-a365ce38d697.png": "cat-zehn-von-zehn",  # Pokerchips
    "exec-fd1375ea-4dd9-4397-ab75-f797151c192e.png": "cat-cheese",         # Kamera
}


def cutout(im):
    rgb = np.array(im.convert("RGB")).astype(int)
    h, w = rgb.shape[:2]
    # Hintergrundfarbe aus den 4 Ecken (Median eines 24px-Blocks)
    corners = np.vstack([
        rgb[:24, :24].reshape(-1, 3), rgb[:24, -24:].reshape(-1, 3),
        rgb[-24:, :24].reshape(-1, 3), rgb[-24:, -24:].reshape(-1, 3),
    ])
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    cand = dist < 90                      # Kandidat-Hintergrund
    # nur rand-zusammenhaengende Komponenten = echter Hintergrund (keine Loecher)
    lbl, n = ndimage.label(cand)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bgmask = np.isin(lbl, list(border))
    fg = ~bgmask
    # Fransen-Ring killen: Foreground 2px erodieren
    fg = ndimage.binary_erosion(fg, structure=np.ones((3, 3)), iterations=2)
    fg = ndimage.binary_fill_holes(fg)
    alpha = (fg * 255).astype(np.uint8)
    # weiche Kante
    alpha = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8)))
    # Despill: Chroma-Stich am Rand daempfen (magenta: G anheben; gruen: G senken)
    out = np.array(im.convert("RGB")).astype(int)
    if bg[1] < bg[0] and bg[1] < bg[2]:   # magenta-artig (G am kleinsten)
        edge = (alpha > 10) & (alpha < 250)
        out[edge, 1] = np.maximum(out[edge, 1], np.minimum(out[edge, 0], out[edge, 2]))
    elif bg[1] > bg[0] and bg[1] > bg[2]: # gruen-artig (G am groessten)
        edge = (alpha > 10) & (alpha < 250)
        out[edge, 1] = np.minimum(out[edge, 1], np.maximum(out[edge, 0], out[edge, 2]))
    rgba = np.dstack([out.astype(np.uint8), alpha])
    return Image.fromarray(rgba, "RGBA")


def normalize(im, size=512, pad=0.04):
    bbox = im.getbbox()
    im = im.crop(bbox)
    w, h = im.size
    side = int(max(w, h) * (1 + pad * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((side - w) // 2, (side - h) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    for fn, slug in MAP.items():
        src = os.path.join(SRC, fn)
        im = Image.open(src)
        cut = cutout(im)
        norm = normalize(cut)
        outp = os.path.join(OUT, f"{slug}.png")
        norm.save(outp)
        print(f"{slug:20s} <- {fn[:16]}...  {os.path.getsize(outp)//1024} KB")
    print("done ->", OUT)


if __name__ == "__main__":
    main()
