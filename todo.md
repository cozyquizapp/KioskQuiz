# QQ TODO

## Offen / In Diskussion

### Schätzchen — Punkte für Range-Treffer (User denkt drüber nach, Stand 2026-04-25)

**Idee**: alle Teams die innerhalb von ±5% am Zielwert dran sind, bekommen Punkte.
Aktuell: nur 1 Gewinner (kleinste Distanz, Speed-Tiebreak). „Knapp daneben"-Teams gehen leer aus.

**Varianten zum Ansprechen**:

- **A) Stufen-Punkte**:
  - ±0% (genau): 3 Felder
  - ±5%: 2 Felder
  - ±10%: 1 Feld
  - Risiko: Grid füllt sich extrem schnell, wenn alle treffen (8 Teams × 5 Schätzchen-Runden)

- **B) Reine 5%-Range (binär)**:
  - In Range: 1 Feld
  - Außerhalb: 0
  - Vorteil: simpel
  - Risiko: bei großen Werten (Mio Einwohner) sind 5% sehr großzügig (50k Toleranz);
    bei kleinen Werten (50 Bauteile) sehr eng (2.5 Toleranz)

- **C) Adaptive Range**: min(5%, fester absoluter Wert je nach Größenordnung)
  - Vorteil: balanced über alle Skalen
  - Nachteil: Mehr Logik, schwerer zu erklären

- **D) Podium (Top-3)**: 1./2./3. Platz bekommen Felder, range-frei

**Empfehlung (CozyClaude)**:
Variante **B + Tweak**:
- ±5% **oder** absolute Min-Toleranz bei kleinen Werten (z.B. ±2 bei <50)
- Genau-Treffer (Δ = 0): +1 Bonus-Feld extra (also 2 statt 1)
- So vermeiden: 8 Teams alle in Range → 8 Felder weg in einer Frage

**Offene Fragen**:
- Bei vollem Grid: bekommen Range-Sieger Klau-Recht statt Setzen?
- „Closest Call"-Trophy bleibt für genauesten Treffer (auch wenn mehrere Punkte kriegen)?

**Backend-Schema**:
- evalSchaetzchen muss Mehrfach-Sieger zurückgeben (correctTeamId → correctTeamIds[])
- Punkte-Counter pro Range-Stufe in `teamPhaseStats`?

**Frontend**:
- SchaetzchenReveal-UI muss mehrere "Treffer"-Avatare statt nur 1 Trophy zeigen
- Reveal-Animation: jeder Treffer pop't einzeln in seiner Range-Farbe

---

### Schild vs. Stapel — Game-Design-Frage (Stand 2026-04-25)

**Problem**: Schild (R3, max 2 pro Spiel) wirkt im 4-Phase-Modus überflüssig wenn in R4 Stapeln verfügbar ist (kein Limit, +1 Punkt pro Feld, dauerhaft sicher).

**Mögliche Lösungen**:
- Schild auch in R2 verfügbar machen (frühere Defense-Option)
- Stapel-Limit einführen (z.B. max 3 pro Spiel)
- Schild gibt zusätzlichen Bonus (z.B. „kann auch Stapel-Felder schützen"?)
- Akzeptieren: Schild ist eben die R3-Defense, Stapel die R4-Offense

**Empfehlung (CozyClaude)**: Schild & Stapel sind unterschiedliche Werkzeuge:
- Schild ist *Reaktion* in R3 (jemand will mein Feld klauen → blocken)
- Stapel ist *Endgame-Verstärkung* in R4 (mein Feld wird +1 Punkt wert)

Im 3-Phase-Modus (häufiger?) gibt's eh kein Stapel — Schild ist DIE R3-Defense.
Im 4-Phase-Modus: Schild bleibt nützlich für „Vorab-Schutz, bevor Gegner in R3 klauen". Aber in vielen Fällen wird man eher direkt auf Stapel in R4 warten.

**Feedback erwünscht** ob Anpassung gewollt oder OK so.

## Erledigt (zur Referenz)

- 2026-04-25: ⚡ Blitz-Rechteck zentral entfernt
- 2026-04-25: Comeback-Bug — Legacy-Auto-Steal-Trigger entfernt
- 2026-04-25: Jahreszahlen ohne Tausenderpunkt (Heuristik via `unit`)
- 2026-04-25: CozyGuessr Team-Karte größer (260px → 380-620px clamp)
- 2026-04-25: R4 Place erlaubt solange freie Felder
- 2026-04-25: Beamer-Wrapper-Sicherheitsrand entfernt (zeichnete sich ab)
