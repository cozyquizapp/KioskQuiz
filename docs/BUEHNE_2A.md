# Die Bühne (Übergabe 2a)

Das hier ist die Entscheidungsgrundlage für alles, was auf dem Beamer landet.
Nicht Geschmack, sondern die Regeln, die wir am 22./23.08.2026 Ansicht für
Ansicht durchgegangen sind, mit den Messungen, aus denen sie entstanden sind.

Wer hier etwas ändert, ändert es für den ganzen Abend. Wer eine Ansicht baut,
liest zuerst diese Seite.

---

## Regel null

**Ist das für die BÜHNE gebaut?**

Die Bühne ist fix 1760 x 990 und wird aus bis zu acht Metern gelesen, von
Leuten mit einem Getränk in der Hand, die nicht suchen wollen. Jede
Entscheidung wird gegen diesen Satz geprüft, und er schlägt jede andere Regel
auf dieser Seite.

Praktische Folgen:

* Was auf einer Bildschirmseite mit 13px funktioniert, ist auf der Bühne nicht
  da. Der kleinste sinnvolle Grad liegt bei etwa `clamp(15px, 1.6cqw, 26px)`.
  Alles darunter ist Dekoration, die niemand liest.
* Der Beamer bekommt **nie** eine Scrollbar, und Inhalt darf nie aus dem Bild
  laufen. Beides wird gemessen, nicht vermutet (siehe „Messen statt schätzen").
* Bewegung ist Beiwerk. Ein Gast sieht eine leere Fläche die ganze Frage lang
  und einen Sprung eine Zehntelsekunde.

---

## Der Verdrahtungsfehler, der fünfmal passiert ist

`isThemed()` heisst **nicht** „Bühne". Es heisst „nicht Cozy", und darunter
fallen auch Studio Mono, Soft Pop und Neo-Brutalism. Die Bühne läuft im
Quirks-Theme, ist also `isThemed() === true` — und hat deshalb mehrfach genau
das bekommen, was für den ALTEN Cozy-Look gedacht war, oder genau das nicht
bekommen, was für sie gebaut war.

Die Bühne wird benannt, nicht umschrieben:

```ts
const istBuehne = getActiveThemeId() === QUIRKS_THEME_ID;
```

Gefunden an: Frage-Karte, Kategorie-Grund, seitliches Polster, Cheese-Karte,
Cheese-Timer. Wer eine „2a"-Änderung sucht, die es angeblich schon gibt: erst
prüfen, an welchem Zweig sie hängt.

---

## Die Statuszeile

Eine Zeile, oben links, auf allen fünfzehn Fragen an derselben Stelle.

* **Kategorie-Pille**: gefüllt in `var(--qq-stage-accent)`, Schrift `#12100E`,
  `clamp(16px, 1.7cqw, 30px)`, Laufweite 0.06em, Versalien, bricht nie um.
* **Fragezähler**: `FRAGE 01 / 15`, Versalien, Laufweite 0.26em,
  `clamp(15px, 1.6cqw, 28px)`, `var(--qq-text-muted)`.
* **Timer**: rechts, schlicht, dieselbe Zahl für jede Frage — auch für die
  Heisse Kartoffel, die vorher als einzige einen Ring um den Avatar hatte.

Die Zeile ist `clamp(120px, 20.6cqh, 204px)` hoch, und der Inhalt darunter
hält diese Höhe frei — **solange die Zeile da ist**. Bei der Auflösung ist sie
das nicht (die Pille hängt an `!revealed`, der Timer ist abgelaufen), dann
fällt die Reserve. Das ist keine Ausnahme, sondern die Bedingung der Regel:
Platz wird für etwas freigehalten, nicht auf Verdacht.

Bei Schau mal und Pin It liegt die Zeile auf einem Foto bzw. einer Karte. Dann
bekommt sie einen Grund: bei Schau mal zieht der ohnehin vorhandene Verlauf
oben dunkler (Vignette, kein Balken), bei Pin It sitzt sie auf einer Platte.

**Leseordnung, überall gleich:** Status oben, Inhalt in der Mitte, Teams unten.

---

## Farbe

Vier Farben, mehr nicht:

| Farbe | Bedeutung | Wo |
|---|---|---|
| Kategorie-Akzent | welche Kategorie läuft | Pille, Grund, gefüllte Wert-Pillen |
| Creme (`--qq-text`) | Text | alles Geschriebene, auch Teamnamen |
| Grün (`green400`) | richtig | Antwort, getroffene Zeile, Ziel-Pin |
| Rot | falsch / niemand | „Keiner hatte Recht", eliminiert |

**Der Grund trägt die Kategorie.** Pro Kategorie ein tiefer Ton derselben
Farbe (`QQ_CATEGORY_THEME[cat].deep`), Sättigung etwa halbiert, Helligkeit auf
rund 15%. Nicht auf jeder Phase, sondern auf denen, wo eine Kategorie läuft
(`QQ_KATEGORIE_GRUND_PHASEN`).

**Teamfarbe lebt auf der Kachel, nie in der Schrift.** Gemessen am Brett lagen
Teamnamen in Teamfarbe zwischen 2,6:1 und 9,2:1; in Creme sind es 14,1:1 im
schlechtesten Fall. Die Marke daneben ist 60 bis 290px gross und sagt
deutlicher, wer gemeint ist, als eine eingefärbte Zeile es je könnte.

**Kein Gold, keine Medaillen, keine Kronen.** Gold war eine fünfte Farbe für
„am schnellsten" und „Rundensieger", Medaillen eine sechste für Platz 1 bis 3.
Beides sagt nichts, was Reihenfolge, Größe und Text nicht schon sagen. Wo ein
Wert hervorgehoben werden muss, bekommt er die Form der Kategorie-Pille:
gefüllt im Akzent, dunkle Schrift, keine Kontur.

Ausnahme, die keine ist: Schätzchen **ist** gelb. Das Gold am Zahlenstrahl ist
die Kategoriefarbe, nicht die Fremdfarbe.

---

## Schein und Rahmen

**Ein Schein, der etwas bedeutet, bleibt. Ein Schein, der nur schmückt, geht.**

Welche Kategorie läuft, sagen Pille, Zeitleiste und Grund; ein vierter Träger
in Form von 80px Weichzeichnung sagt es nicht besser, sondern weicht auf
Projektionsdistanz die Kanten auf. Wer den schnellsten Chip schon durch Größe
und gefüllte Pille markiert, braucht keinen dritten Ring darum.

**Nie zwei Linien in derselben Farbe übereinander.** Das ist dreimal passiert
und sah jedes Mal nach Fehler aus:

* Heisse Kartoffel: Kachelrahmen plus SVG-Timerring, 1,4px Abstand.
* Schau mal: Zeitleiste (y 0-11) plus Bilderrahmen (y 14-17).
* Auflösung: 3px Rand plus 2px Ring als Schatten, zusammen ein unsauberer
  5px-Rand.

**Kacheln, keine Kreise.** Alle Marken des gelieferten Sets sind eckig. Ein
runder Rahmen um eine eckige Kachel schneidet sich mit ihr. Was einen Rahmen
bekommt, folgt `var(--qq-card-radius)`.

**Keine gestrichelten Rahmen.** Gestrichelt ist eine Bausprache für Entwürfe,
nicht für eine Leinwand.

---

## Marken und Zeichen

**Keine rohen Systemzeichen.** Ein Emoji im Text wird von der Zeichensatzdatei
des jeweiligen Rechners gemalt, sieht also auf jedem Gerät anders aus, und
`color:` daran ist wirkungslos. Es gibt ein geliefertes Set; es wird über
`QQEmojiIcon` / `QQIcon` benutzt.

Der letzte Fund dieser Art war der rote Ziel-Pin bei Pin It: kein Asset des
Projekts, sondern 📍 in 96px.

**Nicht-Team-Zeichen stehen nie in Kacheln.** Kategorie-Marken stehen frei —
sie tragen Farbe und Form schon selbst. Kacheln gehören den Teams.

**Der alte Wolf ist raus.** Der gezeichnete rosa Wolf (Kopf-Abzeichen,
Co-Moderator, Ambient) gehört zur alten Bildsprache. Der gelieferte 3D-Wolf
auf der Willkommen-Folie bleibt — der wurde für die Bühne gebaut.

---

## Text

* **Die Frage steht mittig.** Auf allen Frageviews gleich, ohne Ausnahme nach
  Kategorie. Auf Reveal-Tafeln, wo die Frage als Kopfzeile über einer
  linksbündigen Liste steht, bleibt sie linksbündig — dort ist sie nicht die
  Hauptzeile.
* **Die Frage steht nicht in einem Kasten.** Ausnahme mit Grund: bei Schau mal
  liegt der Text auf einem beliebigen Foto, und ein helles Motiv schluckt
  cremefarbene Schrift. Dort ein Lesefeld im tiefen Kategorie-Ton mit 88%
  Deckung, ohne Kontur — Bauchbinde, nicht Karte.
* **Umbruch**: `textWrap: 'balance'`, Breite in `ch`. Wortweise animierte
  Buchstaben brauchen `nowrap`-Container um jedes Wort, sonst hängt
  `overflowWrap` durch.
* Teamnamen laufen über `TeamNameLabel`, nie über eigenes Kürzen.

---

## Messen statt schätzen

Bevor ein Layoutwert gesetzt wird, wird die Sache gemessen. Das hat in diesem
Durchgang jedes Mal etwas gefunden, was Draufschauen nicht gefunden hat:

* Alpha-Bounding-Box, bevor eine Grafik platziert wird (der Willkommen-Wolf
  hatte ein 38px-Fenster zwischen „Schnittkante sichtbar" und „Hände
  abgeschnitten"; geraten hatte ich 13%, richtig waren 6,25%).
* Kontrast rechnen, nicht schätzen. `#15803d` auf `#241C3C` sind 3,2:1,
  `green400` 9,3:1. Das dunkle Grün war für eine weisse Karte gebaut.
* Im DOM messen, ob etwas ins Bild passt. Bei Zehn von Zehn war der
  Inhaltsblock 795px hoch, frei waren 670px, die Sieger-Karte reichte bis
  y 1003 bei 990px Bühne.
* Im Bild nachsehen, ob sich etwas überlagert. Die Skalen-Enden bei Schätzchen
  sassen auf derselben Höhe wie die Wert-Kästchen der oberen Wappenbahn.

Und: **Überraschung ist ein Stoppschild, kein Zufall.** Wenn eine Kaskade nicht
losläuft, ist das kein Aufnahme-Artefakt, bis das Gegenteil gemessen ist (bei
Top 5 und Fix It war es ein echter Fehler: der Wachposten wurde beim Aufräumen
nicht zurückgesetzt, React ruft Effekte im Entwicklungsmodus doppelt auf).

---

## Aufnehmen

`scripts/beamer-view.mjs` springt direkt zu einer Ansicht und knipst sie.
Ein Browser und ein Raum bedienen beliebig viele Ansichten hintereinander.

```bash
node scripts/beamer-view.mjs --liste
node scripts/beamer-view.mjs --entwurf=qq-vol-1 --kategorie=top5 --ruhe=16000 aufloesung
```

Wichtige Schalter: `--kategorie=`, `--entwurf=`, `--bild=hoch|quer`,
`--antworten=0.6`, `--ruhe=`, `--stufe=`, `--serie=`, `--sprache=`.

Fallen, die Zeit gekostet haben:

* Der Raum lebt im RAM. `rm -f backend/.qq-rooms/*.json` reicht nicht, das
  Backend muss neu starten, sonst knipst man den alten Zustand.
* Aufnahmen laufen in EINER Sprache, sonst fällt der DE/EN-Wechsel zwischen
  zwei Teilaufnahmen und im Bild steht die halbe alte Zeile neben der neuen.
* `page.screenshot()` friert Videoebenen ein. Element-Aufnahme über die
  Seitenaufnahme legen.
* Wikimedia und die Kartenkachel-Server sind aus dieser Umgebung gesperrt
  (403 über den Proxy). Schau mal braucht deshalb `--bild=`, und Pin It lässt
  sich hier nur als Überlagerung beurteilen, nicht als ganze Folie.

---

## Was noch offen ist

Stand 23.08.2026: Pause, CozyGame, Connections/Turm und die Final-Auflösung
haben den Durchgang noch nicht oder nur teilweise gesehen. Gezählt:
Pause 38 rohe Systemzeichen und 10 runde Formen, Final-Auflösung 28 rohe
Systemzeichen inklusive Medaillen und Podest-Kronen. CozyGame und Connections
sind pro Raum abschaltbar und im Testentwurf aus.
