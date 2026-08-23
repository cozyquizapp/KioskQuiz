# Zeichen-Bestellung für die Bühne (Übergabe 2a)

Zum Weitergeben. Stand 23.08.2026, zweite Fassung.

> **Warum eine zweite Fassung:** die erste war zu vage. Sie hat beschrieben,
> WAS auf dem Bild sein soll, aber nicht, WIE es aussehen muss. Dabei ist das
> Wie der ganze Punkt: die Zeichen müssen neben 84 bestehenden stehen können,
> ohne dass jemand merkt, dass sie später dazugekommen sind.

---

## Das Wichtigste zuerst

**Vor dem ersten Prompt zwei bis drei der bestehenden Dateien in den Chat
hochladen** und dazuschreiben: „Das ist der Stil. Alles Neue muss daneben
stehen können, ohne aufzufallen."

Gute Referenzen aus `frontend/public/icons/`:
`fx-trophy.png`, `fx-wheel.png`, `fx-lock.png`, `cat-cheese.png`

Als Uebersicht liegt ein Blatt mit acht Beispielen bei:
`docs/bilder/stil-referenz.png`. Das reicht als Anhang.

Ohne Referenzbild rät das Modell, und dann kommt genau das raus, was Wolf
gesehen hat. Mit Referenzbild trifft es.

---

## Der Stil, in Worten

Das bestehende Set ist **Knete, nicht Plastik**:

* **Material:** matte Modelliermasse. Weiche, samtige Oberfläche. **Keine
  Glanzlichter, keine spiegelnden Flächen, kein Metall-Look.** Das ist der
  Hauptunterschied zu den alten Spiel-Zeichen, die glänzend und fotorealistisch
  sind.
* **Form:** dick, rund, gedrungen. Kanten sind abgerundet, nichts ist dünn oder
  spitz. Ein Stift ist ein dicker Stift, kein Strich.
* **Farbe:** gedeckt und warm. Senfgelb, Staubrot, Salbeigrün, Petrolblau,
  Lavendel, Creme. **Kein Neon, kein Pink, kein Magenta, keine kräftigen
  Sättigungen.**
* **Farbanzahl:** zwei bis vier Farbflächen pro Objekt, mehr nicht.
* **Licht:** ein weiches Licht von oben links, sanfte Schattierung in den
  Vertiefungen. Kein harter Schlagschatten, kein Glühen, kein Leuchten.
* **Kontur:** keine. Keine Outline, kein Strich um das Objekt.
* **Kamera:** leicht von schräg oben, Dreiviertel-Ansicht, Objekt aufrecht.
* **Bildaufbau:** ein einzelner Gegenstand, zentriert, füllt etwa 80 Prozent
  der Fläche, ringsum etwas Luft.

---

## Fester Prompt-Block

Diesen Block **wörtlich vor jede Bestellung setzen**, nur den letzten Satz
austauschen. Immer derselbe Wortlaut, sonst driftet der Stil von Bild zu Bild.

```
A single 3D icon in soft matte clay style, like colored plasticine.
Chunky rounded shapes, thick forms, no thin or sharp parts.
Muted warm palette: mustard yellow, dusty red, sage green, teal blue,
lavender, cream. No neon, no pink, no magenta, no saturated colors.
Matte surface only — no gloss, no specular highlights, no metallic sheen,
no glow. Soft light from the top left, gentle shading, no hard drop shadow.
No outline. Three-quarter view, slightly from above, object upright,
centered, filling about 80 percent of the frame.
Plain solid pure white background (#FFFFFF), nothing else in the image.
No text, no letters, no numbers, no hands, no people, no table, no room,
no scene, no props beyond what is named.

Subject: <HIER DAS MOTIV EINSETZEN>
```

**Hintergrund bewusst weiß, nicht transparent.** Transparenz kommt aus
Bildmodellen unzuverlässig raus. Reines Weiß lässt sich sauber freistellen,
und das mache ich hier mit einem Skript in einem Rutsch für alle Dateien.

**Eine Ausnahme, an der die erste Lieferung gescheitert ist:** ist das Motiv
selbst **weiß oder sehr hell** (Wattebausch, Tischtennisball, Marshmallow),
dann NICHT auf Weiß rendern. Dort lässt sich nichts trennen, weil die weiche
Kante stufenlos in den Grund übergeht. Für diese Motive im Prompt-Block den
Hintergrund-Satz austauschen gegen:
`Plain solid mid-grey background (#808080), nothing else in the image.`

---

## Die achtzehn Spiel-Zeichen

Für jedes Spiel steht unten die Zeile, die hinter `Subject:` gehört. Sie ist
absichtlich knapp: **ein Gegenstand, höchstens ein zweiter als Beigabe.**

Der Grund dafür ist gemessen: auf der Drehscheibe werden diese Zeichen mit
**90 bis 110 Pixeln** dargestellt. Bei der Größe zerfällt eine gebaute Szene.
Das Zeichen muss die Frage „welches Spiel ist das" beantworten, nicht das
Spiel abbilden.

| Datei | Spiel | `Subject:` |
|---|---|---|
| `cg-watt-puste.png` | Wattebausch-Pusten | one cotton ball and one drinking straw lying next to it |
| `cg-mm-strohhalm.png` | M&M-Strohhalm-Transport | one drinking straw held upright with a single round candy stuck to its lower tip |
| `cg-ballon-puste.png` | Luftballon hochhalten | one balloon floating, with a short curled string |
| `cg-muenzturm.png` | Münzturm einhändig | a small stack of four coins |
| `cg-muenz-kante.png` | Münz-Schnippen zur Kante | one coin standing on the edge of a small flat slab |
| `cg-karten-haus.png` | Karten-Haus | two playing cards leaning against each other like a roof |
| `cg-sport-stacking.png` | Becher-Pyramide | three stacked plastic cups forming a small pyramid |
| `cg-bierdeckel-muenzen.png` | Bierdeckel-Rettungsringe | one round beer coaster with a single coin resting on it |
| `cg-staebchen-eimer.png` | Stäbchen-Eimer | one pair of chopsticks holding a small ball between the tips |
| `cg-ringwurf.png` | Ringwurf auf Flaschenhals | one ring hanging around the neck of a bottle |
| `cg-waescheklammer-glas.png` | Wäscheklammer in Glas | one clothespin above the rim of a drinking glass |
| `cg-gummi-pyramide.png` | Gummi-Pyramide | one plastic cup with a single rubber band around it |
| `cg-tt-ball-sammeln.png` | TT-Ball-Sammeln | one table tennis ball |
| `cg-mengen-schaetzen.png` | Mengen schätzen | one glass jar filled with small round beads |
| `cg-getraenk-halbieren.png` | Getränk halbieren | one drinking glass half filled with liquid |
| `cg-schnur-halbieren.png` | Genau in der Mitte teilen | one straight piece of string with a pair of scissors at its middle |
| `cg-stift-fang.png` | Stift-Fang-Reaktion | one thick pencil falling, tilted diagonally |
| `cg-marshmallow-fang.png` | Marshmallow-Fang | one marshmallow above an open cup |

> **Stand 23.08.2026: alle achtzehn liegen im Ordner und sind eingebaut.**
> Dreizehn kamen aus der ersten Lieferung, fünf aus der Nachbestellung
> (`ASSET_NACHBESTELLUNG_2a.md`). Kein Spiel läuft mehr auf ein Systemzeichen.

---

## Die zwei Logos

Die stehen groß und allein auf ihrer Folie, bis 240 px. Bis sie da sind, steht
dort **kein** Zeichen, weil ein altes Bild schlechter ist als keins.

| Datei | Wofür | `Subject:` | Stand |
|---|---|---|---|
| `final-tipp.png` | Wetten-Phase: jedes Team tippt, welches ANDERE Team die Final-Runde gewinnt. | one round gaming chip being placed flat onto a small square field | **fertig, eingebaut** |
| ~~`cozygames.png`~~ | | | **entfaellt, siehe unten** |

**`cozygames.png` wird nicht mehr gebraucht.** Die erste Bestellung hiess
woertlich „one dice and one cup standing side by side", und genau das kam
zurueck: ein Wuerfelbecher. Der sagt Brettspiel, nicht CozyGames - von den
achtzehn Spielen benutzt kein einziges einen Wuerfel, die Silhouette ist ein
beiger Klumpen ohne Wiedererkennung, und ein Becher steht ausserdem schon in
zwei Spiel-Zeichen. Der Fehler lag in der Bestellung, nicht im Bild.
Es braucht dafuer gar kein neues Zeichen: `fx-wheel.png` liegt seit jeher im
Set, im richtigen Stil, mit der klarsten Silhouette weit und breit, und war
nirgends benutzt. Es zeigt genau das, was auf der Folie als naechstes passiert.

**Lehre fuer die naechste Runde:** die Regel „ein Ding, keine Szene" gilt fuer
die Spiel-Zeichen auf dem Rad, die mit 90 bis 110 px laufen. Ein Logo laeuft
mit 200 bis 240 px und darf mehr Motiv tragen. Wichtiger als die Anzahl der
Gegenstaende ist bei einem Logo die **Silhouette**: sie muss sich von allem
anderen im Set unterscheiden und in einer Farbe erkennbar bleiben.

**Ausdrücklich nicht:** kein Auktionshammer (das heißt Versteigerung), kein
Rettungsring (das heißt Hilfe), kein Maskottchen, kein Tier. Beides stand dort
schon und war falsch.

---

## Elf Nachzügler, zweite Priorität

Gleicher Prompt-Block, gleiche Regeln.

| Datei | `Subject:` |
|---|---|
| `connect.png` | four puzzle pieces joined into a square |
| `anker.png` | one ship anchor |
| `rocket.png` | one small rocket standing upright |
| `group.png` | three simple rounded figures standing side by side |
| `fx-fire.png` | one flame |
| `fx-map.png` | one folded paper map |
| `fx-place.png` | one map pin standing upright |
| `fx-potato.png` | one potato |
| `fx-sparkles.png` | three four-pointed sparkles of different sizes |
| `fx-target.png` | one round target with a dart in the center |
| `fx-lightning.png` | one lightning bolt |

---

## Abnahme: vier Fragen pro Bild

1. **Auf 100 Pixel verkleinern.** Kann man noch benennen, was es ist? Wenn
   nein: zu viel drin, noch weiter vereinfachen.
2. **Neben `fx-trophy.png` legen.** Sieht es aus wie aus derselben Schachtel?
   Wenn es glänzt, kräftiger gefärbt oder feiner detailliert ist: nein.
3. **Ist der Hintergrund wirklich reines Weiß**, ohne Verlauf, ohne Schatten,
   der ins Weiß ausläuft? Ein Schatten auf dem Weiß ist in Ordnung, solange er
   unter dem Objekt bleibt.
4. **Steht Text im Bild?** Auch kleine Beschriftungen auf Bechern, Karten oder
   Münzen. Dann neu.

---

## Was ich brauche, wenn die Bilder kommen

Einfach die PNGs, so wie sie rauskommen, mit Weiß hinten. Größe egal.
Freistellen, auf 512 × 512 bringen, benennen und einbauen mache ich hier — das
Skript dafür steht (`scripts/freistellen.mjs`).

## Was NICHT gebraucht wird

* Keine Kacheln, keine Rahmen, keine Hintergründe. Baut die Anwendung.
* Keine Beschriftung im Bild. Der Name steht daneben im Text.
* Keine Varianten in mehreren Größen. Eine Datei pro Zeichen reicht.
