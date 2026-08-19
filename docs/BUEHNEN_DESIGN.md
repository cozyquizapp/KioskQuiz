# Buehnen-Design: die Regeln, die am 2026-08-18 entstanden sind

> Stand nach der Sitzung, in der Wolf sagte: „jetzt gefaellt es mir richtig gut".
> Entwuerfe liegen als WebP in `design-assets/buehnen-design/`.
> Vorgeschichte, Referenzen und Bausteine: `docs/MOTION_REFERENZEN.md`.

Das hier sind **Regeln, keine Bilder**. Wer eine neue Ansicht baut, prueft sie
gegen diese Liste, nicht gegen einen Screenshot.

---

## 1. Die Schrift fuehrt

Das war der Ausschlag. Wolfs Favoriten aus zehn Richtungen waren zweimal
dasselbe Prinzip: **Schrift ist das Design, es gibt kein Dekor.** Einmal leise
(Swiss) und einmal laut (Plakat).

**Drittel-Regel:** oberes Drittel gehoert der Frage, unteres Drittel der
Mechanik, die Mitte bleibt Luft.

Der erste Entwurf fuer „10 von 10" und „Schaetzchen" ist genau daran
gescheitert: die Mechanik (Setztisch, Zahlenachse) hatte die Bildmitte, die
Frage stand als graue Bildunterschrift bei 42px darueber. Wolf: „bei Mucho
passt das neue Design deutlich besser." Richtig, und die Ursache war die
Rangfolge, nicht die Farbe. Frage bei 88 bis 104px, dann stimmt es.

**Ausnahme, die die Mechanik erzwingt:** CHEESE („Schau mal"). Dort IST das Bild
der Inhalt, es bekommt die Flaeche, die Frage rueckt an den Rand.

---

## 2. Kategorien sind Mechaniken, nicht Themen

Das bestimmt das Layout, nicht der Geschmack.

| Kategorie | Mechanik | Bild, das daraus folgt |
|---|---|---|
| MUCHO | 4 Optionen | vier Zeilen oder Spalten, Schrift gross |
| ZEHN_VON_ZEHN | 3 Optionen + Einsaetze | Setztisch: drei Felder, Marken der Teams darunter |
| SCHAETZCHEN | Zahl mit Einheit | Zahlenachse, alle Schaetzungen darauf, wahre Zahl als Linie |
| BUNTE_TUETE | 9 Unterspiele | RAHMEN statt Layout, s. Abschnitt 5 |
| CHEESE | Bild | Bild fuellt, Text tritt zurueck |

---

## 3. Rotation ist erlaubt, mit genau einer Grenze

MUCHO bekommt **fuenf rotierende Layouts** (`mucho-rotation-1..5.webp`), weil es
die Kategorie ist, die am haeufigsten laeuft, und Abwechslung dort am meisten
bringt.

Der uebliche Einwand gegen wandernde Antwortflaechen greift hier NICHT, und der
Grund ist wichtig: **getippt wird auf dem Handy, nicht an der Wand.** Die Wand
ist Anzeige, keine Bedienflaeche. Deshalb darf dort viel wandern.

**Die eine Grenze:** A, B, C, D immer in derselben Lesereihenfolge, damit der
Blick von der Wand zum Daumen stimmt.

---

## 4. Form der Team-Marken: eckig

Wolf 2026-08-18: „ich wuerde auf jeden Fall eckige nehmen und je nach Kategorie
spezifische." Formprobe: `formprobe-achse.webp`, `formprobe-setztisch.webp`.

* **Kachel (Radius ~5px) ist die Grundform.** Sie liegt buendig, passt zum
  Raster der Schrift und packt ohne Luecken. Der Kreis faellt weg, er war die
  weiche App-Form und einer der Gruende, warum das alte Set nach Handyspiel aussah.
* **Wimpel mit Spitze NUR dort, wo die Marke auf einen Wert zeigt**, also auf der
  Schaetzchen-Achse. Ein Kreis oder Quadrat sitzt ueber einem Wert, aber es
  zeigt auf nichts Genaues. Das ist ein funktionales Argument, kein
  geschmackliches.
* **Gestapelt wie Jetons**, wenn viele Teams auf dasselbe Feld fallen.
* Die Form folgt der Aufgabe, nicht dem Ort.

**Folge fuer das Avatarset:** ein Motiv, das fuer einen Kreis gezeichnet ist,
wirkt eckig beschnitten anders. Das gehoert in den Avatar-Auftrag
(`docs/AVATAR_BRIEF.md`), sobald die Form endgueltig steht.

---

## 5. Bunte Tuete braucht einen Rahmen, kein Layout

Neun Unterspiele, und laut Wolf sind **nicht alle aktiv** (welche, ist offen).
Deshalb kein Layout je Unterspiel, sondern ein Rahmen: Kategoriezeile, daneben
eine Marke mit dem Namen des Unterspiels, darunter Frage oben und Mechanik
unten. Jedes Unterspiel bekommt dieselbe Buehne, und man sieht trotzdem sofort,
welches gerade laeuft.

Gebaut als Beleg: `buntetuete-top5.webp` (fuenf Spalten, gefundene Plaetze
farbig, offene dunkel mit Fragezeichen) und `buntetuete-fixit.webp`.

---

## 6. Farbwelten je Kategorie

Die heutigen Werte sind die Tailwind-Standardfarben und wirken in einem
gehobenen System beliebig, weil sie in tausend Produkten stecken. Vorschlag zum
Nachziehen, jeweils mit eigenem Grund statt Standard-Navy:

| Kategorie | heute | Vorschlag | Grund (radial, oben aufgehellt) |
|---|---|---|---|
| MUCHO | `#3B82F6` | `#4C8DFF` | `#101A33` → `#0A1122` → `#05080F` |
| ZEHN_VON_ZEHN | `#22C55E` | `#3ED67F` | `#0B2418` → `#071609` → `#030A05` |
| SCHAETZCHEN | `#F59E0B` | `#FFB03A` | `#2A1B06` → `#1A1004` → `#0B0702` |
| BUNTE_TUETE | `#EF4444` | `#F2543D` | `#2B0D0A` → `#1A0705` → `#0A0302` |
| CHEESE | `#8B5CF6` | `#9B6BFF` | `#1A1030` → `#100A1E` → `#06040C` |

---

## 7. Zwei Pruefungen vor dem Einbau

`node scripts/beamer-tauglichkeit.mjs <bild.png> <x,y,w,h des Antwortbereichs>`

* **Lichtabgabe** unter 12 Prozent. Ueber 22 Prozent blendet es in einem dunklen
  Raum koerperlich, unabhaengig von der Lesbarkeit.
* **Antworten aus 10m** ab 4.5:1. Gemessen wird der ANTWORTBEREICH, nicht die
  Frage: die Frage ist ueberall gross, leise werden die Entwuerfe bei den
  Antworten.

**Regel, die daraus faellt:** grosse helle Flaechen sind erlaubt, sie duerfen nur
nicht WEISS sein. Ein weisses Antwort-Band lag bei 31.6 Prozent, dasselbe Band in
der Kategoriefarbe bei 11.9 Prozent, bei praktisch gleicher Lesbarkeit.

Alle Entwuerfe in diesem Ordner liegen zwischen 1.3 und 5.5 Prozent Licht und
zwischen 4.9 und 18.4 zu 1 auf den Antworten.

---

## 8. Offen

* **Welche Bunte-Tuete-Unterspiele sind aktiv?** Erst dann lohnt sich Bauen.
* **Schrift.** Bisher Platzhalter (Archivo, Anton). Groesster Einzelhebel.
* **Schaetzchen-Achse:** Grenzen muessen sich an den abgegebenen Schaetzungen
  orientieren statt fix 0 bis 1000 zu sein, sonst klebt bei Millionenfragen alles
  am linken Rand. Bei Jahreszahlen (`isYearAnswer`) eigener Bereich.
* **Kollisionsregel Achse:** bei weniger als etwa vier Prozent Abstand wechselt
  die Marke die Reihe, sonst ueberdecken sich acht Marken.
* **Schau mal:** bei hellem Bild reicht der Verlauf unten womoeglich nicht.
  Dann dunkler Balken statt Verlauf, an der gemessenen Bildhelligkeit
  festgemacht statt pro Frage eingestellt.
* **Markenarchitektur** (Abloesung von CozyWolf als Look) siehe
  `docs/MOTION_REFERENZEN.md`. Betrifft besonders Pink `#EC4899`, das in
  `CREATIVE_DIRECTION.md` als nicht verhandelbar steht.
