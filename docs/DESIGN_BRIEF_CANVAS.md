# Design-Brief: CozyQuiz Beamer-Buehne

> Fuer Claude Design oder jedes andere Werkzeug. **Selbsttragend**: setzt kein
> Wissen ueber das Repo, den bisherigen Chat oder die Codebasis voraus.
> Stand 2026-08-22.

---

## 1. Was gestaltet wird

Ein **Live-Quiz fuer Bars und Firmenfeiern**. Drei Bildschirme laufen parallel:

* **Die Buehne** (`/beamer`) — per Beamer an die Wand geworfen. **Das wird hier
  gestaltet.**
* **Das Handy** der Teams — dort wird getippt. Aufbau steht bereits, wird
  spaeter nur in Einzelheiten nachgezogen.
* **Der Laptop** des Moderators — Steuerpult, nicht Teil dieses Briefs.

Ein Abend dauert rund zwei Stunden, hat **zwanzig Fragen in fuenf Runden** und
bis zu **acht Teams**.

---

## 2. Format und Betrachtungssituation

| | |
|---|---|
| Flaeche | **1760 x 990 Pixel**, fix. **Niemals eine Scrollbar.** |
| Projektion | rund 2,8 Meter Bildbreite |
| Abstand | Publikum sitzt 3 bis 10 Meter entfernt |
| Licht im Raum | dunkel bis halbdunkel, Bar am Abend |
| Bedienung | **keine.** Auf der Wand wird nichts angetippt |

**Wer das nicht mitdenkt, entwirft am Problem vorbei.** Die haeufigsten Fehler
sind: zu kleine Schrift, zu helle Flaechen, Haarlinien, die aus zehn Metern
verschwinden.

---

## 3. Die vier harten Randbedingungen

**1. Helle Flaechen blenden koerperlich.** Gemessen an mittlerer Leuchtdichte
des Bildes: unter 12 Prozent ist unauffaellig, ueber 22 Prozent blendet. Ein
weisses Band unten am Bild lag bei 31.6 Prozent. Dasselbe Band in einer
Kategoriefarbe lag bei 11.9 Prozent, **bei gleicher Lesbarkeit**.
→ Grosse Flaechen sind erlaubt, sie duerfen nur nicht **weiss** sein.

**2. Aus zehn Metern loest das Auge nur grob auf.** Faustregel: rund drei
Design-Pixel fallen auf eine gerade noch unterscheidbare Stufe. Was auf einem
auf 566 Pixel Breite verkleinerten und wieder weichgezeichneten Bild
verschwindet, ist im Raum nicht da.
→ Entscheidend sind **die Antworten**, nicht die Frage. Die Frage ist ueberall
gross, leise werden Entwuerfe bei den Antworten.

**3. Zwanzig Wiederholungen pro Abend.** Ein Effekt, der beim ersten Mal
grossartig ist, ist beim zwanzigsten anstrengend.
→ **Je haeufiger ein Element auftritt, desto leiser gehoert es gesetzt.**

**4. Keine Animationsbibliothek.** Umgesetzt wird alles in reinen CSS-Keyframes.
Kein GSAP, kein Framer Motion, kein Lottie.

---

## 4. Welche Bildschirme gebraucht werden

Reihenfolge eines Abends. Jeder Punkt ist ein eigenes Artboard.

1. **Willkommen** — bevor jemand da ist. PIN, QR-Code, Einladung.
2. **Lobby** — Teams treten nach und nach bei. Drei Zustaende: leer, fuellt sich,
   voll. Laeuft am laengsten, oft **fuenfzehn Minuten**.
3. **Regelseite** — vier Seiten, hier reicht eine als Beispiel.
4. **Runden-Intro** — welche Kategorie kommt.
5. **Frage aktiv** — je Kategorie eigene Mechanik, siehe Abschnitt 5.
6. **Aufloesung** — was war richtig, wer lag richtig.
7. **Zwischenstand** — Rangliste der acht Teams.
8. **Finale und Dank**.

---

## 5. Die fuenf Kategorien sind MECHANIKEN, nicht Themen

Das bestimmt das Layout. Wer sie als Themen behandelt, gestaltet Deko.

| Kategorie | Regel | Bild, das daraus folgt |
|---|---|---|
| **Mu-Cho** | vier Antwortoptionen | vier Zeilen oder Felder, A bis D |
| **10 von 10** | **drei** Optionen, Teams **setzen** darauf | ein Setztisch: drei Felder, Marken der Teams darunter |
| **Schaetzchen** | eine Zahl mit Einheit, naechste gewinnt | eine Zahlenachse, alle Schaetzungen darauf, die wahre Zahl als Linie |
| **Bunte Tuete** | sechs verschiedene Unterspiele | ein **Rahmen**, in den jedes Unterspiel passt, plus eine Marke mit dem Namen des Unterspiels |
| **Schau mal** | ein Bild | das Bild bekommt die Flaeche, Text tritt zurueck |

Aktive Unterspiele der Bunten Tuete: Heisse Kartoffel, Top 5, Umfrage,
Schwarmintelligenz, Fix It, Pin It.

---

## 6. Was bereits entschieden ist

* **Die Schrift fuehrt.** Kein Dekor. Aus zehn getesteten Richtungen waren die
  beiden Favoriten zweimal dasselbe Prinzip, einmal leise (Swiss), einmal laut
  (Plakat).
* **Drittel-Regel:** oberes Drittel Frage, unteres Drittel Mechanik, Mitte Luft.
  Ausnahme, wenn die Mechanik es erzwingt (Bild, Karte).
* **Team-Marken sind eckig**, Kachel mit rund 5 Pixel Radius. **Kein Kreis** —
  der Kreis ist die weiche App-Form und war der Grund, warum das alte Set nach
  Handyspiel aussah. Ausnahme: **Wimpel mit Spitze**, wo eine Marke auf einen
  Wert zeigt (Zahlenachse, Karte). Ein Kreis sitzt ueber einem Wert, aber er
  zeigt auf nichts Genaues.
* **In der Lobby gibt es keine Hausfarbe.** Grund und Schrift sind neutral, die
  einzigen Farben sind die acht Teams. So ist jedes Beitreten ein Ereignis.
* **A, B, C, D immer in derselben Lesereihenfolge.** Alles andere darf wandern,
  weil auf dem Handy getippt wird und die Wand nur Anzeige ist.

**Die acht Teamfarben** (fest, sie tragen die Team-Identitaet):
`#F97316` `#22C55E` `#14B8A6` `#A855F7` `#FACC15` `#3B82F6` `#EC4899` `#EF4444`

**Nicht gesetzt und frei entscheidbar:** Grundfarbe, Kategoriefarben, Akzent,
Schriftwahl. Die bisherige Marke (Pink `#EC4899`, Navy, ein Wolf-Maskottchen)
soll bewusst **nicht** mehr den Look bestimmen.

---

## 7. Bewegung: die Lautstaerke-Treppe

Vier Referenzen wurden Bild fuer Bild ausgewertet. Alle vier tragen dasselbe
Prinzip: **etwas bleibt stehen, waehrend sich der Rest aendert.** Ohne diesen
Anker wird jeder Effekt wieder zur Diashow.

| Anlass | pro Abend | Uebergang | Dauer |
|---|---|---|---|
| Frage zu Frage | ~20 | **Grundblende**: die Flaeche wechselt die Farbe, der Inhalt laeuft weiter | 0,4 bis 0,5 s |
| Frage zu Aufloesung | ~20 | **Bogen-Wisch**: ein Band mit gebogener Vorderkante faehrt durch, dahinter steht das Neue | 0,4 bis 0,5 s |
| Rundenwechsel | ~5 | **Durchskalieren**: das Alte waechst weit ueber den Rand und faerbt sich zum Grund hin, loest sich also darin auf | ~1 s |
| Kategorie-Intro | ~5 | **Kreisbahn**: Inhalt wandert um einen festen Anker, halbe Umdrehung | ~1 s |

**Wichtig fuer statische Entwuerfe:** es darf **nie ein leeres Bild** entstehen.
Der heutige Zustand hat bis zu 250ms Schwarz zwischen Frage und Aufloesung, und
genau das laesst es nach PowerPoint aussehen.

---

## 8. Was fuenf gute Referenzen uebereinstimmend sagen

Ausgewertet wurden Structured, Duolingo, Discord, Apple und Hungry Tiger.

1. **Eine eigene Akzentfarbe, alles andere neutral.** Fuenf von fuenf.
2. **Display-Schrift traegt die Marke, Fliesstext bleibt klein und ruhig.**
   Fuenf von fuenf. Typisch: Fliesstext 15 bis 17px, Display 56 bis 374px.
3. **Flach. Keine Schatten, keine Verlaeufe.** Fuenf von fuenf.
4. **Laufweite wird enger, je groesser der Grad**, Zeilenabstand staucht sich
   (bis 0.84), damit Ueberschriften „gemeisselt statt gesetzt" wirken.
5. **Tiefe kommt aus einer Flaechenleiter mit drei Stufen**, nicht aus Elevation.
6. **Abschnitts-Identitaet ueber die Flaechenfarbe**, nicht ueber den
   Seitenhintergrund (Discord). Gemessen kosten beide Wege gleich viel Licht,
   die Wahl ist gestalterisch.

---

## 9. Gestaltungsmittel, die noch NICHT ausprobiert wurden

Das ist der Auftrag fuer die naechste Runde. Bisherige Entwuerfe sahen sich zu
aehnlich, weil sie alle dasselbe Skelett benutzt haben (Label links oben, Zeit
rechts oben, Frage links, Antworten als Zeile unten) und weil zu wenige
Schriften zur Verfuegung standen.

* **Schrift groesser als das Bild**, an den Raendern beschnitten. Structured
  faehrt 374px auf einer Seite; bisher waren es maximal 178px.
* **Etwas, das aus dem Rahmen bricht** und ueber eine Kante hinausragt.
* **Verlaufsflaechen** statt flacher Farbe.
* **Eine Farbe, die eine Bedeutung traegt** statt nur eine Identitaet. Bei einem
  Quiz liegt „richtig" nahe.
* **Aufkleber-Sprache**: dicke Konturen, Pillenformen.
* **Ein Bild als Inhalt**, nicht nur als Textur.
* **Wasserzeichen-Ebene**, die erst sichtbar wird, wenn das Auge sich setzt.
  Ideal fuer die Lobby, die fuenfzehn Minuten laeuft.
* **Eine einzige Schrift fuer alles** als Signatur, statt zwei zu mischen.
* **Gepunktete Linien** als Rhythmus statt durchgezogener.
* **Sequenzmittel**: harte Wechsel zwischen hell und dunkel ueber
  aufeinanderfolgende Bildschirme. Wirkt nur in der Folge, nicht im Einzelbild.

---

## 10. Anhaltspunkte, die gemessen funktioniert haben

Keine Vorschrift, aber belastbare Startwerte.

| Element | Wert |
|---|---|
| Frage | 82 bis 132px, fett, Laufweite -0.03em, Zeilenabstand 0.94 bis 1.06 |
| Antworttext | 40 bis 92px |
| Kategorie- und Statuszeile | 13px, Laufweite 0.26em, Grossbuchstaben |
| Zeitanzeige | 62 bis 96px |
| Seitenrand | 112px links und rechts |
| Team-Marke auf der Buehne | 44 bis 66px Kantenlaenge, Radius 5px |
| Kontrast Antworttext zu Grund | mindestens 4.5:1, gemessen nach der Distanz-Simulation |
| Mittlere Leuchtdichte des Bildes | unter 12 Prozent |

---

## 11. Was ausdruecklich nicht erwuenscht ist

* **Weisse oder sehr helle Vollflaechen** als Grund. Blendet im dunklen Raum.
* **Haarlinien in geringem Kontrast.** Aus zehn Metern unsichtbar.
* **Kreise als Team-Marken.**
* **Glanz, Schlagschatten, Glaseffekte.** Alle fuenf Referenzen sagen flach, und
  auf Projektionsdistanz verliert Weichzeichnung ohnehin ihre Wirkung.
* **Gedrehte Schrift fuer Inhalte.** Nur fuer Rahmen und Zierelemente; Frage und
  Antworten stehen immer gerade.
* **Kindliche Bildsprache.** Grosse Glanzaugen, rosa Wangen, Bonbonfarben. Das
  Publikum sind Erwachsene bei einem Bier.
* **Ein zweiter Schauplatz auf dem Handy.** Die Dramaturgie gehoert an die Wand.

---

## 12. Beispielinhalte zum Fuellen der Artboards

**Frage (Mu-Cho):** „Welche Stadt ist die Hauptstadt von Australien?"
A Sydney · B Melbourne · **C Canberra** · D Perth

**Frage (Schaetzchen):** „Wie hoch ist der Eiffelturm?" Angabe in Metern.
Wahrheit 330. Schaetzungen: 90, 190, 280, 310, 360, 440, 620, 820.

**Frage (10 von 10):** „In welchem Jahr wurde das Fahrrad erfunden?"
1 · 1817 — 2 · **1867** — 3 · 1885

**Teams:** Die Umarmer, Panda Power, Die Wale, Durstige Drachen, Feierabend,
Die Garnelen, Elchtest, Schnelle Katzen

**Zeit:** 18 Sekunden · **Stand:** Frage 07 von 20 · **PIN:** 4827
