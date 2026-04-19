# Cozy Cast Avatars

Fertige Team-Avatare im CozyWolf-Brand-Style (team-farbiger Ring +
illustrierter Charakter), direkt aus Canva.

## Naming convention
Pattern: `avatar-{slug}.png`

| Slug        | Team             | Ring-Farbe |
| ----------- | ---------------- | ---------- |
| `shiba`     | Shiba — Pink     | `#EC4899`  |
| `faultier`  | Faultier — Lime  | `#84CC16`  |
| `pinguin`   | Pinguin — Blue   | `#2563EB`  |
| `koala`     | Koala — Violet   | `#8B5CF6`  |
| `giraffe`   | Giraffe — Yellow | `#EAB308`  |
| `waschbaer` | Waschbär — Teal  | `#14B8A6`  |
| `kuh`       | Kuh — Orange     | `#F97316`  |
| `capybara`  | Capybara — Red   | `#DC2626`  |

## Usage
Lädt im Frontend über `qqGetAvatar(avatarId)` in
`shared/quarterQuizTypes.ts`. Fällt die Datei, zeigt `QQTeamAvatar`
einen Emoji-Fallback im farbigen Kreis.
