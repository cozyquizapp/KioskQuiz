# Moderator-View — Optimierungen (Dev-Brief für VSC)

Stand 2026-06-29. Ergänzung zu `BEAMER_REVIEW.md` §10 (Moderator-View).
Quelle: Live-Screenshot „Wartet auf Antworten" (Bunte Tüte · Reihenfolge, 2/5 abgegeben).

**Kontext:** Operator-Tool, darf dichter sein. **Kein Rebuild** — inkrementell in die bestehende Moderator-Komponente. Marke: Pink `#EC4899` / Magenta `#A21247` / Navy, kein Amber/Gold. Reset bleibt klein/rot/rechts (schon erledigt), Tipp-Bar bleibt prominent.

Prioritäten: **P0 = Wert/Fehlervermeidung · P1 = Klarheit · P2 = Politur**

---

## P0 — Team-Abgaben automatisch gegen die Lösung matchen
**Problem:** Die korrekte Reihenfolge steht rechts im Lösungs-Panel. Die abgegebenen Antworten der Teams (`„Chihuahua|Dackel|Deutscher Schäferhund|Deutsche Dogge"`) muss der Moderator aktuell **per Auge** mit der Lösung vergleichen → langsam beim Auflösen, fehleranfällig.

**Lösung:** Submission gegen die Lösung normalisiert vergleichen und **visuell auszeichnen**:
- richtig → grüner Rahmen + ✓ (Marken-Grün ok, nur als Status, kein Gold)
- falsch → roter/gedimmter Rahmen + ✕
- Normalisierung: trim, lowercase, Trenner (`|`, `→`, `,`) vereinheitlichen, Mehrfach-Whitespace kollabieren. Bei Reihenfolge-Typ exakte Sequenz, bei Set-Typ ungeordneter Vergleich.
- **Erst nach „Antwort aufdecken"** einfärben (vorher neutral) — sonst spoilert es den Mod-Flow nicht, aber Auflösung wird 1-Blick.

**Akzeptanz:** Beim Aufdecken sieht der Mod ohne Lesen, welche der N Abgaben korrekt sind.

---

## P0 — Doppelte Frage/Antwort entfernen
**Problem:** Redundanz frisst Platz und Aufmerksamkeit:
- Die **Frage** steht 2×: Mitte (Team-Sicht + EN-Übersetzung) **und** als Header des rechten Lösungs-Panels.
- Die **Antwort** steht im rechten Panel 2×: einmal groß grün, dann nochmal Wort-für-Wort unter Label `REIHENFOLGE`.

**Lösung:**
- Rechtes Panel führt **mit der Antwort** (groß grün) — Frage dort nur als dünne 1-Zeilen-Referenz oder ganz weg (steht ja mittig).
- `REIHENFOLGE`-Zeile streichen, wenn sie die grüne Antwort wörtlich wiederholt. `KRITERIUM` (nach Schulterhöhe, klein→groß) **behalten** — das ist neue Info.

**Akzeptanz:** Frage 1×, Antwort 1×, Kriterium 1×. Keine Zeile wiederholt eine andere.

---

## P1 — Wartende Teams klar vom Status „abgegeben" trennen
**Problem:** Nur 2/5 haben abgegeben, aber die 3 offenen Teams (kein Antwort-Feld) sehen fast identisch zu den fertigen aus — nur ein winziger Punkt unterscheidet. Schwer scannbar.

**Lösung:**
- Pending-Team: deutliches `wartet …` (gedimmt) oder leiser Puls am Avatar/Punkt.
- Abgegeben: Häkchen/Stift-Marker wie bisher (`✎ abgegeben`).
- **STATUS-Reihe oben zum echten Tracker machen:** Punkt **gefüllt = abgegeben**, **hohl = offen**. Dann ist die obere Reihe der 1-Blick-Fortschritt (passt zur `2/5`-Anzeige), die Liste liefert Detail. Aktuell ist die Reihe nur dekorativ neben der Liste.

**Akzeptanz:** Aus 3 m Distanz erkennbar, welche Teams noch fehlen — oben **und** in der Liste konsistent.

---

## P1 — Die große Zahl pro Team beschriften
**Problem:** Rechts pro Team eine große Zahl (5 / 3 / 5 / 8 / 4) ohne Label, daneben im Subtitle „9 Felder". Zwei Zahlen, unklare Semantik (Score? Felder? Sterne?).

**Lösung:** Großzahl mit Mini-Label oder Icon eindeutig machen (z. B. „Pkt" / Feld-Icon). Wenn Großzahl == Felder == Subtitle-Zahl: eine davon raus (Doppelung). Team-Farbe der Zahl bleibt.

**Akzeptanz:** Jede Zahl im Team-Row hat eindeutige, sofort lesbare Bedeutung.

---

## P2 — Toter Raum in der Aktions-Card nutzen
„Antwort aufdecken" + „Pause" sitzen links in einer breiten Card, der Rest bis zum Reset (rechts) ist leer. Diese Fläche kann den **Live-Stand** tragen: `2/5 abgegeben · 3 offen` (+ ggf. Sekunden). Macht die Card zum Status-Anker statt Leerraum.

## P2 — Zwei „Space"-Controls im Header entwirren
Header hat `⏎Space` **und** den grünen `▶ Space` — beide mit „Space" beschriftet, verwechselbar. Eines klarer benennen (z. B. das ⏎ als „Zurück"/Undo, das ▶ als „Weiter"), damit nicht zwei Buttons dieselbe Taste suggerieren.

---

## Bewusst NICHT ändern
- Reset (klein/rot/rechts abgesetzt) — sitzt.
- Split **Links = Frage (Team-Sicht) / Rechts = Lösung (Mod-only)** — richtig, nur entdoppeln.
- Moderator-Tipp-Bar prominent — sitzt.
- Team-Identitätsfarben (orange/grün/teal/lila/gold) — konsistent lassen.
- Header-Pills (Runde/Frage/Timer/Uhr/Restzeit) — operator-dicht ok.
