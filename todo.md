# QQ TODO

## Offen / In Diskussion

### Schätzchen — Punkte für Range-Treffer (User denkt drüber nach, Stand 2026-04-25)

**Idee**: alle Teams die innerhalb einer Range am Zielwert dran sind, bekommen Punkte.
Aktuell: nur 1 Gewinner (kleinste Distanz, Speed-Tiebreak). „Knapp daneben"-Teams gehen leer aus.

#### Range-Modell — adaptive % je nach Wertgröße (User-Vorschlag)

Festes 5% ist nicht überall sinnvoll:
- 50.000 Einwohner ±5% = ±2.500 → fast trivial getroffen
- 24 Stück ±5% = ±1,2 → nur bei exaktem Treffer in Range

**Konkrete Formel-Vorschläge** (zur Auswahl):

- **F1 — Größenabhängige %**:
  ```
  Wert < 100      →  20%
  Wert 100-1.000  →  10%
  Wert 1.000-10k  →   7%
  Wert 10k-1Mio   →   5%
  Wert > 1Mio     →   3%
  ```

- **F2 — Logarithmisch**: `tolerance = value * (0.20 - 0.025 * log10(value))`
  - Wert 10: 17.5% (1.75)
  - Wert 100: 15% (15)
  - Wert 1000: 12.5% (125)
  - Wert 10k: 10% (1k)
  - Wert 1Mio: 5% (50k)
  - Wert 100Mio: 0% — muss noch min-cap kriegen

- **F3 — Hybrid (% UND absolut, beide gelten)**:
  ```
  range = max(value * 0.05, sqrt(value))
  ```
  - Wert 25: max(1.25, 5) = 5 (=20% effektiv)
  - Wert 100: max(5, 10) = 10 (=10%)
  - Wert 10.000: max(500, 100) = 500 (=5%)
  - Wert 1Mio: max(50k, 1k) = 50k (=5%)

**Empfehlung**: F1 ist am einfachsten zu erklären und debugbar. F3 ist mathematisch elegant.

#### Punkte-Stufen-Vorschlag (mit adaptiver Range)

- **Genau (Δ = 0)**: 2 Felder + „Closest Call"-Trophy
- **In Range (gemäß Formel)**: 1 Feld
- **Außerhalb**: 0

Bei voller Grid: Range-Sieger bekommen Klau-Recht statt Setzen.

#### Backend-Schema-Änderungen

- `evalSchaetzchen` muss Mehrfach-Sieger zurückgeben (`correctTeamId` → `correctTeamIds[]`)
- Optional: Punkte-Bonus-Counter pro Team in `teamPhaseStats`

#### Frontend-Änderungen

- `SchaetzchenReveal`-UI: mehrere Treffer-Avatare in einer Reihe statt nur 1 Trophy
- Reveal-Animation: jeder Treffer pop't einzeln, Range-Indikator als visueller Bogen
- Optional: Bonus-Animation für „Genau"-Treffer (Konfetti / Sparkles / Trophy)

#### Offene Fragen

- Welche Formel (F1/F2/F3) gefällt am besten?
- Bei vollem Grid: Range-Sieger → Klau-Recht oder leer aus?
- „Closest Call"-Trophy bleibt für genauesten Treffer auch wenn mehrere Punkte kriegen?

---

### Erledigte Game-Design-Diskussionen (zur Referenz)

#### Klimakurve R1 → R4 (umgesetzt 2026-04-25)

**Vorher**: R4 entzieht Place/Bann/Schild und zeigt nur Tauschen+Stapeln. Bruch im Lernrhythmus.

**Jetzt**: additive Progression — jede Runde + 1 Werkzeug:
- R1: Place 1×
- R2: + Klauen (max 2 pro Runde)
- R3: + Bann + Schild (max 2 Schild pro Spiel)
- R4: + Stapeln (Tauschen entfällt, Schild → Stapel als upgraded Defense mit +1 Punkt)

**Tauschen** wurde gedroppt — Mechanik war nischig (eigenes ↔ Gegner-Feld), inhaltlich ähnlich
zu Klauen, und R4 mit 5 Aktionen passt besser ohne sie.

## Erledigt (zur Referenz)

- 2026-04-25: ⚡ Blitz-Rechteck zentral entfernt
- 2026-04-25: Comeback-Bug — Legacy-Auto-Steal-Trigger entfernt
- 2026-04-25: Jahreszahlen ohne Tausenderpunkt (Heuristik via `unit`)
- 2026-04-25: CozyGuessr Team-Karte größer (260px → 380-620px clamp)
- 2026-04-25: R4 Place erlaubt solange freie Felder
- 2026-04-25: Beamer-Wrapper-Sicherheitsrand entfernt (zeichnete sich ab)
- 2026-04-25: Klimakurve R1 → R4 — additive Progression, Tauschen gedroppt, Bann ab R4
