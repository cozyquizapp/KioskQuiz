# Gouache-Avatare

Aquarell-/Bilderbuch-Stil-Variante der 8 Team-Avatare.
Werden automatisch von der `/gouache`-Welt + parallelen Gouache-Pages
geladen. Wenn eine Datei hier fehlt, fällt der Code auf die
`cozy-cast`-Version zurück.

## Erwartete Dateien

| Slug | Tier | Hoodie-Hex | Hoodie-Beschreibung |
|------|------|------------|---------------------|
| `shiba`     | Hund      | `#7A9E7E` | sage green hoodie         |
| `faultier`  | Faultier  | `#E07A5F` | terracotta hoodie         |
| `pinguin`   | Pinguin   | `#F2EAD3` | cream / off-white hoodie  |
| `koala`     | Koala     | `#D9A05B` | mustard ochre hoodie      |
| `giraffe`   | Giraffe   | `#1F3A5F` | deep ink blue hoodie      |
| `waschbaer` | Waschbär  | `#2D2A26` | charcoal hoodie           |
| `kuh`       | Kuh       | `#3D5A80` | muted dusty blue hoodie   |
| `capybara`  | Capybara  | `#B8CDB1` | pale sage hoodie          |

Dateinamen-Schema: **`avatar-{slug}.png`** (+ `avatar-{slug}.webp` Variante).

## Komprimierung

Die produktiven Dateien hier sind **komprimierte Varianten** (≈ 300–500 KB
PNG, ≈ 60–120 KB WebP). Originale (9–13 MB pro PNG) liegen in
`frontend/avatars-source-gouache/` (gitignored — nicht im Repo, lokal als
Backup).

**Komprimierung neu starten** (z.B. nach Avatar-Update):

```bash
node scripts/compressGouacheAvatars.mjs
```

Das Script liest aus `frontend/avatars-source-gouache/`, schreibt nach
`frontend/public/avatars/gouache/` mit:
- PNG: `1024×1024`, palette: true, quality 90, effort 10
- WebP: `1024×1024`, quality 80, effort 6

Wenn du **neue Originale** einfügen willst: leg sie in
`frontend/avatars-source-gouache/` ab und lass das Script laufen.

## Empfohlene Bild-Specs

- **Format**: PNG mit transparentem Hintergrund (oder warmem cream-Background
  passend zum Aquarell-Look — beide gehen, wir bekommen's im Code in einen
  Kreis-Frame)
- **Auflösung**: mindestens 512×512px, gerne 1024×1024px für Retina
- **Komposition**: Tier-Schulterportrait (Brust+Kopf), Tier schaut leicht
  in die Kamera, frontale Ansicht
- **Stil**: Aquarell/Gouache, weiche Pinselstriche, Papier-Textur sichtbar,
  warme harmonische Farben, leicht naive/unperfekte Strichführung
- **Wichtig für die Spielfeld-Erkennung**: Hoodie deutlich in der genannten
  Hex-Farbe (oder einer leicht aquarell-bewegten Variante davon) — der
  Hoodie ist das wichtigste Wiedererkennungs-Merkmal auf dem Grid

## Master-Prompt für AI-Generatoren

Wenn du Midjourney, DALL-E, Stable Diffusion etc. nutzt:

```
Watercolor children's book illustration of a [TIER] wearing a [HOODIE]
hoodie, soft warm earthy palette, paper texture visible, gentle brush
strokes, slightly naive expressive style, frontal portrait, character
facing camera with friendly eyes, harmonious muted colors, hint of
watercolor bleed at edges, plain off-white background.
```

Beim Generieren der 8 Avatare den **Stil-Teil identisch lassen** und nur
`[TIER]` + `[HOODIE]` austauschen — dann wirken alle 8 als zusammen­
gehöriges Set.
