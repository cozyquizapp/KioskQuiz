# Auftrag: Team-Marken "Die Runde" (CozyQuiz)

> Stand 2026-08-18. Entstanden aus Wolfs Befund: „ich haette gerne Team-Avatare,
> erwachsen, aber mit so viel Charakter wie bei Jackbox. Der Jackbox-Versuch ging
> nach hinten los."

---

## 1. Warum die bisherigen Saetze nicht traegt, was sie tragen sollen

Der Grund ist nicht die Zeichnung, sondern die **Zuordnung**.

Bei Jackbox spielt ein Mensch an einem Handy. Er waehlt eine Figur, die Figur
vertritt ihn, und daraus entsteht der ganze Charakter: „das bin ich". Die Figuren
duerfen deshalb schraeg, haesslich und uebertrieben sein.

Bei CozyQuiz sitzen drei bis fuenf Leute an **einem** Geraet. Keiner von ihnen
sagt „das bin ich", also sagt auch keiner „das sind wir". Ein Einzelwesen kann
eine Gruppe nicht vertreten. Deshalb bleiben Tierkoepfe, Kachelgesichter und
Woelfe seltsam leer, egal wie gut sie gezeichnet sind.

Wolfs eigene Begruendung, warum auch Cozy Pack (8 Woelfe) es nicht loest:
* Der Wolf gehoert der **Marke**. Wenn jedes Team ein Wolf ist, verwaessert das.
* Acht Woelfe sind acht Mal dasselbe Tier, die Teams sind schwer zu trennen.
* Die Ausfuehrung ueberzeugt ihn optisch nicht.

## 2. Die Idee

**Eine Marke zeigt keine Figur, sondern eine Runde.** Zwei bis vier Gestalten
zusammen, als eine Gruppe. Was die acht Marken unterscheidet, ist nicht das
Wesen, sondern das **Verhalten der Gruppe**: wie sie zueinander steht.

Das ist erwachsen, weil Haltung erwachsener wirkt als Niedlichkeit. Es hat
Charakter, weil jeder am Tisch seine eigene Runde wiedererkennt. Und es loest
das Zuordnungsproblem, statt es zu umgehen: eine Gruppe wird von einer Gruppe
vertreten.

Der CozyWolf bleibt davon unberuehrt. Er ist der **Gastgeber**, kein Team.

## 3. Die acht Runden

Eine je Farb-Slot. Die Slot-Farben liegen fest (`shared/quarterQuizTypes.ts`,
`QQ_AVATARS[].color`) und duerfen nicht geaendert werden.

| # | Farbe | Slug | Name DE | Name EN | Die Runde ist ... |
|---|---|---|---|---|---|
| 1 | Orange `#F97316` | `zugewandt` | Die Zugewandten | The Whisperers | zwei Koepfe dicht zusammen, ueber den Tisch gebeugt, am Tuscheln |
| 2 | Gruen `#22C55E` | `anstoss` | Die Anstosser | The Toast | drei heben etwas, Arme nach oben, Moment des Jubels |
| 3 | Teal `#14B8A6` | `zoegernd` | Die Zoegernden | The Hesitant | einer lehnt nach vorn, zwei halten sich zurueck |
| 4 | Violett `#A855F7` | `denker` | Die Denker | The Ponderers | zwei gesenkte Koepfe, eine Hand am Kinn, Stille |
| 5 | Gelb `#FACC15` | `laut` | Die Lauten | The Loud Ones | einer steht auf, Arme weit, die anderen ziehen ihn am Aermel |
| 6 | Blau `#3B82F6` | `uneinig` | Die Uneinigen | The Divided | zwei drehen sich voneinander weg, einer steht dazwischen |
| 7 | Pink `#EC4899` | `geschlossen` | Die Geschlossenen | The Wall | vier Schulter an Schulter, eine Front, kein Spalt |
| 8 | Rot `#EF4444` | `spaet` | Die Spaeten | The Latecomers | drei sitzen, einer kommt gerade seitlich dazu |

Die Namen sind Teil der Marke und erscheinen im Set-Picker, so wie bei Cozy Pack
die Wolfsnamen. Der Team-Name bleibt davon unberuehrt, den waehlen die Gaeste
selbst.

## 4. Die eine Regel, die den Satz zusammenhaelt

**Jede Runde muss als EIN zusammenhaengender Umriss lesbar sein.**

Die Gestalten ueberlappen sich, Schultern beruehren sich, die Gruppe bildet eine
Masse mit einer klaren Aussenkante. Drei einzeln stehende Figuren mit Luft
dazwischen sehen aus wie drei Figuren, nicht wie eine Runde, und zerfallen auf
der Buehne in Flecken.

Das ist die Probe: Umriss ausfuellen, alles Innere schwarz. Bleibt eine Form, die
man benennen kann? Dann stimmt es. Sieht es aus wie verstreute Kleckse, nicht.

## 5. Stil

* **Traeger:** Farb-Disc wie bei Cozy 3D, damit die vorhandene Mechanik greift
  (`kind: 'image'`, Slot-Farbe kommt aus dem Slot).
* **Gestalten:** creme (`#F5ECD8`) auf der Slot-Farbe. Ein Ton, keine Verlaeufe
  im Koerper. Der Kontrast traegt die Marke, nicht die Schattierung.
* **Anschnitt:** Brust aufwaerts. Keine Beine, keine Tische, keine Requisiten
  ausser dem, was die Haltung braucht (Glas bei `anstoss`, sonst nichts).
* **Gesichter:** minimal. Augen als Punkte, Mund als Strich, mehr nicht. Sie
  wirken auf dem Handy aus 30cm, auf der Buehne traegt die Haltung. Keine Nasen,
  keine Zaehne, keine Augenbrauen-Akrobatik.
* **Wesen:** menschlich in der Silhouette, aber nicht realistisch. Runde
  Schultern, weiche Kanten. Kein Anzug, keine Frisurenmode, nichts, was
  Geschlecht, Alter oder Milieu festlegt. Die Gaeste sollen sich einordnen
  koennen, nicht abgebildet werden.
* **Nicht:** keine Heraldik, kein Schild, keine Rahmen (das ist die Sprache der
  CozyArena und muss getrennt bleiben). Kein 3D-Rendering. Keine Umrisslinie in
  einer dritten Farbe.

## 6. Lieferung

* `frontend/public/avatars/runde/<slug>-base.png`
* optional zweiter Frame `<slug>-peak.png` fuer die Zwei-Bild-Bewegung, die
  Blockz und Quirks schon nutzen (dort ein winziger Ruck, kein neuer Zustand)
* 512x512, transparent, Motiv fuellt ~80 Prozent der Flaeche, zentriert
* danach `node optimize-avatars.js` bzw. der Weg, den Cozy 3D genommen hat

## 7. Pruefung vor dem Einbau

1. `node scripts/avatar-contact-sheet.mjs` mit dem neuen Satz erweitern und die
   acht nebeneinander ansehen. Zerfaellt eine Runde in Einzelteile, korrigieren.
2. Die Umriss-Probe aus Abschnitt 4.
3. Am echten Beamer, nicht im Nachbau.

## 8. Was noch offen ist

* Ob die Runden **reagieren** sollen: die Gruppe beugt sich vor, wenn das Team
  abgegeben hat, faellt zusammen bei falsch, reisst die Arme hoch bei richtig.
  Das waere der Punkt, an dem aus Marken Charaktere werden, und es ist mit dem
  vorhandenen Zwei-Frame-Modell fast geschenkt. Braucht Wolfs Entscheidung.
* Ob es acht bleiben oder mehr werden. Acht deckt die Farb-Slots, mehr braucht
  eine Aussage darueber, was bei mehr als acht Teams passiert.
