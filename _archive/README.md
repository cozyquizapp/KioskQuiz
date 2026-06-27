# _archive — stillgelegter Alt-Code & Alt-Assets

Hier liegt **bewusst aufbewahrtes** altes Material (per `git mv` verschoben, nichts
gelöscht). Diese Dateien werden vom Build **nicht** angefasst:
- `_archive/` liegt außerhalb von `frontend/` → weder Vite (Bundle) noch
  `tsconfig` (`include: ["src"]`) erfassen es.

Vor dem Verschieben verifiziert: **nichts Lebendiges importiert/referenziert** diese
Dateien mehr.

## 2026-06-27 — Altes Avatar-System (vor cozy3d)
Ersetzt durch das aktuelle `cozy3d`-System (+ `cozywolf`-Maskottchen + `cozy-cast`-PNG-Set).
Ein anderer Build-Lauf hatte sich aus Versehen diese alten Avatare gezogen → archiviert.

**Toter Source-Code** (`_archive/src/…`, hatte keine lebenden Importer):
- `config/avatars.ts` — alte `AvatarOption`-Liste (SVG/Video-Tiere)
- `config/avatarStates.ts`
- `hooks/useAvatarIdleScheduler.ts`, `hooks/useAvatarPreload.ts`, `hooks/useAvatarSequenceRunner.ts`
- `components/moderator/TeamsList.tsx` (alte Variante; die genutzten moderator-Komponenten
  bleiben in `frontend/src/components/moderator/`)

**Alt-Assets** (`_archive/public-avatars/…`, nur von `config/avatars.ts` referenziert):
- `blauwal, eichhoernchen, giraffe, igel, katze, pandabaer, pferd, wolf` (~37 MB SVG/Video)

## 2026-06-27 — Tote Icons + cozyCast-Set
**`_archive/icons/`** — 19 ungenutzte Icon-PNGs (kein lebender Render; nur Typ-Union/
Fallback in QQIcon.tsx): paralleler `fx-cat-*` (5), `fx-sub-*` (4), `fx-marker-*` (4)
Satz (Doubletten zu den aktiven `cat-*`/`sub-*`/`marker-*`), `fx-mucho-alt-*` (2),
`fx-zvz-alt-*` (2), `fx-lightning`, `fx-stack` (aus EMOJI_TO_SLUG auskommentiert).
Aktiv geblieben: `cat-*`, `sub-*`, `marker-*` + 19 via Emoji erreichbare `fx-*`.

> ⚠️ **Bonus-Fund dabei:** 13 **aktive** Icons (`cat-*`/`sub-*`/`marker-*`) waren im
> Arbeitsverzeichnis **versehentlich gelöscht** (nicht von diesem Cleanup — Working-Tree-
> Deletion, vmtl. vom Landing-Build). Aus git HEAD wiederhergestellt.

**`_archive/public-avatars/cozy-cast/`** — altes PNG-Avatar-Set „CozyCast". `cozyCast`-
Eintrag aus `avatarSets.ts` `AVATAR_SETS` entfernt (nicht mehr im /team-Picker). Der
PngAvatar-Codepfad bleibt (toter, harmloser Zweig); `getSet()` fällt auf Default zurück.

### Zurückholen (falls doch nochmal gebraucht)
```bash
# Beispiel: einen Asset-Ordner zurück
git mv _archive/public-avatars/giraffe frontend/public/avatars/giraffe
# Beispiel: eine Source-Datei zurück
git mv _archive/src/config/avatars.ts frontend/src/config/avatars.ts
```
Danach Importpfade in den zurückgeholten Source-Dateien prüfen (relative Pfade
stimmen nach dem Hin-und-Her wieder, da identische Struktur unter `src/`).
