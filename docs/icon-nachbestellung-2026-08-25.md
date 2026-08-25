# Nachricht an ChatGPT: Nachlieferung und fuenf neue Motive

Stand 2026-08-25. Zum Kopieren, ab der Trennlinie.

Anlass: der HD-Avatarsatz ist eingebaut, fuenf Motive daraus haben eine
zerfranste Kante (Ursache: aus einer Reihe geschnitten). Dazu kommen fuenf
Zeichen aus dem Icon-Set, die Wolf inhaltlich nicht tragen.

---

## Auftrag: Nachlieferung und fuenf neue Motive fuer CozyQuiz

Es geht um zwei bestehende Bildsaetze derselben Familie: den CozyQuiz
Team-Avatar-Satz und das CozyQuiz Icon-Set. Beide zeigen weiche 3D-Objekte
in warmen Farben mit einem sanften Eigenschatten, freigestellt, ohne Rahmen
und ohne Kachel. Alle neuen Motive muessen sich ohne Bruch dazwischen stellen
lassen.

### Verbindliche Technik, gilt fuer jede einzelne Datei

* 1024 x 1024 px, RGBA, transparenter Hintergrund, PNG.
* **Jedes Motiv einzeln generieren.** Nicht als Reihe oder Kontaktblatt
  anlegen und anschliessend zuschneiden. Genau das ist beim letzten Satz
  passiert, und die Hintergrund-Entfernung hat dabei den Schatten des
  Nachbarn mitgenommen und sich ins Motiv gefressen. Die Ausrisse liegen bei
  allen betroffenen Dateien auf derselben Seite, naemlich rechts.
* Keine automatische Hintergrundentfernung, kein Chroma-Keying. Der
  Alpha-Kanal entsteht bei der Erzeugung, nicht nachtraeglich.
* Kein Rahmen, keine Kontur, kein Halo, kein Glow, kein zusaetzlicher
  Schatten. Der weiche Eigenschatten des Objekts gehoert zum Motiv und
  bleibt.
* Keine Kachel, kein Kreis, kein Hintergrundelement. Die Kachel gehoert im
  Produkt dem Team und wird darunter gelegt.
* Motiv zentriert, laengste Kante rund 85 Prozent der Leinwand, ringsum
  Luft. Nichts darf die Leinwandkante beruehren.
* Kein JPG und kein verlustbehaftetes Zwischenformat, kein mehrfaches
  Skalieren und Neuspeichern.
* Die Motive stehen spaeter auf 2,8 m Bildbreite und werden aus 10 m
  gelesen. Silhouette und Grundfarbe muessen die Bedeutung allein tragen,
  ohne Beschriftung und ohne feine Binnenzeichnung.

### Farbwelt

Grund der Buehne ist ein dunkles Violett (#1A1526 nach #0B0912). Bei
Kategorie-Folien liegt stattdessen eine gesaettigte Vollflaeche darunter.
Jedes Motiv muss auf beidem stehen.

* Marke: #EC4899, hell #F472B6, zart #FBCFE8, tief #A21247
* Creme: #F6EFE6
* Kategorie-Farben: Schaetzchen #F59E0B, MUCHO #3B82F6,
  Bunte Tuete #EF4444, Zehn von Zehn #22C55E, Cheese #8B5CF6

Regel im Set: **ein Motiv, eine dominante Farbe.** Jedes Kategorie-Zeichen
traegt seine Kategorie-Farbe als Hauptfarbe, Creme ist der Partner. Voll
durchbuchstabierte Regenbogen gibt es im Set nicht.

---

## Teil A: fuenf Dateien neu, weil die Kante ausgerissen ist

Diese fuenf sind inhaltlich richtig, Motiv, Farbe und Beleuchtung sollen
bleiben. Sie brauchen nur eine saubere Erzeugung, einzeln, mit intaktem
Alpha an der rechten Kante.

| Datei | Schaden |
|---|---|
| `book.png` | rechte Kante des Buchblocks ueber die ganze Hoehe zerfressen |
| `wizard-hat.png` | Spitze und rechte Krempe ausgerissen |
| `camera.png` | rechte Gehaeusekante und Unterkante zerfressen |
| `alarm-clock.png` | rechte Glocke ausgerissen |
| `cassette.png` | rechte Kante und Unterkante ausgerissen |

Pruefbar so: transparente Pixel innerhalb der Motiv-Huelle, aufgeteilt in
zusammenhaengende Inseln. Echte Loecher wie das Schluesselauge oder das
Donutloch sind wenige und gross. Ein Ausriss sind viele winzige Inseln in
einem schmalen Band. Sauber sind null bis drei winzige Inseln. Diese fuenf
liegen bei 11, 18, 20, 59 und 75.

---

## Teil B: fuenf neue Motive

### 1. Regeln (ersetzt `fx-book`)

Steht auf der Auftaktfolie „Jetzt kommen die Regeln" und auf der
Fortschrittsleiste des ganzen Regelkapitels. Es ist das Zeichen fuer die
Regeln des Abends.

Das jetzige Bild ist ein geschlossenes Buch, cremefarbener Deckel, blauer
Ruecken, blauer runder Knopf. Zwei Probleme: es liest sich als Notizbuch
oder Tagebuch, nicht als Regelwerk. Und es benutzt dieselben zwei Farben
und fast dieselbe stehende, abgerundete Silhouette wie das
MUCHO-Kategorie-Zeichen, ein cremefarbenes Klemmbrett mit blauem Rahmen.
Auf Entfernung sind die beiden kaum zu unterscheiden.

Gewuenscht: ein **aufgeschlagenes Buch**, leicht schraeg von oben, beide
Seiten sichtbar, ein paar angedeutete Zeilen als weiche Balken, eine
Seite leicht angehoben. Hauptfarbe Creme #F6EFE6 fuer die Seiten, Einband
in Marken-Pink #EC4899 oder tief #A21247. Ausdruecklich **nicht blau**, und
kein Klemmbrett, keine Liste, keine Tafel: Klemmbrett ist MUCHO, und ein
Listenbrett gibt es im Set bereits als `fx-list`.

Falls eine zweite Fassung moeglich ist: eine aufgerollte Schriftrolle mit
Siegel, ebenfalls Creme mit pinkem Siegel. Beide Fassungen liefern, wir
waehlen am fertigen Bild.

### 2. CozyGames-Rad (ersetzt `fx-wheel`)

Steht als Zeichen fuer die CozyGames auf der Regelfolie, auf der
CozyGame-Auftaktfolie und im Moment der Auslosung. Dort **rotiert das Bild
im Code**.

Das jetzige Bild ist ein Gluecksrad mit schwarzem Ring, schwarzem Fuss und
schwarzem Standfuss darunter, sechs Segmente in Violett, Gruen, Gelb, Rot,
Orange, plus ein cremefarbener Zeiger oben.

Aenderungen:

* **Ohne Staender.** Kein Fuss, keine Bodenplatte, keine Saeule. Nur die
  Scheibe. Grund ist nicht nur der Geschmack: das Bild dreht sich im
  Produkt, und ein mitrotierender Staender ist sichtbar falsch.
* **Die Radachse liegt exakt in der Mitte der Leinwand** (512, 512), und
  die Scheibe ist kreisrund und nicht perspektivisch gekippt. Sonst eiert
  das Rad beim Drehen.
* **Der Zeiger bitte als zweite Datei** `fx-wheel-pointer.png`, gleiche
  Leinwand, gleiche Position wie im Gesamtbild, Rest transparent. Er darf
  nicht mitdrehen, deshalb legen wir ihn im Code darueber. Wenn nur eine
  Datei moeglich ist, dann die Scheibe ohne Zeiger.
* **Farben in die CozyQuiz-Welt ziehen.** Der schwarze Ring ist das
  schwerste Element im Bild und schluckt auf dem dunklen Grund die Farbe.
  Stattdessen ein Ring in Creme #F6EFE6 oder warmem Dunkelbraun. Sechs
  Segmente, abwechselnd aus der Palette: #EC4899, #F59E0B, #22C55E,
  #3B82F6, #8B5CF6, #F6EFE6. Nabe in Creme.

### 3. Fair Play (neues Motiv, Slug `fx-fairplay`)

Steht auf der Regelfolie „Fair Play". Die Zeile darunter lautet: „Kein
Googeln, Handy nur fuers Antworten."

Bisher steht dort das Zeichen fuer Buendnis, zwei ineinander gehaengte
Ringe in Blau und Gelb. Das ist ein anderes Wort. Buendnis wird an anderer
Stelle gebraucht und soll dort bleiben.

Gewuenscht: eine **Schiedsrichterpfeife**, leicht schraeg, mit Band oder
Schlaufe. Klare, sofort erkennbare Silhouette, im Set noch nicht vergeben,
und sie sagt Regel und Fairness ohne Text. Hauptfarbe Creme #F6EFE6 mit
Band in Marken-Pink #EC4899, oder umgekehrt.

Zweite Fassung falls moeglich: ein **Handy, mit dem Bildschirm nach unten
abgelegt**, weil das die Zeile woertlich zeigt. Beide liefern.

### 4. Bunte Tuete (ersetzt `cat-bunte-tuete`)

Eines der fuenf Kategorie-Zeichen. Steht fuer die Kategorie, in der
verschiedene kleine Spiele gemischt vorkommen. Kategorie-Farbe ist Rot
#EF4444.

Das jetzige Bild ist eine Partytroete, rot mit cremefarbenen Punkten, aus
der Luftschlangen fliegen. Das sagt Feier, nicht Mischung, und es kollidiert
mit den Jubel-Zeichen des Sets (Konfetti, Party-Reaktion).

Gewuenscht: eine **Wundertuete**, also eine papierne Tuete mit gedrehtem
oder gefaltetem Rand, aus deren Oeffnung ein paar verschiedene kleine
Gegenstaende schauen. Nicht Luftschlangen, sondern erkennbar unterschiedliche
Dinge, damit das Bild „gemischt" sagt. Tuete in Rot #EF4444, das Herausschauende
in Creme und zwei bis drei weiteren Palettenfarben. Rot bleibt die
dominante Flaeche, weil die Kategorie-Farbe im Produkt daneben steht.

### 5. Top 5 (ersetzt `sub-top5`)

Zeichen fuer das Spiel „Top 5": es gibt eine Rangliste mit fuenf Plaetzen,
die Teams sollen sie erraten. Das Spiel gehoert zur Kategorie Bunte Tuete,
Farbe Rot #EF4444.

Das jetzige Bild ist ein Treppendiagramm aus fuenf Balken in Blau, Gruen,
Gelb, Orange, Rot. Zwei Probleme: es liest sich als Statistik oder
Wachstum, nicht als Rangliste. Und es ist das einzige Motiv im ganzen Set
mit einem vollen Regenbogen, damit faellt es aus der Familie.

Gewuenscht: eine **Ranglisten-Tafel**, hochkant, mit **genau fuenf
untereinander liegenden Zeilen** als weiche Balken. Die oberste Zeile
deutlich hervorgehoben, groesser oder in Gold #F59E0B, mit einem kleinen
Stern oder einer Krone daneben. Die vier darunter ruhig in Creme. Tafel
oder Rahmen in Rot #EF4444, damit die Kategorie-Farbe traegt. Wichtig: die
fuenf Zeilen muessen auch aus zehn Metern als **fuenf** zaehlbar sein, also
klare Abstaende und gleiche Hoehen.

Zweite Fassung falls moeglich: fuenf gestapelte Plaketten oder Medaillen,
die oberste in Gold. Beide liefern.

---

### Zusammenfassung der Lieferung

10 Dateien, jede einzeln erzeugt:

```
book.png            wizard-hat.png       camera.png
alarm-clock.png     cassette.png
fx-rules.png        fx-wheel.png         fx-wheel-pointer.png
fx-fairplay.png     cat-bunte-tuete.png  sub-top5.png
```

plus die jeweils zweite Fassung, wo oben eine genannt ist.
