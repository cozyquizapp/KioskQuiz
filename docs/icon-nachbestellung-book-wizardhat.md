# Nachricht an ChatGPT: book.png und wizard-hat.png

Stand 2026-08-25. Zum Kopieren, ab der Trennlinie. Bild `KAPUTT-2.png` mitschicken.

Diagnose, die in der Nachricht steht: bei diesen beiden frisst der Schaden
Motiv-INNENKANTEN, nicht nur den Rand. Beim Buch die Bundfalz-Rille links und
die Kante des Buchblocks, beim Hut die Innenkurve der umgeschlagenen Spitze.
Das ist die Signatur einer farbbasierten Freistellung: beide Motive sind
dunkles Marineblau, und wo eine dunkle Rille farblich dem entfernten
Hintergrund aehnelt, frisst das Werkzeug sich hinein. Deshalb hat „einzeln
erzeugen" bei den anderen geholfen und hier nicht.

---

## Auftrag: zwei Motive aus dem CozyQuiz-Avatarsatz neu erzeugen

Es geht um `book.png` und `wizard-hat.png` aus dem CozyQuiz Team-Avatar-Set.
Die anderen 46 Motive des Satzes sind inzwischen einwandfrei, diese zwei nicht.
Motiv, Farbe, Beleuchtung und Bildausschnitt sollen exakt bleiben. Es geht
allein um den Alpha-Kanal.

### Was kaputt ist

**book.png** (dunkelblaues Buch, aufrecht stehend, cremefarbener Buchblock
rechts, rotes Lesebaendchen unten):
* die senkrechte Rille zwischen Buchruecken und Deckel, also der Bundfalz auf
  der linken Seite, ist ueber die ganze Hoehe durchloechert
* die Kante des Buchblocks rechts ist zerfressen
* die untere Kante und der Bereich um das Lesebaendchen ebenfalls
* gemessen: 12 489 Pixel innerhalb der Motivhuelle sind transparent, in 75
  einzelnen winzigen Inseln

**wizard-hat.png** (dunkelblauer Zaubererhut mit lila Band und goldener
Schnalle, umgeschlagene Spitze nach rechts):
* die Innenkurve der umgeschlagenen Spitze ist herausgefressen, die Spitze
  haengt dadurch fast frei
* die rechte Kante der Krempe ist ausgefranst
* gemessen: 10 233 Pixel in 11 Inseln

### Die Ursache, und warum sie hier eine andere ist

Bei den uebrigen Motiven lag der Schaden am rechten Rand, weil aus einer Reihe
geschnitten wurde. Hier liegt er auf INNENKANTEN des Motivs: Bundfalz,
Buchblockkante, Hutspitzen-Innenkurve. Das sind genau die Stellen, an denen das
Motiv dunkle Schattenrillen hat. Beide Motive sind dunkles Marineblau
(ungefaehr #2A3A5E). Eine farbbasierte Hintergrundentfernung haelt diese
dunklen Rillen faelschlich fuer Hintergrund und frisst sich hinein.

Es genuegt hier also NICHT, die Motive nur einzeln zu erzeugen. Entscheidend
ist, dass ueberhaupt keine nachtraegliche Freistellung stattfindet.

### Verbindliche Technik

* 1024 x 1024 px, RGBA, transparenter Hintergrund, PNG.
* **Der Alpha-Kanal muss bei der Erzeugung entstehen, nicht nachtraeglich.**
  Keine automatische Hintergrundentfernung, kein Chroma-Keying, kein
  „Zauberstab", keine Toleranz-Auswahl nach Farbe.
* Jedes Motiv einzeln erzeugen. Nicht als Reihe oder Kontaktblatt anlegen und
  anschliessend zuschneiden.
* Der weiche Eigenschatten unter dem Objekt gehoert zum Motiv und bleibt.
* Kein Rahmen, keine Kontur, kein Halo, kein Glow, kein zusaetzlicher Schatten.
* Keine Kachel, kein Kreis, kein Hintergrundelement.
* Motiv zentriert, laengste Kante rund 85 Prozent der Leinwand, ringsum Luft.
  Nichts darf die Leinwandkante beruehren.
* Kein JPG und kein verlustbehaftetes Zwischenformat, kein mehrfaches
  Skalieren und Neuspeichern.

### Wie ihr selbst pruefen koennt, ob es diesmal stimmt

Legt das fertige PNG auf eine **kraeftig farbige Flaeche**, zum Beispiel
Orangerot #E8471F, und schaut es bei doppelter Groesse an. Auf dunklem Grund
sieht man den Fehler NICHT, deshalb ist er bisher zweimal durchgerutscht.
Auf farbigem Grund leuchtet jede gefressene Stelle sofort auf.

Konkret muss gelten:
* der Bundfalz des Buches ist eine durchgehende dunkle Rille, keine Reihe von
  Loechern
* die Kante des Buchblocks ist eine saubere Linie
* die umgeschlagene Hutspitze haengt an einer geschlossenen Flaeche
* die Krempe hat eine glatte Aussenkante

Sauber ist ein Motiv, wenn innerhalb seiner Umrisse keine winzigen
transparenten Inseln liegen. Echte Loecher wie ein Schluesselauge oder ein
Donutloch sind erlaubt, die sind gross und glattrandig. Winzige verstreute
Loecher sind immer ein Fehler.

### Lieferung

Zwei Dateien: `book.png` und `wizard-hat.png`.
