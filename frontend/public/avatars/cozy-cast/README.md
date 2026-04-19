# Cozy Cast Avatars

Fertige Team-Avatare im CozyWolf-Brand-Style (team-farbiger Ring +
illustrierter Charakter), direkt aus Canva. Transparenter Hintergrund,
zwei PNGs pro Avatar: offene + geschlossene Augen (für Blinzel-Animation).

## Naming convention
Pattern: `avatar-{slug}.png` + `avatar-{slug}-closed.png`

| Slug        | Label (DE)       | Label (EN) | Ring-Farbe |
| ----------- | ---------------- | ---------- | ---------- |
| `shiba`     | Hund             | Dog        | `#FA507F`  |
| `faultier`  | Faultier         | Sloth      | `#9DCB2F`  |
| `pinguin`   | Pinguin          | Penguin    | `#266FD3`  |
| `koala`     | Koala            | Koala      | `#9A65D5`  |
| `giraffe`   | Giraffe          | Giraffe    | `#FEC814`  |
| `waschbaer` | Waschbär         | Raccoon    | `#68B4A5`  |
| `kuh`       | Kuh              | Cow        | `#FF751F`  |
| `capybara`  | Capybara         | Capybara   | `#F84326`  |

## Usage
Lädt im Frontend über `qqGetAvatar(avatarId)` aus
`shared/quarterQuizTypes.ts` (liefert `image` + `imageClosed`-Pfade).
`QQTeamAvatar` stackt beide und blendet den closed-Layer via Keyframe
ein/aus → Blinzel. Fällt die Datei, zeigt die Komponente einen
Emoji-Fallback im farbigen Kreis.

## Kompression
Canva-Exports sind typischerweise 5–10 MB pro PNG. Vor dem Commit mit
`node scripts/compressAvatars.mjs` komprimieren → resized auf max
1024×1024 + Palette-PNG → ~100–200 KB pro Datei.
