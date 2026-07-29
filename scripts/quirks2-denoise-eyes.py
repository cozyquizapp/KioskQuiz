# -*- coding: utf-8 -*-
"""
quirks2-denoise-eyes.py  (2026-07-29)

Wolf-Fund: die cremefarbenen Augen-Weissflaechen in Wolfs quirk-editor-Lieferung
haben ein koerniges Rausch-/Fleckenmuster ("schwarze flecken in den weissen
augen"). Das steckt in der ROH-PNG (nicht im Bake).

Fix: gezielte Entrauschung NUR auf den Creme-Augenweiss-Flaechen. Maske =
helle, entsaettigte Pixel (Creme), morphologisch geschlossen (fuellt die
Flecken-Loecher), leicht erodiert (kein Bleed auf den lila Rand). Median-
Glaettung wird nur dort einkomponiert. Pupille (grosses Schwarz), lila Koerper
und Outline bleiben unangetastet — Geometrie/Alpha-BBox unveraendert (nur
Farbglaettung im Inneren), damit base+blink weiter deckungsgleich sind.

Liest die Roh-PNGs aus dem Zip, schreibt entrauschte 1024er-PNGs in einen
Ordner, den quirks2-bake.py dann backen kann — ODER (mit --bake) direkt die
finalen webps.

NUTZUNG:
  python scripts/quirks2-denoise-eyes.py --only split --preview   # nur Vorschau
  python scripts/quirks2-denoise-eyes.py --bake                    # alle -> webp
"""
import os, sys, zipfile, tempfile
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP  = os.path.join(REPO, "frontend", "public", "avatars", "quirk-editor-webapp-v1.zip")
OUT  = os.path.join(REPO, "frontend", "public", "avatars", "quirks2")
SCR  = r"C:\Users\hornu\AppData\Local\Temp\claude\c--Users-hornu-Desktop-kioskquiz\56439679-31e4-41d5-85bb-a520f7c14ea6\scratchpad"

IDS = ["prisma", "orbit", "wink", "split", "duo", "stack", "ripple", "quad"]
STATES = [("base", "open"), ("blink", "closed")]


def disk(r):
    y, x = np.ogrid[-r:r+1, -r:r+1]
    return (x*x + y*y) <= r*r


def cream_mask(rgb):
    """Bool-Maske der hellen, entsaettigten Creme-Augenweiss-Pixel."""
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0.0)
    # Creme: hell (min-Kanal deutlich > Mitte) UND niedrig gesaettigt (nicht lila).
    return (mn > 135) & (sat < 0.34)


def denoise_eyes(im):
    """Median-Glaettung nur auf den (geschlossenen) Creme-Flaechen."""
    rgba = np.array(im.convert("RGBA"))
    rgb = rgba[..., :3]
    core = cream_mask(rgb)
    if core.sum() < 50:
        return im  # keine Creme-Flaeche -> unveraendert
    # Flecken-Loecher in der Creme fuellen (closing), Pupille (gross) bleibt Loch.
    closed = ndimage.binary_closing(core, structure=disk(7))
    # kein Bleed auf den lila Rand: Maske leicht einwaerts.
    region = ndimage.binary_erosion(closed, structure=disk(3))
    if region.sum() < 50:
        return im
    # Median toetet die Korn-Spikes, anschliessender Gauss glaettet den Rest —
    # das breite Augen-Shading (weiche Tiefpass-Struktur) bleibt erhalten.
    smoothed = (im.convert("RGBA")
                  .filter(ImageFilter.MedianFilter(size=13))
                  .filter(ImageFilter.GaussianBlur(radius=5)))
    smoothed = np.array(smoothed)
    out = rgba.copy()
    m = region[..., None]
    out[..., :3] = np.where(m, smoothed[..., :3], rgba[..., :3])  # Alpha unangetastet
    return Image.fromarray(out, "RGBA")


def main():
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    preview = "--preview" in sys.argv
    bake = "--bake" in sys.argv
    size = 512

    tmp = tempfile.mkdtemp(prefix="q2den-")
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(tmp)
    src_dir = os.path.join(tmp, "quirk-editor", "assets", "fixed")

    ids = [only] if only else IDS
    os.makedirs(OUT, exist_ok=True)
    for qid in ids:
        for state_src, state_dst in STATES:
            src = os.path.join(src_dir, f"{qid}-{state_src}.png")
            im = Image.open(src).convert("RGBA")
            fixed = denoise_eyes(im)
            if preview:
                # Vorher/Nachher-Zoom aufs untere/erste Auge (nur zur Sichtung).
                p = os.path.join(SCR, f"{qid}-{state_dst}-fixed-full.png")
                fixed.resize((size, size), Image.LANCZOS).save(p)
                print("preview ->", p)
            if bake:
                out = fixed
                if out.size != (size, size):
                    out = out.resize((size, size), Image.LANCZOS)
                outp = os.path.join(OUT, f"{qid}-{state_dst}.webp")
                out.save(outp, "WEBP", quality=90, method=6)
                print(f"baked {qid:7s} {state_dst:7s} {os.path.getsize(outp)//1024:4d} KB")


if __name__ == "__main__":
    main()
