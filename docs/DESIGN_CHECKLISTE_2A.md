# Buehne 2a — Standards und Durchgang Ansicht fuer Ansicht

Zwei Teile. Oben die Regeln, die wir im Lauf der Umstellung festgelegt haben.
Unten der Abend in seiner Reihenfolge, jede Ansicht mit Stand.

Diese Datei ist die Pruefliste. Eine Ansicht gilt erst als fertig, wenn sie
gegen ALLE zehn Regeln geprueft wurde — nicht, wenn sie „neu aussieht".

---

## Regel null, ueber allen anderen

**Ist das fuer die BUEHNE gebaut?**

Wolf 2026-08-22: „das ist wichtig fuer alle Views, ist es optimiert fuer die
Buehne, wichtige Regel fuer die ganze Implementation."

Das ist mehr als Lesbarkeit. Es heisst: ist diese Ansicht ein PROJIZIERTES
BILD oder eine Bildschirm-Oberflaeche? Die Buehne hat kein Gegenueber, das
klickt, scrollt, hovert oder in Ruhe liest. Sie hat einen Raum voller Leute
mit einem Bier in der Hand, die von der Seite draufschauen.

Woran man ein Bedien-Idiom erkennt, das dort nichts zu suchen hat:
* Reiter- und Navigationsleisten, Chips von Rand zu Rand
* zwei konkurrierende Textzonen — der Blick hat nur eine Hauptsache
* Beschriftungen, die etwas wiederholen, was gross daneben steht
* alles, was man LESEN muss, um die Position zu verstehen (Position gehoert
  gezeigt, nicht beschriftet)
* Zustaende, die nur durch eine feine Randfarbe unterschieden sind
* Elemente unter etwa 12 px Hoehe oder 26 px Schrift

Der erste Fall, an dem diese Regel angewandt wurde: die Reiterleiste in den
Regeln. Fuenf beschriftete Chips, die mit der Kartenueberschrift um den Blick
kaempften und deren aktiver Titel direkt darunter nochmal gross stand.
Ersetzt durch eine Schrittleiste am oberen Rand — dieselbe Geometrie wie die
Zeitleiste der Fragen, keine Beschriftungen, Position durch die Kante
zwischen gefuellt und leer.

---

## Die zehn Regeln

**1 · Tinte ist warm.** `#F6EFE6`, kein Weiss. Gedaempft
`rgba(246,239,230,0.62)`, kein kaltes Slate. Grund `#120F18`.

**2 · Die Ueberschrift ist immer Creme.** Die Akzentfarbe sitzt am Rand, nie
im grossen Text. Gemessen: Creme 16.6:1 gegen den Grund, Marken-Pink 5.4:1,
das dunkle Finale-Magenta 2.5:1. Die Uebergabe fordert 4.5:1.

**3 · Jede Farbe hat eine Aufgabe.**
* Kategoriefarbe → Frage- und Aufloesungs-Folien
* Teamfarbe → Brett, Rangliste, Team-Reveal
* Markenpink → nur wo keine Kategorie laeuft, und nur klein
* Gruen `#22C55E` → heisst „richtig", sonst nichts

**4 · Eine Ecke fuer alles.** Weich, im Verhaeltnis zum Element: kleine
Flaechen 16 %, grosse einen kleinen festen Radius. Keine Kreise, keine
Pillen. Ausnahme: die Teammarke auf dem HANDY bleibt rund, dort ist sie
Avatar und nicht Spielstein.

**5 · Keine schwarzen Schatten.** Auf der Projektion malt ein Schatten keine
Tiefe, sondern einen grauen Rand. Bei farbigen Scheinen gilt: ein Schein,
der etwas BEDEUTET, bleibt (Brett-Rahmen = „du bist dran", Sieger-Ring).
Einer, der nur schmueckt, geht. Innerhalb einer Deklaration: die SCHARFE
Lage bleibt, die WEICHE faellt.

**6 · Die Teammarke ist der Spielstein.** Dieselbe Kachel im Reveal, unter
der Frage, auf dem Brett und in der Rangliste. Wer sie einmal als Kreis und
einmal als Kachel zeigt, zeigt zwei Dinge statt einem.

**7 · Lesbar auf 2,8 m aus 3 bis 10 m.** Nichts unter 26 px. Kontrast auf
Text mindestens 4.5:1. Silhouette traegt, nicht Detail.

**8 · Typografie.** Frage linksbuendig. Hero in Nunito 900. Statuszeile
einzeilig, nie umbrechend. Teamnamen brechen an Wortgrenzen, nie mitten im
Wort.

**9 · Icons kommen aus dem CozyQuiz-Set.** Kein Betriebssystem-Emoji als
Marke — das sieht auf jedem Geraet anders aus. Ausnahme: die sechs
Publikums-Reaktionen laufen ueber einen eigenen Weg.

**10 · Nie eine Scrollbar.** Buehne ist fix 1760 x 990.

---

## Der Abend, Ansicht fuer Ansicht

Legende: **fertig** = gegen alle zehn geprueft · **teilweise** = umgestellt,
aber nicht vollstaendig geprueft · **offen** = nicht angefasst ·
**ungesehen** = noch nie im Bild gehabt

| # | Ansicht | Stand | offen |
|---|---|---|---|
| 1 | Setup / Wizard (Steuerpult) | offen | keine Buehne, eigene Regeln |
| 2 | Lobby | teilweise | Karte, Wasserzeichen, QR-Block |
| 3 | Regeln | teilweise | Karte fast unsichtbar, Pillen, Symbol-Unterlagen |
| 4 | Team-Reveal „Heute spielen" | teilweise | Kachel statt Disc gesetzt, Karte + Schein offen |
| 5 | Runden-Intro | teilweise | Ueberschrift Creme, Tree-Punkte offen |
| 6 | Frage: Mu-Cho | fertig | |
| 7 | Frage: Schaetzchen | teilweise | Aufloesung entschaerft, Layout ungeprueft |
| 8 | Frage: 10 von 10 | teilweise | Optionen tragen Kategoriefarbe |
| 9 | Frage: Schau mal | teilweise | links + Schein weg, Bildrahmen offen |
| 10 | Bunte Tuete: Heisse Kartoffel | offen | |
| 11 | Bunte Tuete: Top 5 | teilweise | nur Schatten |
| 12 | Bunte Tuete: Fix It | teilweise | nur Schatten |
| 13 | Bunte Tuete: Pin It | teilweise | nur Schatten, Kartenpins bleiben |
| 14 | Brett / Setzen | fertig | |
| 15 | Pause | ungesehen bis heute | Bild liegt vor, Pruefung offen |
| 16 | Final-Betting | ungesehen | |
| 17 | Final-Reveal | ungesehen | |
| 18 | Connections / Turm-Finale | ungesehen | |
| 19 | Siegerehrung | ungesehen | |
| 20 | Danke | ungesehen | Wortmarke bleibt pink, Rest offen |
| 21 | Summary (nach dem Abend) | offen | |
| 22 | Handy `/team` | teilweise | Kategorie-Grund + Mu-Cho-Optionen |

### Warum „ungesehen" wichtig ist

Sechs Ansichten waren bis 2026-08-22 noch NIE im Bild geprueft. Ein normaler
Testlauf endet beim Setzen. Dafuer gibt es jetzt `scripts/beamer-phase.mjs`:
Fragedauer auf wenige Sekunden, dann einmal durchspielen und jede Phase
knipsen, die noch fehlt.

---

## Zum Schluss: 2a als echtes Skin fuehren

Wolf 2026-08-22: „das jetzige design set dann als standard neben den anderen
fuehren, ist das moeglich?"

**Ja, und es ist das richtige Ende der Umstellung.** Heute ist 2a KEIN Skin,
sondern eine Aenderung am Default plus ein Buehnen-Scope
(`[data-qq-stage='2a']`). Alle anderen Looks — Studio Mono, Soft Pop,
Neo-Brutalism, Kolosseum — sind ordentliche Skins.

Genau diese Sonderrolle des Defaults ist die Ursache fast aller Reibung in
dieser Umstellung. `isThemed()` ist definiert als „nicht Cozy", und daran
haengen **345 Verzweigungen** im Frontend, davon 240 auf der Buehne. Jede
sieht so aus:

```
color: isThemed() ? 'var(--qq-text)' : '#f8fafc'
```

Der Token-Pfad ist also laengst gebaut — Cozy nimmt ihn nur nie. Deshalb
musste in dieser Session jeder Wert einzeln von Hand angefasst werden.

**Wird 2a ein Skin, kollabiert jede dieser 345 Zeilen auf den Token.** Das
ist kein Schoenheitsgewinn, das ist der Unterschied zwischen „Farbe aendern
heisst 150 Stellen suchen" und „Farbe aendern heisst eine Zeile".

### Warum zuletzt und nicht jetzt

Solange das Design noch entschieden wird, sind die Werte in Bewegung. Ein
Skin will einen VOLLSTAENDIGEN Token-Satz; jeder fehlende Token faellt beim
Umlegen still auf einen Default zurueck und sieht falsch aus. Umgekehrt ist
die Umstellung mechanisch und risikoarm, sobald die Werte stehen.

### Vorschlag fuer den Umbau

1. `BUEHNE_2A: ResolvedTheme` in `qqTheme.ts` registrieren, Werte aus dem
   heutigen `[data-qq-stage='2a']`-Block plus den warmen `:root`-Werten.
2. `isCozyLook()` so lassen — der alte Cozy-Look bleibt damit als eigener
   Eintrag waehlbar und ist die Rueckfalltuer fuer die ersten Abende.
3. 2a als Default setzen.
4. Die 345 Verzweigungen einsammeln: was jetzt beide Zweige gleich faehrt,
   wird zur einzelnen Zeile.

Schritt 4 ist der grosse, aber er ist erst NACH 1 bis 3 ueberhaupt sicher
pruefbar — vorher aendert er das Bild.

### Was zuerst

Nach Nutzen pro Aufwand: erst die Ansichten, die JEDER Abend zeigt (Lobby,
Regeln, Team-Reveal, Runden-Intro, Brett, Siegerehrung, Danke), dann die
Fragetypen, dann die selteneren Finalformen, zuletzt Arena und Summary.
